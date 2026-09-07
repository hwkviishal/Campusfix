import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupPhase7Environment, Phase7TestContext } from './testHelper.js';
import {
  setMockDuplicateHandler,
  findCandidateComplaints,
  sanitizeDuplicateOutput,
} from '../server/services/duplicateComplaintService.js';
import { Complaint } from '../server/models/Complaint.js';

describe('Phase 7B — AI Duplicate Complaint Detection Suite', () => {
  let ctx: Phase7TestContext;

  before(async () => {
    ctx = await setupPhase7Environment();
  });

  after(async () => {
    setMockDuplicateHandler(null);
    await ctx.cleanup();
  });

  beforeEach(async () => {
    // Clean up complaints before each test
    await Complaint.deleteMany({ building: { $regex: /^Phase7B/ } });
    setMockDuplicateHandler(null);
  });

  // ==========================================
  // Test 1: Authenticated student can check duplicates
  // ==========================================
  it('1. Authenticated student can check duplicates', async () => {
    const existing = await Complaint.create({
      title: 'Water pipe leaking under sink',
      description: 'The main cold water pipe is dripping heavily under the wash basin.',
      category: 'PLUMBING',
      priority: 'MEDIUM',
      status: 'OPEN',
      building: 'Phase7B Science Block',
      floor: '2nd Floor',
      room: 'Lab 201',
      reportedBy: ctx.student._id,
    });

    setMockDuplicateHandler(async (input, candidates) => {
      return {
        hasDuplicate: true,
        confidence: 0.92,
        matches: [
          {
            complaintId: existing._id.toString(),
            reason: 'Both complaints report water leaking under the sink in Lab 201.',
            confidence: 0.94,
          },
        ],
      };
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        title: 'Leaking pipe in lab sink',
        description: 'Water is accumulating on the floor from a dripping pipe under the basin.',
        category: 'PLUMBING',
        building: 'Phase7B Science Block',
        floor: '2nd Floor',
        room: 'Lab 201',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.hasDuplicate, true);
    assert.ok(body.matches.length > 0);
    assert.equal(body.matches[0].complaintId, existing._id.toString());
    assert.equal(body.matches[0].ticketId, `#CMP-${existing._id.toString().slice(-6).toUpperCase()}`);
    assert.ok(body.matches[0].reason);
    assert.equal(body.matches[0].confidence, 0.94);
  });

  // ==========================================
  // Test 2: Unauthenticated request rejected
  // ==========================================
  it('2. Unauthenticated request rejected with 401', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Broken fluorescent bulb',
        description: 'Fluorescent fixture is flickering continuously.',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /authentication required/i);
  });

  // ==========================================
  // Test 3: Invalid request rejected
  // ==========================================
  it('3. Invalid request rejected with 400', async () => {
    // Empty body
    const resEmpty = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        title: '   ',
        description: '   ',
      }),
    });

    assert.equal(resEmpty.status, 400);
    const bodyEmpty = await resEmpty.json();
    assert.equal(bodyEmpty.success, false);
    assert.match(bodyEmpty.message, /title or description is required/i);

    // Overly long description (>2000 chars)
    const resLong = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        title: 'Valid title',
        description: 'x'.repeat(2001),
      }),
    });

    assert.equal(resLong.status, 400);
    const bodyLong = await resLong.json();
    assert.equal(bodyLong.success, false);
    assert.match(bodyLong.message, /cannot exceed 2000 characters/i);
  });

  // ==========================================
  // Test 4: Candidate complaints are limited
  // ==========================================
  it('4. Candidate complaints are limited to maximum 15 items', async () => {
    // Seed 25 active complaints in the same building
    const complaintsToInsert = [];
    for (let i = 1; i <= 25; i++) {
      complaintsToInsert.push({
        title: `Electrical issue #${i}`,
        description: `Wall socket number ${i} is not delivering power.`,
        category: 'ELECTRICAL',
        priority: 'MEDIUM',
        status: 'OPEN',
        building: 'Phase7B Engineering Hall',
        floor: '1st Floor',
        room: `Room ${100 + i}`,
        reportedBy: ctx.student._id,
      });
    }
    await Complaint.insertMany(complaintsToInsert);

    const candidates = await findCandidateComplaints({
      title: 'Broken socket',
      description: 'Power socket not working in engineering hall.',
      building: 'Phase7B Engineering Hall',
      category: 'ELECTRICAL',
    }, 15);

    assert.ok(candidates.length <= 15, `Candidates returned: ${candidates.length}, expected <= 15`);
    assert.equal(candidates.length, 15);
  });

  // ==========================================
  // Test 5: CLOSED complaints are excluded
  // ==========================================
  it('5. CLOSED complaints are strictly excluded from candidates', async () => {
    // Create an identical issue that is CLOSED
    const closedComplaint = await Complaint.create({
      title: 'Air conditioner not cooling',
      description: 'AC unit in Seminar Room 1 blows hot air.',
      category: 'ELECTRICAL',
      priority: 'HIGH',
      status: 'CLOSED', // Excluded!
      building: 'Phase7B Business School',
      floor: '3rd Floor',
      room: 'Seminar Room 1',
      reportedBy: ctx.student._id,
    });

    // Create a different active complaint
    const activeComplaint = await Complaint.create({
      title: 'Window latch loose',
      description: 'Window does not seal tightly.',
      category: 'FURNITURE',
      priority: 'LOW',
      status: 'OPEN',
      building: 'Phase7B Business School',
      floor: '3rd Floor',
      room: 'Room 305',
      reportedBy: ctx.student._id,
    });

    const candidates = await findCandidateComplaints({
      title: 'Air conditioner not cooling',
      description: 'AC unit in Seminar Room 1 blows hot air.',
      building: 'Phase7B Business School',
      floor: '3rd Floor',
      room: 'Seminar Room 1',
    });

    const foundClosed = candidates.some((c) => c._id === closedComplaint._id.toString());
    assert.equal(foundClosed, false, 'CLOSED complaint should not be in candidate list');
  });

  // ==========================================
  // Test 6: Same-location complaints are considered
  // ==========================================
  it('6. Same-location complaints are prioritized and considered', async () => {
    const locComplaint = await Complaint.create({
      title: 'Ceiling projector blinking red',
      description: 'HDMI connection keeps dropping during lectures in Auditorium B.',
      category: 'CLASSROOM_EQUIPMENT',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      building: 'Phase7B Technology Tower',
      floor: 'Ground Floor',
      room: 'Auditorium B',
      reportedBy: ctx.student._id,
    });

    const candidates = await findCandidateComplaints({
      title: 'Projector display issue',
      description: 'Projector does not connect to laptops.',
      building: 'Phase7B Technology Tower',
      floor: 'Ground Floor',
      room: 'Auditorium B',
    });

    const foundLoc = candidates.some((c) => c._id === locComplaint._id.toString());
    assert.equal(foundLoc, true, 'Same location complaint must be considered in candidates');
  });

  // ==========================================
  // Test 7: Gemini duplicate match is returned correctly
  // ==========================================
  it('7. Gemini duplicate match is returned correctly with confidence and explanation', async () => {
    const existing = await Complaint.create({
      title: 'Main entrance glass door cracked',
      description: 'Spiderweb crack visible on right glass sliding door at main entrance.',
      category: 'SECURITY',
      priority: 'HIGH',
      status: 'ASSIGNED',
      building: 'Phase7B Central Library',
      floor: '1st Floor',
      room: 'Main Foyer',
      reportedBy: ctx.student._id,
    });

    setMockDuplicateHandler(async (input, candidates) => {
      return {
        hasDuplicate: true,
        confidence: 0.89,
        matches: [
          {
            complaintId: existing._id.toString(),
            reason: 'Both reports cite the damaged glass entry door at Central Library.',
            confidence: 0.91,
          },
        ],
      };
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        title: 'Glass door fractured',
        description: 'Front door glass has a large crack and could shatter.',
        building: 'Phase7B Central Library',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.hasDuplicate, true);
    assert.equal(body.confidence, 0.89);
    assert.equal(body.matches.length, 1);
    assert.equal(body.matches[0].complaintId, existing._id.toString());
    assert.match(body.matches[0].reason, /glass entry door/i);
    assert.equal(body.matches[0].confidence, 0.91);
  });

  // ==========================================
  // Test 8: No duplicate result works correctly
  // ==========================================
  it('8. No duplicate result works correctly when issue is novel', async () => {
    await Complaint.create({
      title: 'Fountain pen ink spilled on carpet',
      description: 'Large blue stain on carpet near study cubicles.',
      category: 'CLEANING',
      priority: 'LOW',
      status: 'OPEN',
      building: 'Phase7B South Wing',
      floor: '4th Floor',
      room: 'Study Hall',
      reportedBy: ctx.student._id,
    });

    setMockDuplicateHandler(async () => {
      return {
        hasDuplicate: false,
        confidence: 0,
        matches: [],
      };
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        title: 'Defective emergency exit sign',
        description: 'Backlit emergency sign has gone completely dark.',
        category: 'SECURITY',
        building: 'Phase7B South Wing',
        floor: '4th Floor',
        room: 'Stairwell B',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.hasDuplicate, false);
    assert.equal(body.confidence, 0);
    assert.equal(body.matches.length, 0);
  });

  // ==========================================
  // Test 9: Invalid Gemini complaint IDs are rejected
  // ==========================================
  it('9. Invalid or hallucinated Gemini complaint IDs are safely rejected', async () => {
    const validComplaint = await Complaint.create({
      title: 'Elevator buttons unresponsive',
      description: 'Floor 3 button does not light up when pressed.',
      category: 'ELECTRICAL',
      priority: 'MEDIUM',
      status: 'OPEN',
      building: 'Phase7B Administrative Tower',
      floor: 'Ground Floor',
      room: 'Lift Lobby',
      reportedBy: ctx.student._id,
    });

    // Gemini hallucinating an ID that was NOT in the candidate set
    setMockDuplicateHandler(async () => {
      return {
        hasDuplicate: true,
        confidence: 0.85,
        matches: [
          {
            complaintId: '60d0fe4f5311236168a99999', // Hallucinated ID!
            reason: 'Similar elevator fault reported earlier.',
            confidence: 0.85,
          },
        ],
      };
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        title: 'Elevator button broken',
        description: 'Button 3 does not work in elevator.',
        building: 'Phase7B Administrative Tower',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    // Because the hallucinated ID was rejected, valid matches is empty -> hasDuplicate: false
    assert.equal(body.hasDuplicate, false);
    assert.equal(body.confidence, 0);
    assert.equal(body.matches.length, 0);
  });

  // ==========================================
  // Test 10: Gemini failure is handled safely
  // ==========================================
  it('10. Gemini failure is handled safely without crashing server', async () => {
    await Complaint.create({
      title: 'Water dispenser empty',
      description: 'Water cooler 2nd floor has run dry.',
      category: 'PLUMBING',
      priority: 'LOW',
      status: 'OPEN',
      building: 'Phase7B Campus Center',
      floor: '2nd Floor',
      room: 'Lounge',
      reportedBy: ctx.student._id,
    });

    setMockDuplicateHandler(async () => {
      throw new Error('503 Service Unavailable: Rate limit exceeded on AI cluster');
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        title: 'Water cooler dry',
        description: 'Need water bottle refill in campus center.',
        building: 'Phase7B Campus Center',
      }),
    });

    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /duplicate checking is temporarily unavailable/i);
    assert.equal(body.error, 'DUPLICATE_CHECK_UNAVAILABLE');
  });

  // ==========================================
  // Test 11: Sensitive student information is not returned
  // ==========================================
  it('11. Sensitive student information (email, password, phone) is never returned', async () => {
    const existing = await Complaint.create({
      title: 'Door handle loose',
      description: 'Door knob wobbles when turning.',
      category: 'FURNITURE',
      priority: 'LOW',
      status: 'OPEN',
      building: 'Phase7B West Hostel',
      floor: '1st Floor',
      room: 'Room 114',
      reportedBy: ctx.student._id,
    });

    setMockDuplicateHandler(async () => {
      return {
        hasDuplicate: true,
        confidence: 0.9,
        matches: [
          {
            complaintId: existing._id.toString(),
            reason: 'Same door handle issue.',
            confidence: 0.9,
          },
        ],
      };
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/check-duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        title: 'Loose door knob',
        description: 'Handle is loose in Room 114.',
        building: 'Phase7B West Hostel',
      }),
    });

    const responseText = await res.text();

    // Verify student's email, phone, and password hash are NOT leaked
    assert.ok(!responseText.includes(ctx.student.email), 'Student email leaked in duplicate response');
    assert.ok(!responseText.includes('Password123!'), 'Plain password leaked');
    assert.ok(!responseText.includes('reportedBy'), 'Internal reportedBy ObjectId leaked');
    assert.ok(!responseText.includes('password'), 'Password field leaked');
  });
});
