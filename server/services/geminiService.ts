import { GoogleGenAI, Type } from '@google/genai';
import { ENV } from '../config/env.js';
import { ComplaintCategory, ComplaintPriority } from '../models/Complaint.js';

export const ALLOWED_CATEGORIES: ComplaintCategory[] = [
  'ELECTRICAL',
  'PLUMBING',
  'INTERNET_WIFI',
  'FURNITURE',
  'CLEANING',
  'CLASSROOM_EQUIPMENT',
  'SECURITY',
  'TRANSPORT',
  'HOSTEL',
  'OTHER',
];

export const ALLOWED_PRIORITIES: ComplaintPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

export const ALLOWED_DEPARTMENTS: Record<string, { code: string; name: string }> = {
  ELEC: { code: 'ELEC', name: 'Electrical Maintenance' },
  PLUMB: { code: 'PLUMB', name: 'Plumbing & Water Systems' },
  'IT-NET': { code: 'IT-NET', name: 'IT & Network Infrastructure' },
  FACIL: { code: 'FACIL', name: 'Campus Facilities & Operations' },
  HOUSE: { code: 'HOUSE', name: 'General Housekeeping' },
};

export const CATEGORY_TO_DEPARTMENT: Record<ComplaintCategory, string> = {
  ELECTRICAL: 'ELEC',
  PLUMBING: 'PLUMB',
  INTERNET_WIFI: 'IT-NET',
  FURNITURE: 'FACIL',
  CLEANING: 'HOUSE',
  CLASSROOM_EQUIPMENT: 'FACIL',
  SECURITY: 'FACIL',
  TRANSPORT: 'FACIL',
  HOSTEL: 'FACIL',
  OTHER: 'FACIL',
};

export interface ComplaintAnalysisInput {
  description: string;
  building?: string;
  floor?: string;
  room?: string;
}

export interface ComplaintAnalysisOutput {
  suggestedTitle: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  departmentCode: string;
  summary: string;
  suggestedAction: string;
}

export type MockGeminiHandler = (input: ComplaintAnalysisInput) => Promise<any>;

let activeMockHandler: MockGeminiHandler | null = null;
let geminiClientInstance: GoogleGenAI | null = null;

export function setMockGeminiHandler(handler: MockGeminiHandler | null): void {
  activeMockHandler = handler;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = ENV.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured');
  }

  if (!geminiClientInstance) {
    geminiClientInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return geminiClientInstance;
}

/**
 * Validates and sanitizes raw model output against CampusFix domain schemas
 */
export function sanitizeAnalysisOutput(
  raw: any,
  fallbackDescription: string
): ComplaintAnalysisOutput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI response structure: expected JSON object');
  }

  // 1. Sanitize and validate category
  let category: ComplaintCategory = 'OTHER';
  if (typeof raw.category === 'string') {
    const candidateCategory = raw.category.trim().toUpperCase() as ComplaintCategory;
    if (ALLOWED_CATEGORIES.includes(candidateCategory)) {
      category = candidateCategory;
    }
  }

  // 2. Sanitize and validate priority
  let priority: ComplaintPriority = 'MEDIUM';
  if (typeof raw.priority === 'string') {
    const candidatePriority = raw.priority.trim().toUpperCase() as ComplaintPriority;
    if (ALLOWED_PRIORITIES.includes(candidatePriority)) {
      priority = candidatePriority;
    }
  }

  // 3. Sanitize and validate departmentCode
  let departmentCode = CATEGORY_TO_DEPARTMENT[category] || 'FACIL';
  if (typeof raw.departmentCode === 'string') {
    const candidateDept = raw.departmentCode.trim().toUpperCase();
    if (ALLOWED_DEPARTMENTS[candidateDept]) {
      departmentCode = candidateDept;
    }
  }

  // 4. Sanitize title
  let suggestedTitle =
    typeof raw.suggestedTitle === 'string' ? raw.suggestedTitle.trim() : '';
  if (!suggestedTitle) {
    suggestedTitle = `${category.replace(/_/g, ' ')} Issue Report`;
  }
  if (suggestedTitle.length > 120) {
    suggestedTitle = suggestedTitle.substring(0, 117) + '...';
  }

  // 5. Sanitize summary
  let summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
  if (!summary) {
    summary =
      fallbackDescription.length > 140
        ? fallbackDescription.substring(0, 137) + '...'
        : fallbackDescription;
  }

  // 6. Sanitize suggestedAction
  let suggestedAction =
    typeof raw.suggestedAction === 'string' ? raw.suggestedAction.trim() : '';
  if (!suggestedAction) {
    suggestedAction =
      'Dispatch maintenance technician to inspect reported location and assess required repair tools.';
  }

  return {
    suggestedTitle,
    category,
    priority,
    departmentCode,
    summary,
    suggestedAction,
  };
}

/**
 * Analyzes student complaint description using Gemini 3.8 Flash model.
 * Returns structured recommendations for title, category, priority, department, summary, and action.
 */
export async function analyzeComplaint(
  input: ComplaintAnalysisInput
): Promise<ComplaintAnalysisOutput> {
  const description = (input.description || '').trim();
  if (!description) {
    throw new Error('Description is required for complaint analysis');
  }

  // If a mock handler is configured (e.g. during automated tests), invoke it
  if (activeMockHandler) {
    const mockRaw = await activeMockHandler(input);
    return sanitizeAnalysisOutput(mockRaw, description);
  }

  const ai = getGeminiClient();

  const locationContext = [
    input.building ? `Building: ${input.building}` : null,
    input.floor ? `Floor: ${input.floor}` : null,
    input.room ? `Room/Lab: ${input.room}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const prompt = `Analyze this campus maintenance complaint and recommend triage classifications:

Complaint Description:
"${description}"

${locationContext ? `Location Details: ${locationContext}` : ''}

Allowed Categories:
- ELECTRICAL (lights, wiring, sockets, power trips, transformers, fans)
- PLUMBING (water leaks, drainage, taps, sinks, flush valves, washrooms)
- INTERNET_WIFI (Wi-Fi access points, router hubs, fiber, ethernet drops, DNS)
- FURNITURE (desks, chairs, whiteboards, doors, hinges, cabinets)
- CLEANING (housekeeping, sanitation, spills, trash overflow, graffiti)
- CLASSROOM_EQUIPMENT (projectors, smart podiums, microphones, lab equipment)
- SECURITY (locks, perimeter lighting, fire exits, emergency alarms, hazards)
- TRANSPORT (campus shuttles, bicycle stands, parking barriers)
- HOSTEL (dormitory rooms, dormitory electrical/plumbing fixtures)
- OTHER (general maintenance)

Allowed Priorities:
- LOW (minor cosmetic or non-disruptive)
- MEDIUM (routine repair impacting single user comfort)
- HIGH (disruptive failure impacting teaching, classes, or multiple students)
- CRITICAL (immediate safety danger, active water flood, sparking electrical hazard)

Allowed Departments:
- ELEC (Electrical Maintenance)
- PLUMB (Plumbing & Water Systems)
- IT-NET (IT & Network Infrastructure)
- FACIL (Campus Facilities & Operations)
- HOUSE (General Housekeeping)
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        'You are CampusFix AI, an intelligent campus facility maintenance triage assistant. Analyze student complaints and return structured JSON triage recommendations with suggested title, category, priority, departmentCode, short summary, and suggested action for maintenance staff.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedTitle: {
            type: Type.STRING,
            description: 'A concise, professional headline for the issue (max 80 chars)',
          },
          category: {
            type: Type.STRING,
            description:
              'Must be one of: ELECTRICAL, PLUMBING, INTERNET_WIFI, FURNITURE, CLEANING, CLASSROOM_EQUIPMENT, SECURITY, TRANSPORT, HOSTEL, OTHER',
          },
          priority: {
            type: Type.STRING,
            description: 'Must be one of: LOW, MEDIUM, HIGH, CRITICAL',
          },
          departmentCode: {
            type: Type.STRING,
            description: 'Must be one of: ELEC, PLUMB, IT-NET, FACIL, HOUSE',
          },
          summary: {
            type: Type.STRING,
            description: 'A 1-2 sentence executive summary of the issue',
          },
          suggestedAction: {
            type: Type.STRING,
            description:
              'Recommended operational or safety action for maintenance technicians',
          },
        },
        required: [
          'suggestedTitle',
          'category',
          'priority',
          'departmentCode',
          'summary',
          'suggestedAction',
        ],
      },
    },
  });

  const responseText = response.text || '';
  if (!responseText.trim()) {
    throw new Error('Empty response received from Gemini model');
  }

  const parsed = JSON.parse(responseText.trim());
  return sanitizeAnalysisOutput(parsed, description);
}
