import { GoogleGenAI, Type } from '@google/genai';
import {
  Complaint,
  IComplaint,
  ComplaintCategory,
  ComplaintStatus,
} from '../models/Complaint.js';
import { getGeminiClient, ALLOWED_CATEGORIES } from './geminiService.js';

export interface DuplicateDetectionInput {
  title?: string;
  description: string;
  category?: string;
  building?: string;
  floor?: string;
  room?: string;
}

export interface CandidateComplaintSummary {
  _id: string;
  ticketId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  building: string;
  floor: string;
  room: string;
  createdAt: Date;
}

export interface DuplicateMatchItem {
  complaintId: string;
  ticketId: string;
  title: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  location: {
    building: string;
    floor: string;
    room: string;
  };
  shortDescription: string;
  reason: string;
  confidence: number;
}

export interface DuplicateDetectionResult {
  hasDuplicate: boolean;
  confidence: number;
  matches: DuplicateMatchItem[];
  candidateCount: number;
}

export type MockDuplicateHandler = (
  input: DuplicateDetectionInput,
  candidates: CandidateComplaintSummary[]
) => Promise<any>;

let activeMockDuplicateHandler: MockDuplicateHandler | null = null;

export function setMockDuplicateHandler(handler: MockDuplicateHandler | null): void {
  activeMockDuplicateHandler = handler;
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Queries MongoDB for a limited candidate set of active complaints.
 * Strictly excludes CLOSED complaints and limits to 15 candidates.
 */
export async function findCandidateComplaints(
  input: DuplicateDetectionInput,
  limit: number = 15
): Promise<CandidateComplaintSummary[]> {
  const query: any = {
    status: { $ne: 'CLOSED' },
  };

  const orConditions: any[] = [];

  if (input.building && input.building.trim()) {
    orConditions.push({
      building: { $regex: new RegExp(`^${escapeRegex(input.building.trim())}$`, 'i') },
    });
  }

  if (input.room && input.room.trim()) {
    orConditions.push({
      room: { $regex: new RegExp(`^${escapeRegex(input.room.trim())}$`, 'i') },
    });
  }

  if (
    input.category &&
    ALLOWED_CATEGORIES.includes(input.category.trim().toUpperCase() as ComplaintCategory)
  ) {
    orConditions.push({
      category: input.category.trim().toUpperCase(),
    });
  }

  if (orConditions.length > 0) {
    query.$or = orConditions;
  }

  const rawDocs = await Complaint.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('_id title description category status building floor room createdAt')
    .lean();

  return rawDocs.map((doc: any) => ({
    _id: doc._id.toString(),
    ticketId: `#CMP-${doc._id.toString().slice(-6).toUpperCase()}`,
    title: doc.title || 'Untitled',
    description: doc.description || '',
    category: doc.category as ComplaintCategory,
    status: doc.status as ComplaintStatus,
    building: doc.building || '',
    floor: doc.floor || '',
    room: doc.room || '',
    createdAt: doc.createdAt,
  }));
}

/**
 * Validates and sanitizes AI duplicate detection output.
 * Ensures that only complaint IDs that exist in the candidate set are returned.
 */
export function sanitizeDuplicateOutput(
  raw: any,
  candidates: CandidateComplaintSummary[]
): DuplicateDetectionResult {
  const candidateMap = new Map<string, CandidateComplaintSummary>();
  candidates.forEach((c) => candidateMap.set(c._id.toString(), c));

  if (!raw || typeof raw !== 'object') {
    return {
      hasDuplicate: false,
      confidence: 0,
      matches: [],
      candidateCount: candidates.length,
    };
  }

  const rawMatches = Array.isArray(raw.matches) ? raw.matches : [];
  const validMatches: DuplicateMatchItem[] = [];

  for (const item of rawMatches) {
    if (!item || typeof item !== 'object') continue;

    const complaintId = String(item.complaintId || '').trim();
    const candidate = candidateMap.get(complaintId);

    // CRITICAL: Reject any hallucinated IDs not present in the candidate set
    if (!candidate) {
      continue;
    }

    let confidence =
      typeof item.confidence === 'number'
        ? item.confidence
        : parseFloat(item.confidence) || 0;
    confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));

    let reason = typeof item.reason === 'string' ? item.reason.trim() : '';
    if (!reason) {
      reason = 'Describes a similar maintenance issue at this campus location.';
    }
    if (reason.length > 300) {
      reason = reason.substring(0, 297) + '...';
    }

    validMatches.push({
      complaintId: candidate._id,
      ticketId: candidate.ticketId,
      title: candidate.title,
      category: candidate.category,
      status: candidate.status,
      location: {
        building: candidate.building,
        floor: candidate.floor,
        room: candidate.room,
      },
      shortDescription:
        candidate.description.length > 140
          ? candidate.description.substring(0, 137) + '...'
          : candidate.description,
      reason,
      confidence,
    });
  }

  validMatches.sort((a, b) => b.confidence - a.confidence);

  const hasDuplicate = Boolean(raw.hasDuplicate) && validMatches.length > 0;
  let overallConfidence =
    typeof raw.confidence === 'number'
      ? raw.confidence
      : parseFloat(raw.confidence) || 0;
  overallConfidence = Math.max(0, Math.min(1, Math.round(overallConfidence * 100) / 100));

  if (!hasDuplicate) {
    return {
      hasDuplicate: false,
      confidence: 0,
      matches: [],
      candidateCount: candidates.length,
    };
  }

  if (overallConfidence === 0 && validMatches.length > 0) {
    overallConfidence = validMatches[0].confidence;
  }

  return {
    hasDuplicate: true,
    confidence: overallConfidence,
    matches: validMatches,
    candidateCount: candidates.length,
  };
}

/**
 * Evaluates whether a new complaint submission duplicates any active complaints.
 * 1. Queries MongoDB for candidate active complaints (capped at 15, excluding CLOSED).
 * 2. If no candidates exist, returns immediately without invoking Gemini.
 * 3. Compares candidates using Gemini 3.8 Flash model.
 * 4. Strictly validates results against candidate set.
 */
export async function detectDuplicateComplaints(
  input: DuplicateDetectionInput
): Promise<DuplicateDetectionResult> {
  const description = (input.description || '').trim();
  const title = (input.title || '').trim();

  if (!description && !title) {
    throw new Error('Title or description is required for duplicate checking');
  }

  // 1. Fetch filtered active candidates from MongoDB
  const candidates = await findCandidateComplaints(input, 15);

  if (candidates.length === 0) {
    return {
      hasDuplicate: false,
      confidence: 0,
      matches: [],
      candidateCount: 0,
    };
  }

  // 2. Invoke mock handler if configured (e.g. during unit/integration tests)
  if (activeMockDuplicateHandler) {
    const mockRaw = await activeMockDuplicateHandler(input, candidates);
    return sanitizeDuplicateOutput(mockRaw, candidates);
  }

  // 3. Invoke real Gemini API
  const ai = getGeminiClient();

  const candidatesForAI = candidates.map((c) => ({
    complaintId: c._id,
    title: c.title,
    category: c.category,
    status: c.status,
    location: `${c.building}, Floor: ${c.floor}, Room: ${c.room}`,
    description:
      c.description.length > 200 ? c.description.slice(0, 197) + '...' : c.description,
  }));

  const locationContext = [
    input.building ? `Building: ${input.building}` : null,
    input.floor ? `Floor: ${input.floor}` : null,
    input.room ? `Room: ${input.room}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const prompt = `You are CampusFix AI, an intelligent campus facility maintenance duplicate detector.
A student is about to submit a new complaint. Compare the new complaint with the candidate active complaints below.
Determine whether any candidate describes the exact same underlying problem or maintenance incident.

New Complaint:
- Title: ${title || 'Not provided'}
- Category: ${input.category || 'Not specified'}
- Location: ${locationContext || 'Not specified'}
- Description: "${description}"

Candidate Active Complaints:
${JSON.stringify(candidatesForAI, null, 2)}

Instructions:
1. Determine whether any candidate represents the exact same physical issue or ongoing maintenance incident.
2. If yes, set hasDuplicate to true, provide an overall confidence score between 0.0 and 1.0, and include the matched complaintId, a clear reason, and match confidence.
3. If no candidate represents the same issue, set hasDuplicate to false, confidence to 0, and matches to [].
4. CRITICAL: You must ONLY use complaintId values present in the candidate complaints list. Never invent or hallucinate IDs.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        'You are CampusFix AI. Return structured JSON indicating if the new complaint matches any existing candidate active complaint.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasDuplicate: {
            type: Type.BOOLEAN,
            description: 'Whether any candidate describes the same underlying problem',
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Overall duplicate confidence score between 0 and 1',
          },
          matches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                complaintId: {
                  type: Type.STRING,
                  description: 'The exact complaintId of the matching candidate',
                },
                reason: {
                  type: Type.STRING,
                  description: 'Specific reason explaining why this describes the same problem',
                },
                confidence: {
                  type: Type.NUMBER,
                  description: 'Confidence score for this specific match between 0 and 1',
                },
              },
              required: ['complaintId', 'reason', 'confidence'],
            },
          },
        },
        required: ['hasDuplicate', 'confidence', 'matches'],
      },
    },
  });

  const responseText = response.text || '';
  if (!responseText.trim()) {
    throw new Error('Empty response received from Gemini model');
  }

  const parsed = JSON.parse(responseText.trim());
  return sanitizeDuplicateOutput(parsed, candidates);
}
