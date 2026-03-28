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
  Professional:    'formal, concise, and executive-ready — use precise language and structured points',
  Conversational:  'casual and friendly, like two colleagues chatting over coffee — warm, accessible, engaging',
  Debate:          'two contrasting viewpoints — Host A argues strongly FOR the topic, Host B argues strongly AGAINST; be direct and sharp',
  Summary:         'ultra-brief key takeaways only — each turn is one punchy, standalone sentence',
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
      ? `Write naturally in Hinglish — the mixed Hindi-English spoken in Indian cities. Use Devanagari script inline for Hindi words/phrases (e.g. "यह point बहुत important है"). Keep it conversational, not translated.`
      : `Write in clear, natural English.`;
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
              content: `Write a ${toneInstruction} podcast dialogue between Host A and Host B about this article.
${languageInstruction}
${indianExampleInstruction}
${factsContext}Output a JSON array of exactly ${turnCount} objects, alternating speakers starting with A.
Each object: {"speaker":"A","text":"..."} or {"speaker":"B","text":"..."}.
Each "text" is 1–3 natural spoken sentences that directly reference specific facts from the article. Do not be generic.
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
    // Conversational tone uses dedicated language-matched voices (free-tier IDs)
    const convVoices = tone === 'Conversational'
      ? (CONVERSATIONAL_VOICE_IDS[language] ?? CONVERSATIONAL_VOICE_IDS.English)
      : null;
    const voiceAId = convVoices?.a ?? VOICE_IDS[voiceA] ?? DEFAULT_VOICE_A;
    const voiceBId = convVoices?.b ?? VOICE_IDS[voiceB] ?? DEFAULT_VOICE_B;
    const audioBuffers: ArrayBuffer[] = [];

    for (const turn of turns) {
      const voiceId = turn.speaker === 'A' ? voiceAId : voiceBId;
      const ttsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey!,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: turn.text,
            model_id: 'eleven_multilingual_v2',
            output_format: 'mp3_44100_128',
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.80,
              style: 0.35,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        throw new Error(`ElevenLabs TTS error: ${errText}`);
      }
      audioBuffers.push(await ttsRes.arrayBuffer());
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
