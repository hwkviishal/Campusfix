import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { setupPhase6Environment, Phase6TestContext } from './testHelper.js';
import { Complaint } from '../server/models/Complaint.js';
import { Notification } from '../server/models/Notification.js';
import { Comment } from '../server/models/Comment.js';

describe('Phase 6 — Real-Time Notifications & Complaint Communication Suite', () => {
  let ctx: Phase6TestContext;

  before(async () => {
    ctx = await setupPhase6Environment();
  });

  after(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
    await Comment.deleteMany({});
    await Complaint.deleteMany({});
  });

  // Helper to create a base test complaint
  const seedComplaint = async (opts: {
    reportedBy: any;
    status?: any;
    assignedTo?: any;
    priority?: any;
  }) => {
    return await Complaint.create({
      title: 'Lab 101 AC Leaking Water',
      description: 'Water is dripping from the wall AC unit onto student desks.',
      category: 'PLUMBING',
      priority: opts.priority || 'MEDIUM',
      status: opts.status || 'OPEN',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      reportedBy: opts.reportedBy._id,
      assignedTo: opts.assignedTo ? opts.assignedTo._id : undefined,
    });
  };

  // ==========================================
  // Test 1: Student creates complaint -> Notification generated
  // ==========================================
  it('1. Student creates complaint -> notification is generated for student', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: JSON.stringify({
        title: 'Broken projector in Hall B',
        description: 'Projector displays a red tint and buzzes loudly during lectures.',
        category: 'CLASSROOM_EQUIPMENT',
        priority: 'HIGH',
        building: 'Lecture Center',
        floor: '2',
        room: 'Hall B',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 201, `Failed to create complaint: ${JSON.stringify(data)}`);
    const complaintId = data.data.complaint._id;

    // Verify Notification document created for studentA
    const notifs = await Notification.find({ recipient: ctx.studentA._id });
    assert.equal(notifs.length, 1, 'Expected 1 notification for student');
    assert.equal(notifs[0].type, 'COMPLAINT_CREATED');
    assert.equal(notifs[0].relatedComplaint.toString(), complaintId);
    assert.equal(notifs[0].isRead, false);
  });

  // ==========================================
  // Test 2: Admin assigns complaint -> Technician receives notification
  // ==========================================
  it('2. Admin assigns complaint -> technician receives notification', async () => {
    const complaint = await seedComplaint({ reportedBy: ctx.studentA });

    const res = await fetch(`${ctx.baseUrl}/api/admin/complaints/${complaint._id}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.admin.token}`,
      },
      body: JSON.stringify({
        technicianId: ctx.technicianA._id.toString(),
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200, `Assign failed: ${JSON.stringify(data)}`);

    // Verify notification for technicianA
    const techNotifs = await Notification.find({
      recipient: ctx.technicianA._id,
      type: 'COMPLAINT_ASSIGNED',
    });
    assert.equal(techNotifs.length, 1, 'Technician should receive COMPLAINT_ASSIGNED notification');
    assert.equal(techNotifs[0].relatedComplaint.toString(), complaint._id.toString());
  });

  // ==========================================
  // Test 3: Admin assigns complaint -> Student receives notification
  // ==========================================
  it('3. Admin assigns complaint -> student receives assignment notification', async () => {
    const complaint = await seedComplaint({ reportedBy: ctx.studentA });

    await fetch(`${ctx.baseUrl}/api/admin/complaints/${complaint._id}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.admin.token}`,
      },
      body: JSON.stringify({
        technicianId: ctx.technicianA._id.toString(),
      }),
    });

    // Verify notification for studentA (COMPLAINT_ASSIGNED)
    const studentNotifs = await Notification.find({
      recipient: ctx.studentA._id,
      type: 'COMPLAINT_ASSIGNED',
    });
    assert.equal(studentNotifs.length, 1, 'Student should receive assignment notification');
    assert.ok(
      studentNotifs[0].message.includes('assigned'),
      'Notification message should mention assigned technician'
    );
  });

  // ==========================================
  // Test 4: Technician starts task -> Student receives status changed notification
  // ==========================================
  it('4. Technician starts task -> student receives status changed notification', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'ASSIGNED',
      assignedTo: ctx.technicianA,
    });

    const res = await fetch(`${ctx.baseUrl}/api/technician/tasks/${complaint._id}/start`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.technicianA.token}`,
      },
    });
    assert.equal(res.status, 200);

    const studentNotifs = await Notification.find({
      recipient: ctx.studentA._id,
      type: 'STATUS_CHANGED',
    });
    assert.ok(studentNotifs.length >= 1);
    const inProgressNotif = studentNotifs.find(
      (n) => n.title.includes('Started') || n.message.includes('work') || n.message.includes('begun')
    );
    assert.ok(inProgressNotif, 'Expected notification mentioning maintenance work started');
  });

  // ==========================================
  // Test 5: Technician resolves task -> Student receives resolved notification
  // ==========================================
  it('5. Technician resolves task -> student receives resolved notification', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'IN_PROGRESS',
      assignedTo: ctx.technicianA,
    });

    const res = await fetch(`${ctx.baseUrl}/api/technician/tasks/${complaint._id}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.technicianA.token}`,
      },
      body: JSON.stringify({
        resolutionNotes: 'Replaced copper pipe gasket and tightened leaking valve.',
      }),
    });
    assert.equal(res.status, 200);

    const studentNotifs = await Notification.find({
      recipient: ctx.studentA._id,
      type: 'COMPLAINT_RESOLVED',
    });
    assert.equal(studentNotifs.length, 1, 'Expected COMPLAINT_RESOLVED notification for student');
    assert.ok(studentNotifs[0].message.includes('resolved'));
  });

  // ==========================================
  // Test 6: Admin updates priority -> Student receives priority changed notification
  // ==========================================
  it('6. Admin updates complaint priority -> student receives notification', async () => {
    const complaint = await seedComplaint({ reportedBy: ctx.studentA, priority: 'LOW' });

    const res = await fetch(`${ctx.baseUrl}/api/admin/complaints/${complaint._id}/priority`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.admin.token}`,
      },
      body: JSON.stringify({
        priority: 'CRITICAL',
      }),
    });
    assert.equal(res.status, 200);

    const studentNotifs = await Notification.find({
      recipient: ctx.studentA._id,
      type: 'PRIORITY_CHANGED',
    });
    assert.equal(studentNotifs.length, 1, 'Student should receive PRIORITY_CHANGED notification');
    assert.ok(studentNotifs[0].message.includes('CRITICAL'));
  });

  // ==========================================
  // Test 7: Student adds comment -> Assigned technician and admin receive notification
  // ==========================================
  it('7. Student adds comment -> assigned technician and admin receive notification', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      assignedTo: ctx.technicianA,
      status: 'ASSIGNED',
    });

    const res = await fetch(`${ctx.baseUrl}/api/comments/complaint/${complaint._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: JSON.stringify({
        message: 'Could the technician please bring a ladder?',
      }),
    });
    assert.equal(res.status, 201);

    // Technician should receive notification
    const techNotifs = await Notification.find({
      recipient: ctx.technicianA._id,
      type: 'COMMENT_ADDED',
    });
    assert.equal(techNotifs.length, 1, 'Assigned technician should receive comment notification');

    // Admin should receive notification
    const adminNotifs = await Notification.find({
      recipient: ctx.admin._id,
      type: 'COMMENT_ADDED',
    });
    assert.equal(adminNotifs.length, 1, 'Admin should receive comment notification');
  });

  // ==========================================
  // Test 8: Technician adds public comment -> Student receives comment notification
  // ==========================================
  it('8. Technician adds public comment -> student receives comment notification', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      assignedTo: ctx.technicianA,
      status: 'ASSIGNED',
    });

    const res = await fetch(`${ctx.baseUrl}/api/comments/complaint/${complaint._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.technicianA.token}`,
      },
      body: JSON.stringify({
        message: 'I will be arriving at 2:00 PM with the replacement parts.',
        isInternal: false,
      }),
    });
    assert.equal(res.status, 201);

    // Student should receive notification
    const studentNotifs = await Notification.find({
      recipient: ctx.studentA._id,
      type: 'COMMENT_ADDED',
    });
    assert.equal(studentNotifs.length, 1, 'Student should receive comment notification');
  });

  // ==========================================
  // Test 9: Technician adds internal note -> Student does NOT receive notification
  // ==========================================
  it('9. Technician adds internal note -> student does NOT receive notification', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      assignedTo: ctx.technicianA,
      status: 'ASSIGNED',
    });

    const res = await fetch(`${ctx.baseUrl}/api/comments/complaint/${complaint._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.technicianA.token}`,
      },
      body: JSON.stringify({
        message: 'Internal note: Substation breaker needs replacement before testing.',
        isInternal: true,
      }),
    });
    assert.equal(res.status, 201);

    // Student MUST NOT receive any notification
    const studentNotifs = await Notification.find({
      recipient: ctx.studentA._id,
      type: 'COMMENT_ADDED',
    });
    assert.equal(studentNotifs.length, 0, 'Student must not receive internal note notification');

    // Admin SHOULD receive notification
    const adminNotifs = await Notification.find({
      recipient: ctx.admin._id,
      type: 'COMMENT_ADDED',
    });
    assert.equal(adminNotifs.length, 1, 'Admin should receive notification for internal comment');
  });

  // ==========================================
  // Test 10: Student cannot view internal comments
  // ==========================================
  it('10. Student cannot view internal comments in GET /api/comments', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      assignedTo: ctx.technicianA,
      status: 'ASSIGNED',
    });

    // Create 1 public comment and 1 internal note
    await Comment.create({
      complaint: complaint._id,
      author: ctx.technicianA._id,
      message: 'Public message visible to student',
      isInternal: false,
    });
    await Comment.create({
      complaint: complaint._id,
      author: ctx.technicianA._id,
      message: 'Private staff note hidden from student',
      isInternal: true,
    });

    const res = await fetch(`${ctx.baseUrl}/api/comments/complaint/${complaint._id}`, {
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
    });
    const data = await res.json();
    assert.equal(res.status, 200);

    const comments = data.data.comments;
    assert.equal(comments.length, 1, 'Student should only see 1 comment');
    assert.equal(comments[0].message, 'Public message visible to student');
    assert.equal(comments[0].isInternal, false);
  });

  // ==========================================
  // Test 11: Admin can view both public and internal comments
  // ==========================================
  it('11. Admin can view both public and internal comments', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      assignedTo: ctx.technicianA,
      status: 'ASSIGNED',
    });

    await Comment.create({
      complaint: complaint._id,
      author: ctx.technicianA._id,
      message: 'Public note',
      isInternal: false,
    });
    await Comment.create({
      complaint: complaint._id,
      author: ctx.technicianA._id,
      message: 'Internal staff note',
      isInternal: true,
    });

    const res = await fetch(`${ctx.baseUrl}/api/comments/complaint/${complaint._id}`, {
      headers: {
        Authorization: `Bearer ${ctx.admin.token}`,
      },
    });
    const data = await res.json();
    assert.equal(res.status, 200);

    const comments = data.data.comments;
    assert.equal(comments.length, 2, 'Admin should see both public and internal comments');
  });

  // ==========================================
  // Test 12: Technician can view both public and internal comments
  // ==========================================
  it('12. Technician can view both public and internal comments', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      assignedTo: ctx.technicianA,
      status: 'ASSIGNED',
    });

    await Comment.create({
      complaint: complaint._id,
      author: ctx.technicianA._id,
      message: 'Public note',
      isInternal: false,
    });
    await Comment.create({
      complaint: complaint._id,
      author: ctx.technicianA._id,
      message: 'Internal staff note',
      isInternal: true,
    });

    const res = await fetch(`${ctx.baseUrl}/api/comments/complaint/${complaint._id}`, {
      headers: {
        Authorization: `Bearer ${ctx.technicianA.token}`,
      },
    });
    const data = await res.json();
    assert.equal(res.status, 200);

    const comments = data.data.comments;
    assert.equal(comments.length, 2, 'Technician should see both comments');
  });

  // ==========================================
  // Test 13: Student cannot add internal comments (rejected with 403)
  // ==========================================
  it('13. Student cannot add internal comments (rejected with 403)', async () => {
    const complaint = await seedComplaint({ reportedBy: ctx.studentA });

    const res = await fetch(`${ctx.baseUrl}/api/comments/complaint/${complaint._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: JSON.stringify({
        message: 'Trying to sneak an internal note as student',
        isInternal: true,
      }),
    });
    assert.equal(res.status, 403, 'Students cannot create internal notes');
  });

  // ==========================================
  // Test 14: Non-member student cannot comment on another student's complaint
  // ==========================================
  it("14. Non-member student cannot comment on another student's complaint (403 forbidden)", async () => {
    const complaint = await seedComplaint({ reportedBy: ctx.studentA });

    const res = await fetch(`${ctx.baseUrl}/api/comments/complaint/${complaint._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.studentB.token}`, // studentB is NOT the reporter
      },
      body: JSON.stringify({
        message: 'I am an unrelated student trying to post here',
      }),
    });
    assert.equal(res.status, 403, 'Expected 403 Forbidden for unauthorized student');
  });

  // ==========================================
  // Test 15: Notification list endpoint returns user's notifications and unreadCount
  // ==========================================
  it("15. GET /api/notifications returns user's notifications with correct unread count", async () => {
    const complaint = await seedComplaint({ reportedBy: ctx.studentA });

    await Notification.create({
      recipient: ctx.studentA._id,
      type: 'STATUS_CHANGED',
      title: 'Status Updated',
      message: 'Status was changed to ASSIGNED',
      relatedComplaint: complaint._id,
      isRead: false,
    });
    await Notification.create({
      recipient: ctx.studentA._id,
      type: 'COMMENT_ADDED',
      title: 'New Comment',
      message: 'A new comment was posted',
      relatedComplaint: complaint._id,
      isRead: true,
    });

    const res = await fetch(`${ctx.baseUrl}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.notifications.length, 2);
    assert.equal(data.data.unreadCount, 1, 'Expected unread count of 1');
  });

  // ==========================================
  // Test 16: Mark single notification as read
  // ==========================================
  it('16. PATCH /api/notifications/:id/read marks single notification as read', async () => {
    const complaint = await seedComplaint({ reportedBy: ctx.studentA });

    const notif = await Notification.create({
      recipient: ctx.studentA._id,
      type: 'STATUS_CHANGED',
      title: 'Status Updated',
      message: 'Status was changed to ASSIGNED',
      relatedComplaint: complaint._id,
      isRead: false,
    });

    const res = await fetch(`${ctx.baseUrl}/api/notifications/${notif._id}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.notification.isRead, true);

    const updated = await Notification.findById(notif._id);
    assert.equal(updated?.isRead, true);
  });

  // ==========================================
  // Test 17: Mark all notifications as read
  // ==========================================
  it('17. PATCH /api/notifications/read-all marks all user notifications as read', async () => {
    const complaint = await seedComplaint({ reportedBy: ctx.studentA });

    await Notification.create([
      {
        recipient: ctx.studentA._id,
        type: 'STATUS_CHANGED',
        title: 'Status 1',
        message: 'Message 1',
        relatedComplaint: complaint._id,
        isRead: false,
      },
      {
        recipient: ctx.studentA._id,
        type: 'STATUS_CHANGED',
        title: 'Status 2',
        message: 'Message 2',
        relatedComplaint: complaint._id,
        isRead: false,
      },
    ]);

    const res = await fetch(`${ctx.baseUrl}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.unreadCount, 0);

    const unreadCountInDb = await Notification.countDocuments({
      recipient: ctx.studentA._id,
      isRead: false,
    });
    assert.equal(unreadCountInDb, 0);
  });

  // ==========================================
  // Test 18: Socket authentication & real-time connection
  // ==========================================
  it('18. Socket authentication: valid JWT connects and joins user room; invalid token is rejected', async () => {
    // 1. Valid authentication test
    const validSocket: ClientSocketType = ClientSocket(ctx.baseUrl, {
      auth: { token: ctx.studentA.token },
      transports: ['websocket'],
    });

    const connected = await new Promise<boolean>((resolve) => {
      validSocket.on('connect', () => resolve(true));
      validSocket.on('connect_error', () => resolve(false));
    });

    assert.equal(connected, true, 'Socket should successfully connect with valid JWT');
    validSocket.disconnect();

    // 2. Invalid authentication test
    const invalidSocket: ClientSocketType = ClientSocket(ctx.baseUrl, {
      auth: { token: 'invalid.forged.jwt.token' },
      transports: ['websocket'],
    });

    const errorReceived = await new Promise<boolean>((resolve) => {
      invalidSocket.on('connect', () => resolve(false));
      invalidSocket.on('connect_error', (err) => {
        resolve(true);
      });
    });

    assert.equal(errorReceived, true, 'Socket connection with invalid JWT should be rejected');
    invalidSocket.disconnect();
  });
});
