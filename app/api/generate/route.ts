import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { PLAN_LIMITS, PLAN_MAX_DURATION, PLAN_VOICES, type PlanId } from '@/lib/plans';

/**
 * Resolve the user's effective plan.
 * Priority: Clerk Billing subscription > coupon grant (publicMetadata.couponPlan) > free.
 */
function resolvePlan(
  has: (params: { plan: string }) => boolean,
  couponPlan?: string
): PlanId {
  if (has({ plan: 'enterprise' }) || couponPlan === 'enterprise') return 'enterprise';
  if (has({ plan: 'pro' })        || couponPlan === 'pro')        return 'pro';
  if (has({ plan: 'starter' })    || couponPlan === 'starter')    return 'starter';
  return 'free';
}

// Increase function timeout for longer podcasts (up to 3 min = ~16 turns × ~3s = ~48s)
export const maxDuration = 120;

interface Turn {
  speaker: 'A' | 'B';
  text: string;
}

interface GenerateBody {
  url: string;
  voiceA: string;
  voiceB: string;
  tone: string;
  language?: string;  // 'English' | 'Hinglish' — default 'English'
  duration?: number;  // 1 | 2 | 3 (minutes) — default 1
}

/** Number of dialogue turns per requested duration */
const TURNS_FOR_DURATION: Record<number, number> = { 1: 6, 2: 10, 3: 16 };

/** Expanded tone instructions for richer prompting */
const TONE_PROMPT: Record<string, string> = {
  Professional:
    'a sharp executive briefing between two analysts. Host A focuses on data, evidence, and specific facts from the article. Host B draws out the strategic implications and broader impact. Reference exact numbers, quotes, or findings from the article. No filler phrases. Speak naturally but with discipline — like a tightly produced CEO podcast. Make each host sound distinct: Host A is analytical and precise, Host B is strategic and forward-looking.',

  Conversational:
    'two engaged friends reacting to something they both just read. They reference each other\'s points — "wait, but what you said about X..." — express genuine surprise at surprising facts, push back gently, and bring their own perspective. Include one moment where something from the article actually catches them off-guard. Deeply tied to the article\'s specific content. Each host sounds like a real person: Host A is curious and optimistic, Host B is a bit more skeptical and questioning.',

  Debate:
    'a structured live intellectual debate. Host A builds a clear case FOR the article\'s main argument, citing its specific evidence and data. Host B challenges each claim with direct counterpoints — alternative interpretations, what the article overlooked, or flaws in the reasoning. They address each other directly: "Your point about X ignores the fact that..." It should feel like a real sparring match, not two separate monologues. Host A is persuasive and confident; Host B is incisive and critical.',

  Summary:
    'a crisp, no-filler briefing covering only the 3-5 most important insights from the article. Each dialogue turn is one standalone insight — punchy, clear, and immediately useful. No intro, no opinions, no padding. Just the essential value a busy reader needs, delivered in natural spoken form. Host A surfaces the insights; Host B adds a one-sentence "so what" for each.',
};

const VOICE_IDS: Record<string, string> = {
  'Sarah (Tech)': 'EXAVITQu4vr4xnSDxMaL',
  'David (Deep)': 'onwK4e9ZLuTAKqWW03F9',
  'Marcus (Hype)': 'pNInz6obpgDQGcFmaJgB',
  'James (Analyst)': 'TX3LPaxmHKxFdv7VOQHJ',
  'Elena (Skeptic)': 'ThT5KcBeYPX3keUQqHPh',
  'Riley (Casual)': 'jBpfuIE2acCO8z3wKNLl',
};

/**
 * Dedicated voices for the Conversational tone — chosen per language.
 * English: Anya (A) + Andrew (B)   |   Hinglish: Akshita (A) + Vidya (B)
 * These are ElevenLabs free-tier compatible voice IDs.
 */
const CONVERSATIONAL_VOICE_IDS: Record<string, { a: string; b: string }> = {
  English:  { a: 'd3MFdIuCfbAIwiu7jC4a', b: 'zSiMZcCo0oBh047sunsX' }, // Anya, Andrew
  Hinglish: { a: '9SsFrOutdZkCkU5hIoQm', b: 'ulZgFXalzbrnPUGQGs0S' }, // Akshita, Vidya
};

const DEFAULT_VOICE_A = 'EXAVITQu4vr4xnSDxMaL';
const DEFAULT_VOICE_B = 'TX3LPaxmHKxFdv7VOQHJ';

function stripHtml(html: string): string {
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

/**
 * Repairs a JSON array that was truncated mid-stream (missing closing `]`).
 * Finds the last complete object `}` and closes the array after it.
 */
function repairTruncatedJsonArray(raw: string): string {
  let s = raw.trimEnd();
  // Strip trailing comma after last complete object
  if (s.endsWith(',')) s = s.slice(0, -1).trimEnd();
  const lastClose = s.lastIndexOf('}');
  if (lastClose !== -1) {
    return s.slice(0, lastClose + 1) + '\n]';
  }
  return '[]';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isLibraryVoiceRestriction(errorText: string): boolean {
  return errorText.includes('"code":"paid_plan_required"')
    || errorText.includes('"type":"payment_required"')
    || errorText.toLowerCase().includes('free users cannot use library voices');
}

async function synthesizeTurnAudio(
  elevenLabsApiKey: string,
  text: string,
  preferredVoiceId: string,
  fallbackVoiceId: string
): Promise<ArrayBuffer> {
  const synthesize = async (voiceId: string) =>
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        output_format: 'mp3_44100_128',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.80,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    });

  let ttsRes = await synthesize(preferredVoiceId);
  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    if (preferredVoiceId !== fallbackVoiceId && isLibraryVoiceRestriction(errText)) {
      console.warn(`[VoiceDrop] Voice ${preferredVoiceId} is not allowed for this ElevenLabs key. Falling back to ${fallbackVoiceId}.`);
      ttsRes = await synthesize(fallbackVoiceId);
      if (!ttsRes.ok) {
        const fallbackErrText = await ttsRes.text();
        throw new Error(
          `ElevenLabs rejected both the selected voice and the default fallback. Check the server ELEVENLABS_API_KEY subscription or switch to non-library voices. Details: ${fallbackErrText}`
        );
      }
      return ttsRes.arrayBuffer();
    }
    throw new Error(`ElevenLabs TTS error: ${errText}`);
  }

  return ttsRes.arrayBuffer();
}

export async function POST(req: NextRequest) {
  try {
    // 0a. Require authentication + resolve billing plan in one call
    const { userId, has } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in to generate podcasts.', requiresAuth: true },
        { status: 401 }
      );
    }

    // 0b. Load user + resolve effective plan (subscription OR coupon grant)
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const couponPlan = user.publicMetadata?.couponPlan as string | undefined;
    const plan = resolvePlan(has, couponPlan);
    const limit = PLAN_LIMITS[plan];

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const storedMonth = user.privateMetadata?.usageMonth as string | undefined;
    const usageCount: number =
      storedMonth === currentMonth
        ? ((user.privateMetadata?.usageCount as number) ?? 0)
        : 0;

    if (usageCount >= limit) {
      return NextResponse.json(
        {
          error: `You've used all ${limit} podcasts on your ${plan} plan this month. Upgrade to keep going.`,
          limitReached: true,
          usageCount,
          limit,
          plan,
        },
        { status: 429 }
      );
    }

    // 0c. Validate Environment
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!cfAccountId || !cfApiToken || !elevenLabsApiKey) {
      console.error('[VoiceDrop] Missing environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = (await req.json()) as GenerateBody;
    const { url: articleUrl, tone } = body;
    const language = body.language ?? 'English';
    const requestedDuration = typeof body.duration === 'number' ? body.duration : 1;

    // Enforce duration per plan (free=1min, starter=2min, pro/enterprise=3min)
    const maxAllowedDuration = PLAN_MAX_DURATION[plan] ?? 1;
    const effectiveDuration = Math.min(requestedDuration, maxAllowedDuration);
    const turnCount = TURNS_FOR_DURATION[effectiveDuration] ?? 6;

    // Enforce allowed voices for the user's plan (prevents client-side bypass)
    const allowedVoices = PLAN_VOICES[plan] ?? PLAN_VOICES.free;
    const voiceA = allowedVoices.a.includes(body.voiceA) ? body.voiceA : allowedVoices.a[0];
    const voiceB = allowedVoices.b.includes(body.voiceB) ? body.voiceB : allowedVoices.b[0];

    // Strict URL Validation
    try {
      new URL(articleUrl);
    } catch {
      return NextResponse.json({ error: 'Please provide a valid URL (e.g., https://example.com)' }, { status: 400 });
    }

    if (!articleUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Please provide a valid HTTP/HTTPS URL' }, { status: 400 });
    }

    // 1. Fetch article
    console.log(`[VoiceDrop] Fetching article: ${articleUrl}`);
    let articleRes;
    try {
      articleRes = await fetch(articleUrl, {
        headers: { 'User-Agent': 'VoiceDrop/1.0 (podcast-generator)' },
      });
    } catch (fetchErr) {
      console.error('[VoiceDrop] Fetch Error:', fetchErr);
      return NextResponse.json({ error: 'Failed to access the article URL. Please check the URL and try again.' }, { status: 400 });
    }
    
    if (!articleRes.ok) {
      return NextResponse.json({ error: `Could not fetch article (HTTP ${articleRes.status})` }, { status: 400 });
    }
    const html = await articleRes.text();
    const articleText = stripHtml(html).slice(0, 3000);

    if (articleText.length < 100) {
      return NextResponse.json({ error: 'The article content seems too short or restricted.' }, { status: 400 });
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : 'Podcast Episode';
    const title = rawTitle.replace(/\s*[|\-–]\s*.+$/, '').trim();
    const source = new URL(articleUrl).hostname.replace('www.', '');

    const cfBase = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run`;
    const cfHeaders = { Authorization: `Bearer ${cfApiToken}`, 'Content-Type': 'application/json' };

    // 2a. CF Workers AI — Step 1: Extract key facts for richer dialogue (fast, small model)
    console.log(`[VoiceDrop] Extracting key facts with Workers AI...`);
    let keyFacts = '';
    try {
      const factsRes = await fetch(`${cfBase}/@cf/meta/llama-3.1-8b-instruct`, {
        method: 'POST', headers: cfHeaders,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a JSON API. Output ONLY a raw JSON array of strings. No markdown, no explanation.' },
            { role: 'user', content: `Extract the 5 most important facts, statistics, or quotes from this article as a JSON array of strings.\nArticle: ${articleText.slice(0, 2000)}` },
          ],
          max_tokens: 400,
        }),
      });
      if (factsRes.ok) {
        const factsData = await factsRes.json();
        const rawFacts: string = (factsData.result?.response ?? '').trim();
        const factsStart = rawFacts.indexOf('[');
        if (factsStart !== -1) {
          try {
            const parsed = JSON.parse(rawFacts.slice(factsStart, rawFacts.lastIndexOf(']') + 1));
            if (Array.isArray(parsed)) keyFacts = parsed.slice(0, 5).join(' | ');
          } catch { /* use empty keyFacts */ }
        }
      }
    } catch { /* non-blocking — proceed without facts */ }

    // 2b. CF Workers AI — Step 2: Generate the full dialogue
    console.log(`[VoiceDrop] Generating dialogue with Workers AI (${turnCount} turns, ${language})...`);

    const toneInstruction = TONE_PROMPT[tone] ?? `${tone} in style`;
    const isHinglish = language === 'Hinglish';
    const languageInstruction = isHinglish
      ? `Write in natural Hinglish — the casual code-switching style that urban Indians use on podcasts and YouTube. Keep it 80-85% English with a natural sprinkling of Hindi expressions: yaar, bhai, matlab, seedha baat, accha, bilkul, ekdum, arre, sahi mein, etc. Do NOT use Devanagari script. Do NOT translate English sentences into Hindi. Do NOT write full Hindi. Just speak like a sharp IIT or startup professional would on a casual call — predominantly English with natural Hindi flavour that any Indian urban audience would instantly recognise and enjoy.`
      : `Write in clear, natural, globally accessible English. No jargon, no filler — language that anyone anywhere can follow easily.`;
    const indianExampleInstruction =
      tone === 'Conversational'
        ? `Include at least one relatable everyday analogy — something familiar to urban Indian professionals, such as ordering on Swiggy, an IPL match moment, a WhatsApp group situation, or a Mumbai/Bangalore commute.`
        : '';
    const factsContext = keyFacts ? `Key facts to reference: ${keyFacts}\n` : '';

    const aiRes = await fetch(`${cfBase}/@cf/meta/llama-3.1-8b-instruct`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content:
                'You are a JSON API. You output ONLY raw valid JSON — no markdown, no code fences, no explanation, no preamble. Every response must be a JSON array and nothing else.',
            },
            {
              role: 'user',
              content: `Write a podcast dialogue styled as ${toneInstruction}

${languageInstruction}
${indianExampleInstruction}
${factsContext}
Rules:
- Output a JSON array of exactly ${turnCount} objects, strictly alternating A then B then A... starting with A.
- Each object: {"speaker":"A","text":"..."} or {"speaker":"B","text":"..."}
- Each "text" = 1–3 natural spoken sentences. Reference specific facts, quotes, or data from the article — never be generic.
- Hosts must react to each other, not deliver independent monologues. Use phrases like "right, and what's interesting about that is...", "but hold on...", "exactly — and that connects to..."
- Do NOT start every turn with the other host's name.
- Output ONLY the JSON array — no markdown, no explanation, nothing else.

Article: ${articleText}`,
            },
          ],
          max_tokens: Math.min(200 * turnCount, 4096),
        }),
      });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.error('[VoiceDrop] Cloudflare AI Error:', err);
      return NextResponse.json(
        { error: 'AI synthesis failed. This might be due to service limits. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    const aiData = await aiRes.json();
    const rawAiText: string = (aiData.result?.response ?? '').trim();
    if (!rawAiText) {
      throw new Error('AI returned an empty response');
    }

    // Robust JSON extraction: strip markdown fences then locate the array
    const cleaned = rawAiText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const jsonStart = cleaned.indexOf('[');
    if (jsonStart === -1) {
      console.error('[VoiceDrop] No JSON array found in AI response:', rawAiText);
      throw new Error('AI dialogue synthesis returned invalid data format. Please try again.');
    }

    const partial = cleaned.slice(jsonStart);
    const jsonEnd = partial.lastIndexOf(']');

    // If the closing bracket is missing the response was truncated — repair it
    const jsonString = jsonEnd === -1 ? repairTruncatedJsonArray(partial) : partial.slice(0, jsonEnd + 1);

    let turns: Turn[];
    try {
      turns = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error('[VoiceDrop] JSON Parse Error:', parseErr, '\nRaw:', rawAiText);
      throw new Error('Failed to parse AI-generated dialogue. Please try again.');
    }

    if (!Array.isArray(turns) || turns.length === 0) {
      throw new Error('AI returned an empty dialogue. Please try again.');
    }

    // 3. ElevenLabs TTS per turn
    console.log(`[VoiceDrop] Generating audio with ElevenLabs...`);
    // Conversational tone uses dedicated language-matched voices
    const convVoices = tone === 'Conversational'
      ? (CONVERSATIONAL_VOICE_IDS[language] ?? CONVERSATIONAL_VOICE_IDS.English)
      : null;
    const voiceAId = convVoices?.a ?? VOICE_IDS[voiceA] ?? DEFAULT_VOICE_A;
    const voiceBId = convVoices?.b ?? VOICE_IDS[voiceB] ?? DEFAULT_VOICE_B;
    const audioBuffers: ArrayBuffer[] = [];

    for (const turn of turns) {
      const preferredVoiceId = turn.speaker === 'A' ? voiceAId : voiceBId;
      const fallbackVoiceId = turn.speaker === 'A' ? DEFAULT_VOICE_A : DEFAULT_VOICE_B;
      audioBuffers.push(
        await synthesizeTurnAudio(
          elevenLabsApiKey,
          turn.text,
          preferredVoiceId,
          fallbackVoiceId
        )
      );
    }

    // 4. Stitch Mp3s
    const stitched = concatBuffers(audioBuffers);
    const audioBase64 = Buffer.from(stitched).toString('base64');

    const estimatedSeconds = stitched.byteLength / 16000;
    const audioDuration = formatDuration(estimatedSeconds);

    // 5. Persist incremented usage count in Clerk privateMetadata
    const newCount = usageCount + 1;
    await client.users.updateUser(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        usageMonth: currentMonth,
        usageCount: newCount,
      },
    });

    console.log(`[VoiceDrop] Successfully generated podcast: ${title} (user ${userId}, ${newCount}/${limit})`);
    return NextResponse.json({
      audio: audioBase64,
      transcript: turns,
      title,
      source,
      duration: audioDuration,
      // Usage context for the UI
      usageCount: newCount,
      limit,
      plan,
    });
  } catch (err) {
    console.error('[VoiceDrop API Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred during generation.' },
      { status: 500 }
    );
  }
}
