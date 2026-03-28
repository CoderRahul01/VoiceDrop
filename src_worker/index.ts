interface Ai {
  run(model: string, options: Record<string, unknown>): Promise<unknown>;
}

interface Env {
  AI: Ai;
  ELEVENLABS_API_KEY: string;
}

interface Turn {
  speaker: 'A' | 'B';
  text: string;
}

interface GenerateBody {
  url: string;
  voiceA: string;
  voiceB: string;
  tone: string;
}

// ElevenLabs free-tier voice IDs
const VOICE_IDS: Record<string, string> = {
  'Sarah (Tech)': 'EXAVITQu4vr4xnSDxMaL',
  'David (Deep)': 'onwK4e9ZLuTAKqWW03F9',
  'Marcus (Hype)': 'pNInz6obpgDQGcFmaJgB',
  'James (Analyst)': 'TX3LPaxmHKxFdv7VOQHJ',
  'Elena (Skeptic)': 'ThT5KcBeYPX3keUQqHPh',
  'Riley (Casual)': 'jBpfuIE2acCO8z3wKNLl',
};

const DEFAULT_VOICE_A = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const DEFAULT_VOICE_B = 'TX3LPaxmHKxFdv7VOQHJ'; // Liam

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function stripHtml(html: string): string {
  // Remove script/style blocks first, then all tags
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Process in chunks to avoid call stack limits
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    out.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return out.buffer;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (request.method === 'POST' && url.pathname === '/api/generate') {
      return handleGenerate(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

export default worker;

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as GenerateBody;
    const { url: articleUrl, voiceA, voiceB, tone } = body;

    if (!articleUrl || !articleUrl.startsWith('http')) {
      return Response.json({ error: 'Invalid URL' }, { status: 400, headers: CORS });
    }

    // 1. Fetch article
    const articleRes = await fetch(articleUrl, {
      headers: { 'User-Agent': 'VoiceDrop/1.0 (podcast-generator)' },
      redirect: 'follow',
    });
    if (!articleRes.ok) {
      throw new Error(`Could not fetch article: HTTP ${articleRes.status}`);
    }
    const html = await articleRes.text();
    const articleText = stripHtml(html).slice(0, 3000);

    // Extract title and source for display
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : 'Podcast Episode';
    const title = rawTitle.replace(/\s*[|\-–]\s*.+$/, '').trim();
    const source = new URL(articleUrl).hostname.replace('www.', '');

    // 2. Workers AI → podcast dialogue JSON
    const aiPrompt = `You are a podcast scriptwriter. Write a ${tone} podcast dialogue between Host A and Host B about this article.

Rules:
- Output ONLY a valid JSON array, no markdown, no explanation, nothing else
- Exactly 8 turns alternating A and B (start with A)
- Each turn is 1-3 sentences, natural spoken language
- Be specific: mention actual facts, names, numbers from the article
- Format: [{"speaker":"A","text":"..."},{"speaker":"B","text":"..."},...]

Article: ${articleText}`;

    const aiResult = (await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: aiPrompt,
      max_tokens: 1200,
    })) as { response: string };

    const rawAiText = aiResult.response.trim();
    const jsonMatch = rawAiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON dialogue');
    }
    const turns: Turn[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(turns) || turns.length === 0) {
      throw new Error('AI returned empty dialogue');
    }

    // 3. ElevenLabs TTS per turn
    const voiceAId = VOICE_IDS[voiceA] ?? DEFAULT_VOICE_A;
    const voiceBId = VOICE_IDS[voiceB] ?? DEFAULT_VOICE_B;
    const audioBuffers: ArrayBuffer[] = [];

    for (const turn of turns) {
      const voiceId = turn.speaker === 'A' ? voiceAId : voiceBId;
      const ttsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: turn.text,
            model_id: 'eleven_turbo_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        throw new Error(`ElevenLabs error ${ttsRes.status}: ${errText}`);
      }
      audioBuffers.push(await ttsRes.arrayBuffer());
    }

    // 4. Stitch all MP3 buffers
    const stitched = concatBuffers(audioBuffers);
    const audioBase64 = arrayBufferToBase64(stitched);

    // Estimate duration (rough: ~128kbps MP3 = 16KB/s)
    const estimatedSeconds = stitched.byteLength / 16000;
    const duration = formatDuration(estimatedSeconds);

    return Response.json(
      { audio: audioBase64, transcript: turns, title, source, duration },
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[VoiceDrop]', message);
    return Response.json({ error: message }, { status: 500, headers: CORS });
  }
}
