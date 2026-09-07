import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupTestEnvironment,
  TestContext,
  VALID_JPEG_BUFFER,
  VALID_PNG_BUFFER,
  VALID_WEBP_BUFFER,
  INVALID_MAGIC_BYTES_BUFFER,
  OVERSIZED_BUFFER,
} from './testHelper.js';
import { Complaint } from '../server/models/Complaint.js';

describe('Phase 5 — Cloudinary Image Uploads & Validation Suite', () => {
  let ctx: TestContext;

  before(async () => {
    ctx = await setupTestEnvironment();
  });

  after(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    ctx.mockCloudinary.reset();
  });

  // Helper to create a base complaint payload
  const createBaseFormData = () => {
    const fd = new FormData();
    fd.append('title', 'Ceiling Light Flickering in Physics Lab');
    fd.append('description', 'The overhead fluorescent tube in room 302 is flickering constantly and buzzing.');
    fd.append('category', 'ELECTRICAL');
    fd.append('priority', 'HIGH');
    fd.append('building', 'Science Complex A');
    fd.append('floor', '3');
    fd.append('room', 'Lab 302');
    return fd;
  };

  // Helper to create a complaint in MongoDB
  const seedComplaint = async (opts: {
    reportedBy: any;
    status?: any;
    assignedTo?: any;
    images?: Array<{ url: string; publicId: string }>;
  }) => {
    return await Complaint.create({
      title: 'Lab 302 Power Outlet Damaged',
      description: 'The wall outlet is sparking when plugging in microscope power adapters.',
      category: 'ELECTRICAL',
      priority: 'CRITICAL',
      status: opts.status || 'OPEN',
      building: 'Science Complex A',
      floor: '3',
      room: 'Lab 302',
      reportedBy: opts.reportedBy._id,
      assignedTo: opts.assignedTo ? opts.assignedTo._id : undefined,
      images: opts.images || [],
      resolutionImages: [],
      statusHistory: [
        {
          status: opts.status || 'OPEN',
          changedBy: opts.reportedBy._id,
          timestamp: new Date(),
          comment: 'Initial issue reported',
        },
      ],
    });
  };

  // 1. Student creates complaint without images
  it('1. Student creates complaint without images', async () => {
    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: JSON.stringify({
        title: 'Broken chair leg in Study Hall',
        description: 'One chair in the study corner has a wobbly and fractured wooden leg.',
        category: 'FURNITURE',
        priority: 'LOW',
        building: 'Library & Media Center',
        floor: '2',
        room: 'Study Hall B',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data?.complaint?._id);
    assert.equal(body.data.complaint.images.length, 0);
    assert.equal(body.data.complaint.status, 'OPEN');
  });

  // 2. Student creates complaint with 1 valid JPEG image
  it('2. Student creates complaint with 1 valid JPEG image', async () => {
    const fd = createBaseFormData();
    fd.append('images', new File([VALID_JPEG_BUFFER], 'outlet_burn.jpg', { type: 'image/jpeg' }));

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.complaint.images.length, 1);
    assert.ok(body.data.complaint.images[0].url.startsWith('https://res.cloudinary.com/'));
    assert.ok(body.data.complaint.images[0].publicId.length > 0);
  });

  // 3. Student creates complaint with multiple valid images
  it('3. Student creates complaint with multiple valid images', async () => {
    const fd = createBaseFormData();
    fd.append('images', new File([VALID_JPEG_BUFFER], 'angle1.jpg', { type: 'image/jpeg' }));
    fd.append('images', new File([VALID_PNG_BUFFER], 'angle2.png', { type: 'image/png' }));
    fd.append('images', new File([VALID_WEBP_BUFFER], 'angle3.webp', { type: 'image/webp' }));

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.complaint.images.length, 3);
    for (const img of body.data.complaint.images) {
      assert.ok(img.url);
      assert.ok(img.publicId);
    }
  });

  // 4. More than 5 images are rejected
  it('4. More than 5 images are rejected', async () => {
    const fd = createBaseFormData();
    for (let i = 1; i <= 6; i++) {
      fd.append('images', new File([VALID_JPEG_BUFFER], `extra_${i}.jpg`, { type: 'image/jpeg' }));
    }

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Maximum 5 images can be attached/i);
  });

  // 5. Image larger than 5 MB is rejected
  it('5. Image larger than 5 MB is rejected', async () => {
    const fd = createBaseFormData();
    fd.append('images', new File([OVERSIZED_BUFFER], 'giant_photo.jpg', { type: 'image/jpeg' }));

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /5 MB maximum size limit/i);
  });

  // 6. Invalid MIME type is rejected
  it('6. Invalid MIME type is rejected', async () => {
    const fd = createBaseFormData();
    fd.append(
      'images',
      new File([Buffer.from('%PDF-1.4 PDF file content')], 'document.pdf', { type: 'application/pdf' })
    );

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Only JPEG, PNG, and WebP images are permitted/i);
  });

  // 7. Invalid file extension is rejected
  it('7. Invalid file extension is rejected', async () => {
    const fd = createBaseFormData();
    fd.append('images', new File([VALID_JPEG_BUFFER], 'malicious.exe', { type: 'image/jpeg' }));

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Only \.jpg, \.jpeg, \.png, and \.webp files are allowed/i);
  });

  // 8. Invalid/mismatched binary magic bytes are rejected
  it('8. Invalid/mismatched binary magic bytes are rejected', async () => {
    const fd = createBaseFormData();
    fd.append(
      'images',
      new File([INVALID_MAGIC_BYTES_BUFFER], 'disguised.jpg', { type: 'image/jpeg' })
    );

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /invalid or disguised image signature/i);
  });

  // 9. Unauthorized student cannot upload/modify images to another student's complaint
  it("9. Unauthorized student cannot modify/remove images on another student's complaint", async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      images: [{ url: 'https://res.cloudinary.com/test/img1.jpg', publicId: 'cld_alice_img1' }],
    });

    // Student B attempts to remove image from Student A's complaint
    const res = await fetch(`${ctx.baseUrl}/api/complaints/${complaint._id}/remove-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.studentB.token}`,
      },
      body: JSON.stringify({ publicId: 'cld_alice_img1' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Forbidden: You cannot modify images on a complaint filed by another student/i);
  });

  // 10. Technician can upload resolution images only to their assigned task
  it('10. Technician can upload resolution images only to their assigned task', async () => {
    const task = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'IN_PROGRESS',
      assignedTo: ctx.technicianA,
    });

    const fd = new FormData();
    fd.append('resolutionNotes', 'Replaced faulty 16A circuit breaker and tested voltage.');
    fd.append(
      'resolutionImages',
      new File([VALID_PNG_BUFFER], 'repair_finished.png', { type: 'image/png' })
    );

    const res = await fetch(`${ctx.baseUrl}/api/technician/tasks/${task._id}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.technicianA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.complaint.status, 'RESOLVED');
    assert.equal(body.data.complaint.resolutionImages.length, 1);
    assert.ok(body.data.complaint.resolutionImages[0].url.startsWith('https://res.cloudinary.com/'));
    assert.ok(body.data.complaint.resolvedAt);
  });

  // 11. Technician cannot upload resolution images to another technician's task
  it("11. Technician cannot upload resolution images to another technician's task", async () => {
    const task = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'IN_PROGRESS',
      assignedTo: ctx.technicianA,
    });

    const fd = new FormData();
    fd.append('resolutionNotes', 'Attempting unauthorized completion');
    fd.append(
      'resolutionImages',
      new File([VALID_JPEG_BUFFER], 'photo.jpg', { type: 'image/jpeg' })
    );

    // Technician B attempts to resolve Technician A's task
    const res = await fetch(`${ctx.baseUrl}/api/technician/tasks/${task._id}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.technicianB.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Forbidden: You cannot modify tasks assigned to another technician/i);
  });

  // 12. Technician resolution requires valid IN_PROGRESS workflow
  it('12. Technician resolution requires valid IN_PROGRESS workflow', async () => {
    // Task is in ASSIGNED status (not yet IN_PROGRESS)
    const task = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'ASSIGNED',
      assignedTo: ctx.technicianA,
    });

    const fd = new FormData();
    fd.append('resolutionNotes', 'Trying to resolve without beginning work');
    fd.append(
      'resolutionImages',
      new File([VALID_JPEG_BUFFER], 'premature.jpg', { type: 'image/jpeg' })
    );

    const res = await fetch(`${ctx.baseUrl}/api/technician/tasks/${task._id}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.technicianA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Tasks must be marked as 'IN_PROGRESS' before resolving/i);
  });

  // 13. More than 5 resolution images are rejected
  it('13. More than 5 resolution images are rejected', async () => {
    const task = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'IN_PROGRESS',
      assignedTo: ctx.technicianA,
    });

    const fd = new FormData();
    fd.append('resolutionNotes', 'Completed heavy rewiring');
    for (let i = 1; i <= 6; i++) {
      fd.append(
        'resolutionImages',
        new File([VALID_PNG_BUFFER], `res_${i}.png`, { type: 'image/png' })
      );
    }

    const res = await fetch(`${ctx.baseUrl}/api/technician/tasks/${task._id}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${ctx.technicianA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Maximum 5 resolution images can be attached/i);
  });

  // 14. Cloudinary upload failure is handled safely
  it('14. Cloudinary upload failure is handled safely', async () => {
    ctx.mockCloudinary.setShouldFail(true);

    const failTitle = `Crash Test Failure ${Date.now()}`;
    const fd = createBaseFormData();
    fd.set('title', failTitle);
    fd.append('images', new File([VALID_JPEG_BUFFER], 'crash_test.jpg', { type: 'image/jpeg' }));

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Failed to upload evidence images/i);

    // Verify no complaint was created in MongoDB with this title
    const count = await Complaint.countDocuments({ title: failTitle });
    assert.equal(count, 0);
  });

  // 15. Database failure after Cloudinary upload triggers rollback cleanup
  it('15. Database failure after Cloudinary upload triggers rollback cleanup', async () => {
    const task = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'IN_PROGRESS',
      assignedTo: ctx.technicianA,
    });

    // Temporarily cause complaint.save() to throw
    const originalSave = Complaint.prototype.save;
    Complaint.prototype.save = async function () {
      throw new Error('Simulated Database Write Failure during Task Resolution');
    };

    try {
      const fd = new FormData();
      fd.append('resolutionNotes', 'Fixed cable terminal');
      fd.append(
        'resolutionImages',
        new File([VALID_WEBP_BUFFER], 'rollback_test.webp', { type: 'image/webp' })
      );

      const res = await fetch(`${ctx.baseUrl}/api/technician/tasks/${task._id}/resolve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ctx.technicianA.token}`,
        },
        body: fd,
      });

      assert.equal(res.status, 500);
      // Verify rollback cleanup triggered delete on Cloudinary
      assert.ok(ctx.mockCloudinary.getDestroyedIds().length >= 1);
    } finally {
      Complaint.prototype.save = originalSave;
    }
  });

  // 16. OPEN complaint deletion triggers Cloudinary cleanup
  it('16. OPEN complaint deletion triggers Cloudinary cleanup', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'OPEN',
      images: [
        { url: 'https://res.cloudinary.com/test/photo1.jpg', publicId: 'cld_cleanup_1' },
        { url: 'https://res.cloudinary.com/test/photo2.jpg', publicId: 'cld_cleanup_2' },
      ],
    });

    const res = await fetch(`${ctx.baseUrl}/api/complaints/${complaint._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Wait a brief moment for async cleanup
    await new Promise((r) => setTimeout(r, 50));

    const destroyed = ctx.mockCloudinary.getDestroyedIds();
    assert.ok(destroyed.includes('cld_cleanup_1'));
    assert.ok(destroyed.includes('cld_cleanup_2'));
  });

  // 17. Individual complaint image removal deletes the Cloudinary asset
  it('17. Individual complaint image removal deletes the Cloudinary asset', async () => {
    const complaint = await seedComplaint({
      reportedBy: ctx.studentA,
      status: 'OPEN',
      images: [
        { url: 'https://res.cloudinary.com/test/keep.jpg', publicId: 'cld_keep_this' },
        { url: 'https://res.cloudinary.com/test/delete.jpg', publicId: 'cld_remove_this' },
      ],
    });

    const res = await fetch(`${ctx.baseUrl}/api/complaints/${complaint._id}/remove-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: JSON.stringify({ publicId: 'cld_remove_this' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.complaint.images.length, 1);
    assert.equal(body.data.complaint.images[0].publicId, 'cld_keep_this');

    // Verify Cloudinary destroy was called for the removed asset
    const destroyed = ctx.mockCloudinary.getDestroyedIds();
    assert.ok(destroyed.includes('cld_remove_this'));
  });

  // 18. Uploaded image metadata correctly stores url and publicId
  it('18. Uploaded image metadata correctly stores url and publicId', async () => {
    const fd = createBaseFormData();
    fd.append('images', new File([VALID_JPEG_BUFFER], 'metadata_check.jpg', { type: 'image/jpeg' }));

    const res = await fetch(`${ctx.baseUrl}/api/complaints`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.studentA.token}`,
      },
      body: fd,
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    const createdId = body.data.complaint._id;

    // Direct database inspection
    const stored = await Complaint.findById(createdId);
    assert.ok(stored);
    assert.equal(stored.images.length, 1);

    const img = stored.images[0];
    assert.ok(typeof img.url === 'string' && img.url.startsWith('https://res.cloudinary.com/'));
    assert.ok(typeof img.publicId === 'string' && img.publicId.length > 5);
  });
});
