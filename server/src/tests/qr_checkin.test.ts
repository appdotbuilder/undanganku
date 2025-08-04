
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, packagesTable, invitationsTable, qrCheckinsTable } from '../db/schema';
import { type CreateQRCheckinInput } from '../schema';
import { getQRCheckinsByInvitation, createQRCheckin, generateQRCode } from '../handlers/qr_checkin';
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
  price: '99.99',
  features: '["basic_features"]',
  max_guests: 50,
  is_active: true
};

const testInvitation = {
  title: 'John & Jane Wedding',
  bride_name: 'Jane Doe',
  groom_name: 'John Smith',
  wedding_date: new Date('2024-06-15'),
  ceremony_time: null,
  ceremony_location: null,
  reception_time: null,
  reception_location: null,
  love_story: null,
  background_music_url: null,
  gallery_photos: '[]',
  gallery_videos: '[]',
  live_stream_url: null,
  rsvp_enabled: true,
  guest_book_enabled: true,
  digital_gift_enabled: true,
  qr_checkin_enabled: true,
  is_published: true,
  slug: 'john-jane-wedding',
  published_at: new Date()
};

describe('QR Check-in Handlers', () => {
  let userId: number;
  let templateId: number;
  let packageId: number;
  let invitationId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;

    const packageResult = await db.insert(packagesTable)
      .values(testPackage)
      .returning()
      .execute();
    packageId = packageResult[0].id;

    const invitationResult = await db.insert(invitationsTable)
      .values({
        ...testInvitation,
        user_id: userId,
        template_id: templateId,
        package_id: packageId
      })
      .returning()
      .execute();
    invitationId = invitationResult[0].id;
  });

  afterEach(resetDB);

  describe('getQRCheckinsByInvitation', () => {
    it('should return empty array when no check-ins exist', async () => {
      const result = await getQRCheckinsByInvitation(invitationId);

      expect(result).toEqual([]);
    });

    it('should return check-ins for specific invitation', async () => {
      // Create test check-in
      await db.insert(qrCheckinsTable)
        .values({
          invitation_id: invitationId,
          guest_name: 'Test Guest',
          qr_code: 'Test Guest|' + invitationId
        })
        .execute();

      const result = await getQRCheckinsByInvitation(invitationId);

      expect(result).toHaveLength(1);
      expect(result[0].invitation_id).toEqual(invitationId);
      expect(result[0].guest_name).toEqual('Test Guest');
      expect(result[0].qr_code).toEqual(`Test Guest|${invitationId}`);
      expect(result[0].check_in_time).toBeInstanceOf(Date);
      expect(result[0].id).toBeDefined();
    });

    it('should only return check-ins for specified invitation', async () => {
      // Create another invitation
      const anotherInvitation = await db.insert(invitationsTable)
        .values({
          ...testInvitation,
          user_id: userId,
          template_id: templateId,
          package_id: packageId,
          slug: 'another-wedding'
        })
        .returning()
        .execute();

      // Create check-ins for both invitations
      await db.insert(qrCheckinsTable)
        .values([
          {
            invitation_id: invitationId,
            guest_name: 'Guest 1',
            qr_code: 'Guest 1|' + invitationId
          },
          {
            invitation_id: anotherInvitation[0].id,
            guest_name: 'Guest 2',
            qr_code: 'Guest 2|' + anotherInvitation[0].id
          }
        ])
        .execute();

      const result = await getQRCheckinsByInvitation(invitationId);

      expect(result).toHaveLength(1);
      expect(result[0].guest_name).toEqual('Guest 1');
      expect(result[0].invitation_id).toEqual(invitationId);
    });
  });

  describe('createQRCheckin', () => {
    it('should create QR check-in successfully', async () => {
      const input: CreateQRCheckinInput = {
        invitation_id: invitationId,
        qr_code: `Test Guest|${invitationId}`
      };

      const result = await createQRCheckin(input);

      expect(result.invitation_id).toEqual(invitationId);
      expect(result.guest_name).toEqual('Test Guest');
      expect(result.qr_code).toEqual(`Test Guest|${invitationId}`);
      expect(result.check_in_time).toBeInstanceOf(Date);
      expect(result.id).toBeDefined();
    });

    it('should save check-in to database', async () => {
      const input: CreateQRCheckinInput = {
        invitation_id: invitationId,
        qr_code: `John Doe|${invitationId}`
      };

      const result = await createQRCheckin(input);

      const savedCheckin = await db.select()
        .from(qrCheckinsTable)
        .where(eq(qrCheckinsTable.id, result.id))
        .execute();

      expect(savedCheckin).toHaveLength(1);
      expect(savedCheckin[0].guest_name).toEqual('John Doe');
      expect(savedCheckin[0].invitation_id).toEqual(invitationId);
      expect(savedCheckin[0].qr_code).toEqual(`John Doe|${invitationId}`);
    });

    it('should throw error for non-existent invitation', async () => {
      const input: CreateQRCheckinInput = {
        invitation_id: 99999,
        qr_code: `Test Guest|99999`
      };

      expect(createQRCheckin(input)).rejects.toThrow(/invitation not found/i);
    });

    it('should throw error for invalid QR code format', async () => {
      const input: CreateQRCheckinInput = {
        invitation_id: invitationId,
        qr_code: 'invalid_format'
      };

      expect(createQRCheckin(input)).rejects.toThrow(/invalid qr code format/i);
    });

    it('should throw error for mismatched invitation ID in QR code', async () => {
      const input: CreateQRCheckinInput = {
        invitation_id: invitationId,
        qr_code: `Test Guest|${invitationId + 1}`
      };

      expect(createQRCheckin(input)).rejects.toThrow(/invalid qr code format/i);
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const result = await generateQRCode(invitationId, 'Test Guest');

      expect(result).toEqual(`Test Guest|${invitationId}`);
    });

    it('should generate different codes for different guests', async () => {
      const result1 = await generateQRCode(invitationId, 'Guest 1');
      const result2 = await generateQRCode(invitationId, 'Guest 2');

      expect(result1).toEqual(`Guest 1|${invitationId}`);
      expect(result2).toEqual(`Guest 2|${invitationId}`);
      expect(result1).not.toEqual(result2);
    });

    it('should throw error for non-existent invitation', async () => {
      expect(generateQRCode(99999, 'Test Guest')).rejects.toThrow(/invitation not found/i);
    });

    it('should handle special characters in guest names', async () => {
      const result = await generateQRCode(invitationId, 'José María');

      expect(result).toEqual(`José María|${invitationId}`);
    });
  });
});
