
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, packagesTable, invitationsTable, rsvpTable } from '../db/schema';
import { type CreateRSVPInput } from '../schema';
import { getRSVPsByInvitation, createRSVP, updateRSVP, deleteRSVP } from '../handlers/rsvp';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  phone: null,
  role: 'member' as const
};

const testTemplate = {
  name: 'Test Template',
  description: 'A template for testing',
  preview_image: null,
  template_data: '{"layout": "simple"}',
  is_active: true
};

const testPackage = {
  name: 'Basic Package',
  description: 'Basic wedding package',
  price: '199.99',
  features: '["feature1", "feature2"]',
  max_guests: 100,
  is_active: true
};

const testInvitation = {
  title: 'Our Wedding',
  bride_name: 'Jane',
  groom_name: 'John',
  wedding_date: new Date('2024-06-15'),
  ceremony_time: '10:00',
  ceremony_location: 'Church',
  reception_time: '18:00',
  reception_location: 'Hotel',
  love_story: null,
  background_music_url: null,
  gallery_photos: '[]',
  gallery_videos: '[]',
  live_stream_url: null,
  rsvp_enabled: true,
  guest_book_enabled: true,
  digital_gift_enabled: true,
  qr_checkin_enabled: false,
  is_published: true,
  slug: 'test-wedding-2024',
  published_at: new Date()
};

const testRSVPInput: CreateRSVPInput = {
  invitation_id: 1,
  guest_name: 'Test Guest',
  guest_email: 'guest@example.com',
  guest_phone: '1234567890',
  attendance_status: 'hadir',
  guest_count: 2,
  message: 'Looking forward to the wedding!'
};

describe('RSVP handlers', () => {
  let invitationId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    const user = await db.insert(usersTable).values(testUser).returning().execute();
    const template = await db.insert(templatesTable).values(testTemplate).returning().execute();
    const packageRecord = await db.insert(packagesTable).values(testPackage).returning().execute();

    const invitation = await db.insert(invitationsTable).values({
      ...testInvitation,
      user_id: user[0].id,
      template_id: template[0].id,
      package_id: packageRecord[0].id
    }).returning().execute();

    invitationId = invitation[0].id;
    testRSVPInput.invitation_id = invitationId;
  });

  afterEach(resetDB);

  describe('createRSVP', () => {
    it('should create an RSVP', async () => {
      const result = await createRSVP(testRSVPInput);

      expect(result.invitation_id).toEqual(invitationId);
      expect(result.guest_name).toEqual('Test Guest');
      expect(result.guest_email).toEqual('guest@example.com');
      expect(result.guest_phone).toEqual('1234567890');
      expect(result.attendance_status).toEqual('hadir');
      expect(result.guest_count).toEqual(2);
      expect(result.message).toEqual('Looking forward to the wedding!');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save RSVP to database', async () => {
      const result = await createRSVP(testRSVPInput);

      const rsvps = await db.select()
        .from(rsvpTable)
        .where(eq(rsvpTable.id, result.id))
        .execute();

      expect(rsvps).toHaveLength(1);
      expect(rsvps[0].guest_name).toEqual('Test Guest');
      expect(rsvps[0].attendance_status).toEqual('hadir');
      expect(rsvps[0].guest_count).toEqual(2);
    });

    it('should throw error for non-existent invitation', async () => {
      const invalidInput = { ...testRSVPInput, invitation_id: 9999 };

      await expect(createRSVP(invalidInput)).rejects.toThrow(/invitation not found/i);
    });

    it('should throw error when RSVP is disabled', async () => {
      // Disable RSVP for the invitation
      await db.update(invitationsTable)
        .set({ rsvp_enabled: false })
        .where(eq(invitationsTable.id, invitationId))
        .execute();

      await expect(createRSVP(testRSVPInput)).rejects.toThrow(/rsvp is not enabled/i);
    });
  });

  describe('getRSVPsByInvitation', () => {
    it('should return empty array when no RSVPs exist', async () => {
      const result = await getRSVPsByInvitation(invitationId);

      expect(result).toEqual([]);
    });

    it('should return RSVPs for invitation', async () => {
      // Create test RSVP
      await createRSVP(testRSVPInput);
      
      // Create another RSVP
      await createRSVP({
        ...testRSVPInput,
        guest_name: 'Another Guest',
        attendance_status: 'tidak_hadir'
      });

      const result = await getRSVPsByInvitation(invitationId);

      expect(result).toHaveLength(2);
      expect(result[0].guest_name).toEqual('Test Guest');
      expect(result[1].guest_name).toEqual('Another Guest');
      expect(result[0].invitation_id).toEqual(invitationId);
      expect(result[1].invitation_id).toEqual(invitationId);
    });
  });

  describe('updateRSVP', () => {
    it('should update RSVP', async () => {
      const rsvp = await createRSVP(testRSVPInput);

      const updateData = {
        guest_name: 'Updated Guest',
        attendance_status: 'tidak_hadir' as const,
        guest_count: 1
      };

      const result = await updateRSVP(rsvp.id, updateData);

      expect(result.id).toEqual(rsvp.id);
      expect(result.guest_name).toEqual('Updated Guest');
      expect(result.attendance_status).toEqual('tidak_hadir');
      expect(result.guest_count).toEqual(1);
      expect(result.guest_email).toEqual('guest@example.com'); // Should preserve unchanged fields
    });

    it('should throw error for non-existent RSVP', async () => {
      await expect(updateRSVP(9999, { guest_name: 'Test' })).rejects.toThrow(/rsvp not found/i);
    });

    it('should update only provided fields', async () => {
      const rsvp = await createRSVP(testRSVPInput);

      const result = await updateRSVP(rsvp.id, { guest_name: 'New Name' });

      expect(result.guest_name).toEqual('New Name');
      expect(result.attendance_status).toEqual('hadir'); // Should preserve original value
      expect(result.guest_count).toEqual(2); // Should preserve original value
    });
  });

  describe('deleteRSVP', () => {
    it('should delete RSVP', async () => {
      const rsvp = await createRSVP(testRSVPInput);

      const result = await deleteRSVP(rsvp.id);

      expect(result).toBe(true);

      // Verify RSVP is deleted
      const rsvps = await db.select()
        .from(rsvpTable)
        .where(eq(rsvpTable.id, rsvp.id))
        .execute();

      expect(rsvps).toHaveLength(0);
    });

    it('should throw error for non-existent RSVP', async () => {
      await expect(deleteRSVP(9999)).rejects.toThrow(/rsvp not found/i);
    });
  });
});
