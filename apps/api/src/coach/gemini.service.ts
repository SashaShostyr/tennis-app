import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import type { AnalyzeRequest, AnalyzeResponse } from './coach.types';

// Structured-output schema Gemini must conform to. Ported from the standalone
// coach (server/src/gemini.ts).
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tip: { type: Type.STRING },
          why: { type: Type.STRING },
          drill: { type: Type.STRING },
        },
        required: ['tip', 'why', 'drill'],
      },
    },
    overallScore: { type: Type.NUMBER },
  },
  required: ['summary', 'strengths', 'improvements', 'overallScore'],
};

@Injectable()
export class GeminiService {
  private client: GoogleGenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  /** Lazily constructed so a missing key produces a clean 503, not a boot crash. */
  private getClient(): GoogleGenAI {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is not set. Add it to the API .env file.',
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  private buildPrompt(req: AnalyzeRequest): string {
    const hand = `${req.handedness}-handed`;
    const shot =
      req.shotType === 'backhand'
        ? `backhand (${req.twoHandedBackhand ? 'two-handed' : 'one-handed'})`
        : req.shotType;

    const metricLines = req.metrics
      .map((m) => {
        const val = m.value === null ? 'not measurable' : `${m.value}${m.unit}`;
        return `- ${m.label}: ${val} [${m.status}] — ${m.note}`;
      })
      .join('\n');

    return [
      `You are an experienced, encouraging tennis coach analyzing a single ${shot} from a ${hand} player.`,
      ``,
      `You are given (a) objective metrics estimated from in-browser pose detection on a few frames, and`,
      `(b) a few key still frames from the clip. The metrics come from a single uncalibrated phone camera,`,
      `so treat them as approximate signals, not exact measurements. Use the frames to sanity-check and`,
      `add detail (grip, stance, racket position, timing) the numbers can't capture.`,
      ``,
      `Measured metrics:`,
      metricLines || '- (none could be measured)',
      ``,
      `Give concise, actionable coaching. Prioritize the 2–4 changes that would most improve this shot.`,
      `For each improvement include why it matters and one simple drill the player can do.`,
      `Be specific to what you actually observe; do not invent details you can't see.`,
      `overallScore is a coarse 0–100 technique impression for a recreational player.`,
    ].join('\n');
  }

  async analyzeShot(req: AnalyzeRequest): Promise<AnalyzeResponse> {
    const ai = this.getClient();
    const model = this.config.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    const prompt = this.buildPrompt(req);

    const imageParts = req.keyframes.slice(0, 3).map((b64) => ({
      inlineData: { mimeType: 'image/jpeg', data: b64 },
    }));

    let result;
    try {
      result = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.6,
        },
      });
    } catch (err) {
      throw this.toFriendlyError(err);
    }

    const text = result.text;
    if (!text) throw new Error('Gemini returned an empty response.');

    const parsed = JSON.parse(text) as AnalyzeResponse;
    // Clamp/guard so the UI never gets garbage.
    parsed.overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore ?? 0)));
    parsed.strengths ??= [];
    parsed.improvements ??= [];
    return parsed;
  }

  /** Map raw Gemini SDK errors to clean, user-facing HTTP exceptions. */
  private toFriendlyError(err: unknown): HttpException {
    const message = err instanceof Error ? err.message : String(err);
    if (/quota|rate|429|RESOURCE_EXHAUSTED/i.test(message)) {
      return new ServiceUnavailableException(
        'Gemini free-tier limit hit. Wait a bit and try again.',
      );
    }
    if (/location is not supported|FAILED_PRECONDITION/i.test(message)) {
      return new ServiceUnavailableException(
        'The coaching service (Gemini) is not available from this region. ' +
          'Try from a supported location, or switch the coaching provider.',
      );
    }
    return new ServiceUnavailableException('Coaching service failed. Please try again.');
  }
}
