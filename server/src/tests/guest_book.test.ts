
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, packagesTable, invitationsTable, guestBookTable } from '../db/schema';
import { type CreateGuestBookInput } from '../schema';
import { getGuestBookByInvitation, createGuestBookEntry, deleteGuestBookEntry } from '../handlers/guest_book';
import { eq } from 'drizzle-orm';

// Test data
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
  template_data: '{}',
  is_active: true
};

const testPackage = {
  name: 'Test Package',
  description: 'A package for testing',
  price: '99.99',
  features: '["feature1", "feature2"]',
  max_guests: 100,
  is_active: true
};

const testInvitation = {
  title: 'Test Wedding',
  bride_name: 'Jane',
  groom_name: 'John',
  wedding_date: new Date('2024-12-25'),
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
  qr_checkin_enabled: false,
  is_published: false,
  slug: 'test-wedding-123',
  published_at: null
};

let userId: number;
let templateId: number;
let packageId: number;
let invitationId: number;

describe('Guest Book Handlers', () => {
  beforeEach(async () => {
    await createDB();

    // Create user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create template
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;

    // Create package
    const packageResult = await db.insert(packagesTable)
      .values(testPackage)
      .returning()
      .execute();
    packageId = packageResult[0].id;

    // Create invitation
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

  describe('getGuestBookByInvitation', () => {
    it('should return empty array when no guest book entries exist', async () => {
      const result = await getGuestBookByInvitation(invitationId);
      expect(result).toEqual([]);
    });

    it('should return guest book entries for invitation', async () => {
      // Create test entries separately to ensure different timestamps
      await db.insert(guestBookTable)
        .values({
          invitation_id: invitationId,
          guest_name: 'Alice',
          message: 'Congratulations!'
        })
        .execute();

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await db.insert(guestBookTable)
        .values({
          invitation_id: invitationId,
          guest_name: 'Bob',
          message: 'Wishing you happiness!'
        })
        .execute();

      const result = await getGuestBookByInvitation(invitationId);

      expect(result).toHaveLength(2);
      expect(result[0].guest_name).toEqual('Bob'); // Should be ordered by created_at desc
      expect(result[0].message).toEqual('Wishing you happiness!');
      expect(result[1].guest_name).toEqual('Alice');
      expect(result[1].message).toEqual('Congratulations!');
    });

    it('should only return entries for specified invitation', async () => {
      // Create another invitation
      const anotherInvitation = await db.insert(invitationsTable)
        .values({
          ...testInvitation,
          user_id: userId,
          template_id: templateId,
          package_id: packageId,
          slug: 'another-wedding-456'
        })
        .returning()
        .execute();

      // Create entries for both invitations
      await db.insert(guestBookTable)
        .values([
          {
            invitation_id: invitationId,
            guest_name: 'Alice',
            message: 'For first invitation'
          },
          {
            invitation_id: anotherInvitation[0].id,
            guest_name: 'Bob',
            message: 'For second invitation'
          }
        ])
        .execute();

      const result = await getGuestBookByInvitation(invitationId);

      expect(result).toHaveLength(1);
      expect(result[0].guest_name).toEqual('Alice');
      expect(result[0].message).toEqual('For first invitation');
    });

    it('should return entries ordered by created_at descending', async () => {
      // Create entries with slight delay to ensure different timestamps
      await db.insert(guestBookTable)
        .values({
          invitation_id: invitationId,
          guest_name: 'First',
          message: 'First message'
        })
        .execute();

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await db.insert(guestBookTable)
        .values({
          invitation_id: invitationId,
          guest_name: 'Second',
          message: 'Second message'
        })
        .execute();

      const result = await getGuestBookByInvitation(invitationId);

      expect(result).toHaveLength(2);
      expect(result[0].guest_name).toEqual('Second'); // Most recent first
      expect(result[1].guest_name).toEqual('First');
    });
  });

  describe('createGuestBookEntry', () => {
    const testInput: CreateGuestBookInput = {
      invitation_id: 0, // Will be set in tests
      guest_name: 'Test Guest',
      message: 'Congratulations on your wedding!'
    };

    it('should create a guest book entry', async () => {
      const input = { ...testInput, invitation_id: invitationId };
      const result = await createGuestBookEntry(input);

      expect(result.id).toBeDefined();
      expect(result.invitation_id).toEqual(invitationId);
      expect(result.guest_name).toEqual('Test Guest');
      expect(result.message).toEqual('Congratulations on your wedding!');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save guest book entry to database', async () => {
      const input = { ...testInput, invitation_id: invitationId };
      const result = await createGuestBookEntry(input);

      const entries = await db.select()
        .from(guestBookTable)
        .where(eq(guestBookTable.id, result.id))
        .execute();

      expect(entries).toHaveLength(1);
      expect(entries[0].guest_name).toEqual('Test Guest');
      expect(entries[0].message).toEqual('Congratulations on your wedding!');
      expect(entries[0].invitation_id).toEqual(invitationId);
    });

    it('should throw error when invitation does not exist', async () => {
      const input = { ...testInput, invitation_id: 999999 };

      await expect(createGuestBookEntry(input)).rejects.toThrow(/invitation not found/i);
    });

    it('should throw error when guest book is disabled', async () => {
      // Create a separate invitation with guest book disabled
      const disabledInvitation = await db.insert(invitationsTable)
        .values({
          ...testInvitation,
          user_id: userId,
          template_id: templateId,
          package_id: packageId,
          slug: 'disabled-guestbook-wedding',
          guest_book_enabled: false
        })
        .returning()
        .execute();

      const input = { ...testInput, invitation_id: disabledInvitation[0].id };

      await expect(createGuestBookEntry(input)).rejects.toThrow(/guest book is disabled/i);
    });

    it('should allow entry when guest book is enabled', async () => {
      // Use existing invitation which has guest book enabled by default
      const input = { ...testInput, invitation_id: invitationId };
      const result = await createGuestBookEntry(input);

      expect(result.id).toBeDefined();
      expect(result.guest_name).toEqual('Test Guest');
    });
  });

  describe('deleteGuestBookEntry', () => {
    let entryId: number;

    beforeEach(async () => {
      const result = await db.insert(guestBookTable)
        .values({
          invitation_id: invitationId,
          guest_name: 'Test Guest',
          message: 'Test message'
        })
        .returning()
        .execute();
      entryId = result[0].id;
    });

    it('should delete existing guest book entry', async () => {
      const result = await deleteGuestBookEntry(entryId);

      expect(result).toBe(true);

      // Verify entry is deleted
      const entries = await db.select()
        .from(guestBookTable)
        .where(eq(guestBookTable.id, entryId))
        .execute();

      expect(entries).toHaveLength(0);
    });

    it('should return false when entry does not exist', async () => {
      const result = await deleteGuestBookEntry(999999);

      expect(result).toBe(false);
    });

    it('should not affect other entries when deleting', async () => {
      // Create another entry
      const anotherEntry = await db.insert(guestBookTable)
        .values({
          invitation_id: invitationId,
          guest_name: 'Another Guest',
          message: 'Another message'
        })
        .returning()
        .execute();

      // Delete first entry
      const result = await deleteGuestBookEntry(entryId);
      expect(result).toBe(true);

      // Verify other entry still exists
      const remainingEntries = await db.select()
        .from(guestBookTable)
        .where(eq(guestBookTable.invitation_id, invitationId))
        .execute();

      expect(remainingEntries).toHaveLength(1);
      expect(remainingEntries[0].id).toEqual(anotherEntry[0].id);
      expect(remainingEntries[0].guest_name).toEqual('Another Guest');
    });
  });
});
