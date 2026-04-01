import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
  ALL_VOICES,
  calculateTokenCharge,
  estimateTokenChargeForDuration,
  getPlanEntitlements,
  resolvePlan,
  type DurationOption,
  type Language,
  type Tone,
} from '@/lib/plans';
import type { ResolvedSelections } from '@/types';

// Increase function timeout for longer podcasts and TTS synthesis.
export const maxDuration = 120;

interface Turn {
  speaker: 'A' | 'B';
  text: string;
}

interface GenerateBody {
  url: string;
  voiceA: string;
  voiceB: string;
  tone: Tone;
  language?: Language;
  duration?: number;
}

/** Number of dialogue turns per requested duration */
const TURNS_FOR_DURATION: Record<DurationOption, number> = { 1: 6, 2: 10, 3: 16 };

/** Expanded tone instructions for richer prompting */
const TONE_PROMPT: Record<Tone, string> = {
  Professional:
    'a sharp executive briefing between two analysts. Host A focuses on data, evidence, and specific facts from the article. Host B draws out the strategic implications and broader impact. Reference exact numbers, quotes, or findings from the article. No filler phrases. Speak naturally but with discipline — like a tightly produced CEO podcast. Make each host sound distinct: Host A is analytical and precise, Host B is strategic and forward-looking.',
  Conversational:
    'two engaged friends reacting to something they both just read. They reference each other\'s points — "wait, but what you said about X..." — express genuine surprise at surprising facts, push back gently, and bring their own perspective. Include one moment where something from the article actually catches them off-guard. Deeply tied to the article\'s specific content. Each host sounds like a real person: Host A is curious and optimistic, Host B is a bit more skeptical and questioning.',
  Debate:
    'a structured live intellectual debate. Host A builds a clear case FOR the article\'s main argument, citing its specific evidence and data. Host B challenges each claim with direct counterpoints — alternative interpretations, what the article overlooked, or flaws in the reasoning. They address each other directly: "Your point about X ignores the fact that..." It should feel like a real sparring match, not two separate monologues. Host A is persuasive and confident; Host B is incisive and critical.',
  Summary:
    'a crisp, no-filler briefing covering only the 3-5 most important insights from the article. Each dialogue turn is one standalone insight — punchy, clear, and immediately useful. No intro, no opinions, no padding. Just the essential value a busy reader needs, delivered in natural spoken form. Host A surfaces the insights; Host B adds a one-sentence "so what" for each.',
};

const VOICE_IDS = Object.fromEntries(ALL_VOICES.map((voice) => [voice.name, voice.id])) as Record<string, string>;

const CONVERSATIONAL_VOICE_IDS: Record<Language, { a: string; b: string }> = {
  English: { a: 'd3MFdIuCfbAIwiu7jC4a', b: 'zSiMZcCo0oBh047sunsX' },
  Hinglish: { a: '9SsFrOutdZkCkU5hIoQm', b: 'ulZgFXalzbrnPUGQGs0S' },
};

const DEFAULT_VOICE_A = 'EXAVITQu4vr4xnSDxMaL';
const DEFAULT_VOICE_B = 'TX3LPaxmHKxFdv7VOQHJ';

function pickAllowed<T extends string | number>(value: T | undefined, allowed: readonly T[]): T {
  return value !== undefined && allowed.includes(value) ? value : allowed[0];
}

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
  const total = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;

  for (const buffer of buffers) {
    out.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return out.buffer;
}

function repairTruncatedJsonArray(raw: string): string {
  let trimmed = raw.trimEnd();
  if (trimmed.endsWith(',')) trimmed = trimmed.slice(0, -1).trimEnd();

  const lastObjectClose = trimmed.lastIndexOf('}');
  if (lastObjectClose !== -1) {
    return `${trimmed.slice(0, lastObjectClose + 1)}\n]`;
  }

  return '[]';
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
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
          similarity_boost: 0.8,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    });

  let response = await synthesize(preferredVoiceId);
  if (!response.ok) {
    const errorText = await response.text();
    if (preferredVoiceId !== fallbackVoiceId && isLibraryVoiceRestriction(errorText)) {
      console.warn(`[VoiceDrop] Voice ${preferredVoiceId} is restricted for this ElevenLabs key. Falling back to ${fallbackVoiceId}.`);
      response = await synthesize(fallbackVoiceId);
      if (!response.ok) {
        const fallbackError = await response.text();
        throw new Error(`ElevenLabs TTS fallback error: ${fallbackError}`);
      }
      return response.arrayBuffer();
    }

    throw new Error(`ElevenLabs TTS error: ${errorText}`);
  }

  return response.arrayBuffer();
}

function buildTokenLimitResponse(
  error: string,
  plan: string,
  tokenBudget: number,
  tokensUsed: number,
  resolvedSelections: ResolvedSelections,
  estimatedTokens?: number
) {
  const tokensRemaining = Math.max(tokenBudget - tokensUsed, 0);
  return NextResponse.json(
    {
      error,
      tokenLimitReached: true,
      plan,
      tokenBudget,
      tokensUsed,
      tokensRemaining,
      estimatedTokens,
      resolvedSelections,
    },
    { status: 429 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId, has } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Sign in to generate podcasts.', requiresAuth: true },
        { status: 401 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const couponPlan = user.publicMetadata?.couponPlan as string | undefined;
    const plan = resolvePlan(has, couponPlan);
    const entitlements = getPlanEntitlements(plan);
    const tokenBudget = entitlements.monthlyTokenBudget;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const storedMonth = user.privateMetadata?.usageMonth as string | undefined;
    const tokensUsed =
      storedMonth === currentMonth
        ? ((user.privateMetadata?.tokensUsed as number | undefined) ?? 0)
        : 0;

    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!cfAccountId || !cfApiToken || !elevenLabsApiKey) {
      console.error('[VoiceDrop] Missing environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = (await req.json()) as GenerateBody;
    const articleUrl = body.url;
    const resolvedSelections: ResolvedSelections = {
      language: pickAllowed(body.language, entitlements.languages),
      duration: pickAllowed(
        (typeof body.duration === 'number' ? body.duration : undefined) as DurationOption | undefined,
        entitlements.durations
      ),
      tone: pickAllowed(body.tone, entitlements.tones),
      voiceA: pickAllowed(body.voiceA, entitlements.voices.a),
      voiceB: pickAllowed(body.voiceB, entitlements.voices.b),
    };

    const estimatedTokens = estimateTokenChargeForDuration(resolvedSelections.duration);
    if (tokensUsed + estimatedTokens > tokenBudget) {
      return buildTokenLimitResponse(
        `You only have ${Math.max(tokenBudget - tokensUsed, 0)} tokens left this month. This episode is estimated to cost ${estimatedTokens} tokens. Upgrade to continue.`,
        plan,
        tokenBudget,
        tokensUsed,
        resolvedSelections,
        estimatedTokens
      );
    }

    try {
      new URL(articleUrl);
    } catch {
      return NextResponse.json({ error: 'Please provide a valid URL (e.g. https://example.com)' }, { status: 400 });
    }

    if (!articleUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Please provide a valid HTTP/HTTPS URL' }, { status: 400 });
    }

    console.log(`[VoiceDrop] Fetching article: ${articleUrl}`);
    let articleResponse;
    try {
      articleResponse = await fetch(articleUrl, {
        headers: { 'User-Agent': 'VoiceDrop/1.0 (podcast-generator)' },
      });
    } catch (fetchError) {
      console.error('[VoiceDrop] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to access the article URL. Please check the URL and try again.' },
        { status: 400 }
      );
    }

    if (!articleResponse.ok) {
      return NextResponse.json({ error: `Could not fetch article (HTTP ${articleResponse.status})` }, { status: 400 });
    }

    const html = await articleResponse.text();
    const articleText = stripHtml(html).slice(0, 3000);
    if (articleText.length < 100) {
      return NextResponse.json({ error: 'The article content seems too short or restricted.' }, { status: 400 });
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : 'Podcast Episode';
    const title = rawTitle.replace(/\s*[|\-–]\s*.+$/, '').trim();
    const source = new URL(articleUrl).hostname.replace('www.', '');

    const cfBase = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run`;
    const cfHeaders = {
      Authorization: `Bearer ${cfApiToken}`,
      'Content-Type': 'application/json',
    };

    console.log('[VoiceDrop] Extracting key facts with Workers AI...');
    let keyFacts = '';
    try {
      const factsResponse = await fetch(`${cfBase}/@cf/meta/llama-3.1-8b-instruct`, {
        method: 'POST',
        headers: cfHeaders,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a JSON API. Output ONLY a raw JSON array of strings. No markdown, no explanation.' },
            { role: 'user', content: `Extract the 5 most important facts, statistics, or quotes from this article as a JSON array of strings.\nArticle: ${articleText.slice(0, 2000)}` },
          ],
          max_tokens: 400,
        }),
      });

      if (factsResponse.ok) {
        const factsData = await factsResponse.json();
        const rawFacts = (factsData.result?.response ?? '').trim();
        const factsStart = rawFacts.indexOf('[');
        if (factsStart !== -1) {
          try {
            const parsed = JSON.parse(rawFacts.slice(factsStart, rawFacts.lastIndexOf(']') + 1));
            if (Array.isArray(parsed)) keyFacts = parsed.slice(0, 5).join(' | ');
          } catch {
            keyFacts = '';
          }
        }
      }
    } catch {
      keyFacts = '';
    }

    console.log(`[VoiceDrop] Generating dialogue with Workers AI (${resolvedSelections.duration} min, ${resolvedSelections.language}, ${resolvedSelections.tone})...`);
    const toneInstruction = TONE_PROMPT[resolvedSelections.tone];
    const isHinglish = resolvedSelections.language === 'Hinglish';
    const languageInstruction = isHinglish
      ? 'Write in natural Hinglish — 80-85% English with natural Hindi flavour, no Devanagari script, and no full Hindi sentences.'
      : 'Write in clear, natural, globally accessible English. No jargon, no filler.';
    const indianExampleInstruction =
      resolvedSelections.tone === 'Conversational'
        ? 'Include at least one relatable everyday analogy familiar to urban Indian professionals.'
        : '';
    const factsContext = keyFacts ? `Key facts to reference: ${keyFacts}\n` : '';
    const turnCount = TURNS_FOR_DURATION[resolvedSelections.duration];

    const aiResponse = await fetch(`${cfBase}/@cf/meta/llama-3.1-8b-instruct`, {
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
- Output a JSON array of exactly ${turnCount} objects, strictly alternating A then B then A, starting with A.
- Each object: {"speaker":"A","text":"..."} or {"speaker":"B","text":"..."}
- Each text must be 1-3 spoken sentences and reference specific facts from the article.
- Hosts should react to each other, not deliver isolated monologues.
- Output ONLY the JSON array.

Article: ${articleText}`,
          },
        ],
        max_tokens: Math.min(200 * turnCount, 4096),
      }),
    });

    if (!aiResponse.ok) {
      const aiError = await aiResponse.text();
      console.error('[VoiceDrop] Cloudflare AI error:', aiError);
      return NextResponse.json(
        { error: 'AI synthesis failed. This might be due to service limits. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    const aiData = await aiResponse.json();
    const rawAiText = (aiData.result?.response ?? '').trim();
    if (!rawAiText) {
      throw new Error('AI returned an empty response');
    }

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
    const jsonString = jsonEnd === -1 ? repairTruncatedJsonArray(partial) : partial.slice(0, jsonEnd + 1);

    let turns: Turn[];
    try {
      turns = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('[VoiceDrop] JSON parse error:', parseError, '\nRaw:', rawAiText);
      throw new Error('Failed to parse AI-generated dialogue. Please try again.');
    }

    if (!Array.isArray(turns) || turns.length === 0) {
      throw new Error('AI returned an empty dialogue. Please try again.');
    }

    const totalTtsCharacters = turns.reduce((sum, turn) => sum + turn.text.length, 0);
    const tokenCharge = calculateTokenCharge(totalTtsCharacters);
    if (tokensUsed + tokenCharge.totalTokens > tokenBudget) {
      return buildTokenLimitResponse(
        `This episode needs ${tokenCharge.totalTokens} tokens, but you only have ${Math.max(tokenBudget - tokensUsed, 0)} left this month. Upgrade to continue.`,
        plan,
        tokenBudget,
        tokensUsed,
        resolvedSelections,
        tokenCharge.totalTokens
      );
    }

    console.log('[VoiceDrop] Generating audio with ElevenLabs...');
    const conversationalVoices =
      resolvedSelections.tone === 'Conversational'
        ? CONVERSATIONAL_VOICE_IDS[resolvedSelections.language]
        : null;
    const voiceAId = conversationalVoices?.a ?? VOICE_IDS[resolvedSelections.voiceA] ?? DEFAULT_VOICE_A;
    const voiceBId = conversationalVoices?.b ?? VOICE_IDS[resolvedSelections.voiceB] ?? DEFAULT_VOICE_B;
    const audioBuffers: ArrayBuffer[] = [];

    for (const turn of turns) {
      const preferredVoiceId = turn.speaker === 'A' ? voiceAId : voiceBId;
      const fallbackVoiceId = turn.speaker === 'A' ? DEFAULT_VOICE_A : DEFAULT_VOICE_B;
      audioBuffers.push(
        await synthesizeTurnAudio(elevenLabsApiKey, turn.text, preferredVoiceId, fallbackVoiceId)
      );
    }

    const stitched = concatBuffers(audioBuffers);
    const audioBase64 = Buffer.from(stitched).toString('base64');
    const estimatedSeconds = stitched.byteLength / 16000;
    const audioDuration = formatDuration(estimatedSeconds);
    const updatedTokensUsed = tokensUsed + tokenCharge.totalTokens;

    await client.users.updateUser(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        usageMonth: currentMonth,
        tokensUsed: updatedTokensUsed,
        lastTokenCharge: tokenCharge.totalTokens,
      },
    });

    return NextResponse.json({
      audio: audioBase64,
      transcript: turns,
      title,
      source,
      duration: audioDuration,
      plan,
      resolvedSelections,
      tokenBudget,
      tokensUsed: updatedTokensUsed,
      tokensRemaining: Math.max(tokenBudget - updatedTokensUsed, 0),
      tokensCharged: tokenCharge.totalTokens,
    });
  } catch (error) {
    console.error('[VoiceDrop API Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred during generation.' },
      { status: 500 }
    );
  }
}
