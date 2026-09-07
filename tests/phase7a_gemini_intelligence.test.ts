import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupPhase7Environment, Phase7TestContext } from './testHelper.js';
import { setMockGeminiHandler } from '../server/services/geminiService.js';
import { ENV } from '../server/config/env.js';

describe('Phase 7A — AI-Powered Complaint Intelligence Suite', () => {
  let ctx: Phase7TestContext;

  before(async () => {
    ctx = await setupPhase7Environment();
  });

  after(async () => {
    setMockGeminiHandler(null);
    await ctx.cleanup();
  });

  beforeEach(() => {
    // Reset mock handler to default well-formed mock before each test
    setMockGeminiHandler(async (input) => {
      return {
        suggestedTitle: 'Sparking wall socket in Engineering Block',
        category: 'ELECTRICAL',
        priority: 'HIGH',
        departmentCode: 'ELEC',
        summary: 'Wall socket is vibrating and producing sparks when plugs are inserted.',
        suggestedAction: 'Isolate circuit breaker immediately and replace damaged receptacle.',
      };
    });
  });

  // ==========================================
  // Test 1: Authenticated student can request AI analysis
  // ==========================================
  it('1. Authenticated student can request AI analysis', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: 'The ceiling fan in Room 302 is vibrating violently and emitting a burning electrical smell.',
        building: 'Academic Block A',
        floor: '3rd Floor',
        room: 'Room 302',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data);
    assert.equal(body.data.category, 'ELECTRICAL');
    assert.equal(body.data.priority, 'HIGH');
    assert.equal(body.data.departmentCode, 'ELEC');
    assert.ok(body.data.suggestedTitle);
    assert.ok(body.data.summary);
    assert.ok(body.data.suggestedAction);
  });

  // ==========================================
  // Test 2: Unauthenticated request rejected
  // ==========================================
  it('2. Unauthenticated request rejected with 401', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Water leaking all over the classroom floor.',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /authentication required/i);
  });

  // ==========================================
  // Test 3: Empty description rejected
  // ==========================================
  it('3. Empty or too short description rejected with 400', async () => {
    // Empty description
    const resEmpty = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: '    ',
      }),
    });
    assert.equal(resEmpty.status, 400);
    const bodyEmpty = await resEmpty.json();
    assert.equal(bodyEmpty.success, false);

    // Less than 10 characters
    const resShort = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: 'Broken',
      }),
    });
    assert.equal(resShort.status, 400);
    const bodyShort = await resShort.json();
    assert.equal(bodyShort.success, false);
    assert.match(bodyShort.message, /at least 10 characters/i);
  });

  // ==========================================
  // Test 4: Excessively long description rejected
  // ==========================================
  it('4. Excessively long description (>2000 chars) rejected with 400', async () => {
    const longDescription = 'A'.repeat(2001);

    const res = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: longDescription,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /cannot exceed 2000 characters/i);
  });

  // ==========================================
  // Test 5: Valid AI response is correctly validated
  // ==========================================
  it('5. Valid AI response is correctly validated against enums', async () => {
    setMockGeminiHandler(async () => {
      return {
        suggestedTitle: 'Broken chair leg in dining hall',
        category: 'FURNITURE',
        priority: 'LOW',
        departmentCode: 'FACIL',
        summary: 'Wooden dining chair has a fractured leg.',
        suggestedAction: 'Tag chair out of service and remove to repair workshop.',
      };
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: 'A wooden dining chair has cracked near the joint in Campus Dining Hall.',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.category, 'FURNITURE');
    assert.equal(body.data.priority, 'LOW');
    assert.equal(body.data.departmentCode, 'FACIL');
    assert.equal(body.data.suggestedTitle, 'Broken chair leg in dining hall');
  });

  // ==========================================
  // Test 6: Invalid AI category is rejected/sanitized
  // ==========================================
  it('6. Invalid AI category is rejected/sanitized to valid enum', async () => {
    setMockGeminiHandler(async () => {
      return {
        suggestedTitle: 'Unknown facility issue',
        category: 'MAGIC_SPELL_FAILURE', // Invalid category hallucination
        priority: 'MEDIUM',
        departmentCode: 'FACIL',
        summary: 'Strange issue occurred.',
        suggestedAction: 'Investigate problem.',
      };
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: 'Strange humming noise coming from somewhere behind the corridor wall.',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    // Must be sanitized to allowed enum value (e.g. 'OTHER')
    assert.equal(body.data.category, 'OTHER');
  });

  // ==========================================
  // Test 7: Invalid AI priority is rejected/sanitized
  // ==========================================
  it('7. Invalid AI priority is rejected/sanitized to valid enum', async () => {
    setMockGeminiHandler(async () => {
      return {
        suggestedTitle: 'Sink faucet dripping',
        category: 'PLUMBING',
        priority: 'ULTRA_MEGA_URGENT', // Invalid priority hallucination
        departmentCode: 'PLUMB',
        summary: 'Faucet dripping in 1st floor washroom.',
        suggestedAction: 'Replace washer cartridge in tap valve.',
      };
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: 'The tap in the ground floor restroom keeps dripping continuously.',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    // Must be sanitized to allowed priority value (e.g. 'MEDIUM')
    assert.equal(body.data.priority, 'MEDIUM');
    assert.equal(body.data.category, 'PLUMBING');
  });

  // ==========================================
  // Test 8: Gemini API failure is handled safely
  // ==========================================
  it('8. Gemini API failure is handled safely without crashing server', async () => {
    setMockGeminiHandler(async () => {
      throw new Error('503 Service Unavailable: Gemini model overloaded');
    });

    const res = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: 'Projector in Science Hall does not turn on when pressing remote.',
      }),
    });

    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /AI analysis is currently unavailable/i);
  });

  // ==========================================
  // Test 9: GEMINI_API_KEY is never returned to frontend
  // ==========================================
  it('9. GEMINI_API_KEY is never returned in response payload or error message', async () => {
    // Test on successful response
    const successRes = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: 'Wi-Fi access point in library keeps disconnecting every few minutes.',
      }),
    });

    const successText = await successRes.text();
    const currentKey = ENV.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (currentKey && currentKey.length > 5) {
      assert.ok(!successText.includes(currentKey), 'Key leaked in success response');
    }
    assert.ok(!successText.toLowerCase().includes('gemini_api_key'));

    // Test on error response
    setMockGeminiHandler(async () => {
      throw new Error('Authentication failure: invalid credentials for upstream provider');
    });

    const errorRes = await fetch(`${ctx.baseUrl}/api/ai/analyze-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.student.token}`,
      },
      body: JSON.stringify({
        description: 'Air conditioning not working in lab 204.',
      }),
    });

    const errorText = await errorRes.text();
    if (currentKey && currentKey.length > 5) {
      assert.ok(!errorText.includes(currentKey), 'Key leaked in error response');
    }
  });
});
