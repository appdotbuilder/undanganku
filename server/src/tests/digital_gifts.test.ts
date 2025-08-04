
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, templatesTable, packagesTable, invitationsTable, digitalGiftsTable } from '../db/schema';
import { type CreateDigitalGiftInput } from '../schema';
import { 
  getDigitalGiftsByInvitation, 
  createDigitalGift, 
  confirmDigitalGift, 
  deleteDigitalGift 
} from '../handlers/digital_gifts';
import { eq } from 'drizzle-orm';

describe('Digital Gifts Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let templateId: number;
  let packageId: number;
  let invitationId: number;
  let invitationWithoutGiftsId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phone: null,
        role: 'member'
      })
      .returning()
      .execute();
    userId = user[0].id;

    const template = await db.insert(templatesTable)
      .values({
        name: 'Test Template',
        description: 'A test template',
        preview_image: null,
        template_data: '{}',
        is_active: true
      })
      .returning()
      .execute();
    templateId = template[0].id;

    const pkg = await db.insert(packagesTable)
      .values({
        name: 'Test Package',
        description: 'A test package',
        price: '100000',
        features: '[]',
        max_guests: 100,
        is_active: true
      })
      .returning()
      .execute();
    packageId = pkg[0].id;

    const invitation = await db.insert(invitationsTable)
      .values({
        user_id: userId,
        template_id: templateId,
        package_id: packageId,
        title: 'Test Wedding',
        bride_name: 'Jane',
        groom_name: 'John',
        wedding_date: new Date('2024-12-31'),
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
        slug: 'test-wedding'
      })
      .returning()
      .execute();
    invitationId = invitation[0].id;

    const invitationWithoutGifts = await db.insert(invitationsTable)
      .values({
        user_id: userId,
        template_id: templateId,
        package_id: packageId,
        title: 'Wedding No Gifts',
        bride_name: 'Alice',
        groom_name: 'Bob',
        wedding_date: new Date('2024-12-31'),
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
        digital_gift_enabled: false,
        qr_checkin_enabled: false,
        is_published: true,
        slug: 'wedding-no-gifts'
      })
      .returning()
      .execute();
    invitationWithoutGiftsId = invitationWithoutGifts[0].id;
  });

  describe('getDigitalGiftsByInvitation', () => {
    it('should return empty array when no gifts exist', async () => {
      const result = await getDigitalGiftsByInvitation(invitationId);
      expect(result).toEqual([]);
    });

    it('should return digital gifts for invitation', async () => {
      // Create test gifts
      await db.insert(digitalGiftsTable)
        .values([
          {
            invitation_id: invitationId,
            sender_name: 'Gift Sender 1',
            amount: '50000',
            message: 'Congratulations!',
            payment_method: 'Transfer Bank',
            payment_proof_url: null,
            status: 'pending'
          },
          {
            invitation_id: invitationId,
            sender_name: 'Gift Sender 2',
            amount: '100000',
            message: null,
            payment_method: 'E-Wallet',
            payment_proof_url: 'https://example.com/proof.jpg',
            status: 'confirmed'
          }
        ])
        .execute();

      const result = await getDigitalGiftsByInvitation(invitationId);

      expect(result).toHaveLength(2);
      expect(result[0].sender_name).toEqual('Gift Sender 1');
      expect(result[0].amount).toEqual(50000);
      expect(typeof result[0].amount).toBe('number');
      expect(result[0].status).toEqual('pending');
      expect(result[1].sender_name).toEqual('Gift Sender 2');
      expect(result[1].amount).toEqual(100000);
      expect(result[1].status).toEqual('confirmed');
    });
  });

  describe('createDigitalGift', () => {
    const testInput: CreateDigitalGiftInput = {
      invitation_id: 0, // Will be set in test
      sender_name: 'John Doe',
      amount: 250000,
      message: 'Best wishes for your wedding!',
      payment_method: 'Transfer Bank',
      payment_proof_url: 'https://example.com/proof.jpg'
    };

    it('should create a digital gift', async () => {
      const input = { ...testInput, invitation_id: invitationId };
      const result = await createDigitalGift(input);

      expect(result.sender_name).toEqual('John Doe');
      expect(result.amount).toEqual(250000);
      expect(typeof result.amount).toBe('number');
      expect(result.message).toEqual('Best wishes for your wedding!');
      expect(result.payment_method).toEqual('Transfer Bank');
      expect(result.payment_proof_url).toEqual('https://example.com/proof.jpg');
      expect(result.status).toEqual('pending');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save digital gift to database', async () => {
      const input = { ...testInput, invitation_id: invitationId };
      const result = await createDigitalGift(input);

      const gifts = await db.select()
        .from(digitalGiftsTable)
        .where(eq(digitalGiftsTable.id, result.id))
        .execute();

      expect(gifts).toHaveLength(1);
      expect(gifts[0].sender_name).toEqual('John Doe');
      expect(parseFloat(gifts[0].amount)).toEqual(250000);
      expect(gifts[0].status).toEqual('pending');
    });

    it('should throw error for non-existent invitation', async () => {
      const input = { ...testInput, invitation_id: 999999 };
      
      await expect(createDigitalGift(input)).rejects.toThrow(/invitation not found/i);
    });

    it('should throw error when digital gifts are disabled', async () => {
      const input = { ...testInput, invitation_id: invitationWithoutGiftsId };
      
      await expect(createDigitalGift(input)).rejects.toThrow(/digital gifts are not enabled/i);
    });
  });

  describe('confirmDigitalGift', () => {
    let giftId: number;

    beforeEach(async () => {
      const gift = await db.insert(digitalGiftsTable)
        .values({
          invitation_id: invitationId,
          sender_name: 'Gift Sender',
          amount: '75000',
          message: 'Congratulations!',
          payment_method: 'Transfer Bank',
          payment_proof_url: null,
          status: 'pending'
        })
        .returning()
        .execute();
      giftId = gift[0].id;
    });

    it('should confirm digital gift', async () => {
      const result = await confirmDigitalGift(giftId);

      expect(result.id).toEqual(giftId);
      expect(result.status).toEqual('confirmed');
      expect(result.sender_name).toEqual('Gift Sender');
      expect(result.amount).toEqual(75000);
      expect(typeof result.amount).toBe('number');
    });

    it('should update gift status in database', async () => {
      await confirmDigitalGift(giftId);

      const gifts = await db.select()
        .from(digitalGiftsTable)
        .where(eq(digitalGiftsTable.id, giftId))
        .execute();

      expect(gifts[0].status).toEqual('confirmed');
    });

    it('should throw error for non-existent gift', async () => {
      await expect(confirmDigitalGift(999999)).rejects.toThrow(/digital gift not found/i);
    });
  });

  describe('deleteDigitalGift', () => {
    let giftId: number;

    beforeEach(async () => {
      const gift = await db.insert(digitalGiftsTable)
        .values({
          invitation_id: invitationId,
          sender_name: 'Gift Sender',
          amount: '30000',
          message: null,
          payment_method: 'E-Wallet',
          payment_proof_url: null,
          status: 'pending'
        })
        .returning()
        .execute();
      giftId = gift[0].id;
    });

    it('should delete digital gift', async () => {
      const result = await deleteDigitalGift(giftId);
      expect(result).toBe(true);
    });

    it('should remove gift from database', async () => {
      await deleteDigitalGift(giftId);

      const gifts = await db.select()
        .from(digitalGiftsTable)
        .where(eq(digitalGiftsTable.id, giftId))
        .execute();

      expect(gifts).toHaveLength(0);
    });

    it('should return false for non-existent gift', async () => {
      const result = await deleteDigitalGift(999999);
      expect(result).toBe(false);
    });
  });
});
