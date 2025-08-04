
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, packagesTable, invitationsTable } from '../db/schema';
import { type CreateInvitationInput, type UpdateInvitationInput } from '../schema';
import {
  getInvitations,
  getInvitationById,
  getInvitationBySlug,
  createInvitation,
  updateInvitation,
  publishInvitation,
  deleteInvitation
} from '../handlers/invitations';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'user@test.com',
  password: 'password123',
  name: 'Test User',
  phone: '1234567890',
  role: 'member' as const,
  wallet_balance: '100.00'
};

const testAdmin = {
  email: 'admin@test.com',
  password: 'password123',
  name: 'Admin User',
  phone: '0987654321',
  role: 'admin' as const,
  wallet_balance: '1000.00'
};

const testTemplate = {
  name: 'Elegant Template',
  description: 'A beautiful template',
  preview_image: 'template.jpg',
  template_data: '{"layout": "elegant"}',
  is_active: true
};

const testPackage = {
  name: 'Premium Package',
  description: 'Premium features',
  price: '50.00',
  features: '["unlimited_guests", "gallery", "rsvp"]',
  max_guests: 100,
  is_active: true
};

const testInvitationInput: CreateInvitationInput = {
  template_id: 1,
  package_id: 1,
  title: 'Our Wedding Day',
  bride_name: 'Alice Johnson',
  groom_name: 'Bob Smith',
  wedding_date: new Date('2024-06-15'),
  ceremony_time: '14:00',
  ceremony_location: 'Beautiful Garden',
  reception_time: '18:00',
  reception_location: 'Grand Ballroom',
  love_story: 'We met at college...',
  background_music_url: 'https://music.com/song.mp3',
  gallery_photos: '["photo1.jpg", "photo2.jpg"]',
  gallery_videos: '["video1.mp4"]',
  live_stream_url: 'https://stream.com/wedding',
  rsvp_enabled: true,
  guest_book_enabled: true,
  digital_gift_enabled: true,
  qr_checkin_enabled: false
};

describe('Invitations Handlers', () => {
  let userId: number;
  let adminId: number;
  let templateId: number;
  let packageId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;
    
    // Create test admin
    const adminResult = await db.insert(usersTable)
      .values(testAdmin)
      .returning()
      .execute();
    adminId = adminResult[0].id;
    
    // Create test template
    const templateResult = await db.insert(templatesTable)
      .values(testTemplate)
      .returning()
      .execute();
    templateId = templateResult[0].id;
    
    // Create test package
    const packageResult = await db.insert(packagesTable)
      .values(testPackage)
      .returning()
      .execute();
    packageId = packageResult[0].id;
  });

  afterEach(resetDB);

  describe('getInvitations', () => {
    it('should return all invitations when no userId provided', async () => {
      // Create invitations for different users
      await createInvitation(userId, testInvitationInput);
      await createInvitation(adminId, { ...testInvitationInput, bride_name: 'Jane', groom_name: 'John' });
      
      const result = await getInvitations();
      
      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBeDefined();
      expect(result[1].user_id).toBeDefined();
    });

    it('should return only user invitations when userId provided', async () => {
      await createInvitation(userId, testInvitationInput);
      await createInvitation(adminId, { ...testInvitationInput, bride_name: 'Jane', groom_name: 'John' });
      
      const result = await getInvitations(userId);
      
      expect(result).toHaveLength(1);
      expect(result[0].user_id).toEqual(userId);
    });

    it('should return empty array when user has no invitations', async () => {
      const result = await getInvitations(userId);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getInvitationById', () => {
    it('should return invitation when found', async () => {
      const created = await createInvitation(userId, testInvitationInput);
      
      const result = await getInvitationById(created.id);
      
      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.title).toEqual('Our Wedding Day');
      expect(result!.bride_name).toEqual('Alice Johnson');
    });

    it('should return null when invitation not found', async () => {
      const result = await getInvitationById(999);
      
      expect(result).toBeNull();
    });
  });

  describe('getInvitationBySlug', () => {
    it('should return published invitation when found by slug', async () => {
      const created = await createInvitation(userId, testInvitationInput);
      await publishInvitation(userId, created.id);
      
      const result = await getInvitationBySlug(created.slug);
      
      expect(result).not.toBeNull();
      expect(result!.slug).toEqual(created.slug);
      expect(result!.is_published).toBe(true);
    });

    it('should return null for unpublished invitation', async () => {
      const created = await createInvitation(userId, testInvitationInput);
      
      const result = await getInvitationBySlug(created.slug);
      
      expect(result).toBeNull();
    });

    it('should return null when slug not found', async () => {
      const result = await getInvitationBySlug('non-existent-slug');
      
      expect(result).toBeNull();
    });
  });

  describe('createInvitation', () => {
    it('should create invitation with all fields', async () => {
      const result = await createInvitation(userId, testInvitationInput);
      
      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(userId);
      expect(result.template_id).toEqual(templateId);
      expect(result.package_id).toEqual(packageId);
      expect(result.title).toEqual('Our Wedding Day');
      expect(result.bride_name).toEqual('Alice Johnson');
      expect(result.groom_name).toEqual('Bob Smith');
      expect(result.wedding_date).toEqual(new Date('2024-06-15'));
      expect(result.ceremony_time).toEqual('14:00');
      expect(result.ceremony_location).toEqual('Beautiful Garden');
      expect(result.reception_time).toEqual('18:00');
      expect(result.reception_location).toEqual('Grand Ballroom');
      expect(result.love_story).toEqual('We met at college...');
      expect(result.background_music_url).toEqual('https://music.com/song.mp3');
      expect(result.gallery_photos).toEqual('["photo1.jpg", "photo2.jpg"]');
      expect(result.gallery_videos).toEqual('["video1.mp4"]');
      expect(result.live_stream_url).toEqual('https://stream.com/wedding');
      expect(result.rsvp_enabled).toBe(true);
      expect(result.guest_book_enabled).toBe(true);
      expect(result.digital_gift_enabled).toBe(true);
      expect(result.qr_checkin_enabled).toBe(false);
      expect(result.is_published).toBe(false);
      expect(result.slug).toEqual('alice-johnson-bob-smith-wedding');
      expect(result.published_at).toBeNull();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should generate unique slug when names conflict', async () => {
      const first = await createInvitation(userId, testInvitationInput);
      const second = await createInvitation(adminId, testInvitationInput);
      
      expect(first.slug).toEqual('alice-johnson-bob-smith-wedding');
      expect(second.slug).toEqual('alice-johnson-bob-smith-wedding-1');
    });

    it('should save to database correctly', async () => {
      const result = await createInvitation(userId, testInvitationInput);
      
      const saved = await db.select()
        .from(invitationsTable)
        .where(eq(invitationsTable.id, result.id))
        .execute();
      
      expect(saved).toHaveLength(1);
      expect(saved[0].title).toEqual('Our Wedding Day');
      expect(saved[0].slug).toEqual('alice-johnson-bob-smith-wedding');
    });

    it('should throw error when user not found', async () => {
      await expect(createInvitation(999, testInvitationInput))
        .rejects.toThrow(/user not found/i);
    });

    it('should throw error when template not found', async () => {
      const input = { ...testInvitationInput, template_id: 999 };
      
      await expect(createInvitation(userId, input))
        .rejects.toThrow(/template not found/i);
    });

    it('should throw error when package not found', async () => {
      const input = { ...testInvitationInput, package_id: 999 };
      
      await expect(createInvitation(userId, input))
        .rejects.toThrow(/package not found/i);
    });
  });

  describe('updateInvitation', () => {
    let invitationId: number;

    beforeEach(async () => {
      const created = await createInvitation(userId, testInvitationInput);
      invitationId = created.id;
    });

    it('should update invitation fields', async () => {
      const updateInput: UpdateInvitationInput = {
        id: invitationId,
        title: 'Updated Wedding Title',
        bride_name: 'Alice Updated',
        ceremony_location: 'New Location'
      };
      
      const result = await updateInvitation(userId, updateInput);
      
      expect(result.title).toEqual('Updated Wedding Title');
      expect(result.bride_name).toEqual('Alice Updated');
      expect(result.ceremony_location).toEqual('New Location');
      expect(result.groom_name).toEqual('Bob Smith'); // Unchanged
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error when invitation not found', async () => {
      const updateInput: UpdateInvitationInput = {
        id: 999,
        title: 'Updated Title'
      };
      
      await expect(updateInvitation(userId, updateInput))
        .rejects.toThrow(/invitation not found/i);
    });

    it('should throw error when user does not own invitation', async () => {
      const updateInput: UpdateInvitationInput = {
        id: invitationId,
        title: 'Updated Title'
      };
      
      await expect(updateInvitation(adminId, updateInput))
        .rejects.toThrow(/permission denied/i);
    });
  });

  describe('publishInvitation', () => {
    let invitationId: number;

    beforeEach(async () => {
      const created = await createInvitation(userId, testInvitationInput);
      invitationId = created.id;
    });

    it('should publish invitation and deduct balance', async () => {
      const result = await publishInvitation(userId, invitationId);
      
      expect(result.is_published).toBe(true);
      expect(result.published_at).toBeInstanceOf(Date);
      
      // Check user balance was deducted
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();
      
      expect(parseFloat(user[0].wallet_balance)).toEqual(50.00); // 100 - 50
    });

    it('should throw error when invitation not found', async () => {
      await expect(publishInvitation(userId, 999))
        .rejects.toThrow(/invitation not found/i);
    });

    it('should throw error when user does not own invitation', async () => {
      await expect(publishInvitation(adminId, invitationId))
        .rejects.toThrow(/permission denied/i);
    });

    it('should throw error when invitation already published', async () => {
      await publishInvitation(userId, invitationId);
      
      await expect(publishInvitation(userId, invitationId))
        .rejects.toThrow(/already published/i);
    });

    it('should throw error when insufficient wallet balance', async () => {
      // Create user with low balance
      const poorUser = await db.insert(usersTable)
        .values({ ...testUser, email: 'poor@test.com', wallet_balance: '10.00' })
        .returning()
        .execute();
      
      const poorInvitation = await createInvitation(poorUser[0].id, testInvitationInput);
      
      await expect(publishInvitation(poorUser[0].id, poorInvitation.id))
        .rejects.toThrow(/insufficient wallet balance/i);
    });
  });

  describe('deleteInvitation', () => {
    let invitationId: number;

    beforeEach(async () => {
      const created = await createInvitation(userId, testInvitationInput);
      invitationId = created.id;
    });

    it('should delete invitation', async () => {
      const result = await deleteInvitation(userId, invitationId);
      
      expect(result).toBe(true);
      
      // Verify deletion
      const deleted = await db.select()
        .from(invitationsTable)
        .where(eq(invitationsTable.id, invitationId))
        .execute();
      
      expect(deleted).toHaveLength(0);
    });

    it('should throw error when invitation not found', async () => {
      await expect(deleteInvitation(userId, 999))
        .rejects.toThrow(/invitation not found/i);
    });

    it('should throw error when user does not own invitation', async () => {
      await expect(deleteInvitation(adminId, invitationId))
        .rejects.toThrow(/permission denied/i);
    });
  });
});
