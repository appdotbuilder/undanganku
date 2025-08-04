
import { db } from '../db';
import { digitalGiftsTable, invitationsTable } from '../db/schema';
import { type DigitalGift, type CreateDigitalGiftInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getDigitalGiftsByInvitation(invitationId: number): Promise<DigitalGift[]> {
  try {
    const results = await db.select()
      .from(digitalGiftsTable)
      .where(eq(digitalGiftsTable.invitation_id, invitationId))
      .execute();

    return results.map(gift => ({
      ...gift,
      amount: parseFloat(gift.amount),
      status: gift.status === 'approved' ? 'confirmed' : gift.status as 'pending' | 'confirmed' | 'rejected'
    }));
  } catch (error) {
    console.error('Failed to fetch digital gifts:', error);
    throw error;
  }
}

export async function createDigitalGift(input: CreateDigitalGiftInput): Promise<DigitalGift> {
  try {
    // Verify invitation exists and has digital gifts enabled
    const invitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.invitation_id))
      .execute();

    if (invitation.length === 0) {
      throw new Error('Invitation not found');
    }

    if (!invitation[0].digital_gift_enabled) {
      throw new Error('Digital gifts are not enabled for this invitation');
    }

    const result = await db.insert(digitalGiftsTable)
      .values({
        invitation_id: input.invitation_id,
        sender_name: input.sender_name,
        amount: input.amount.toString(),
        message: input.message,
        payment_method: input.payment_method,
        payment_proof_url: input.payment_proof_url,
        status: 'pending'
      })
      .returning()
      .execute();

    const gift = result[0];
    return {
      ...gift,
      amount: parseFloat(gift.amount),
      status: gift.status === 'approved' ? 'confirmed' : gift.status as 'pending' | 'confirmed' | 'rejected'
    };
  } catch (error) {
    console.error('Digital gift creation failed:', error);
    throw error;
  }
}

export async function confirmDigitalGift(id: number): Promise<DigitalGift> {
  try {
    const result = await db.update(digitalGiftsTable)
      .set({ status: 'confirmed' })
      .where(eq(digitalGiftsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Digital gift not found');
    }

    const gift = result[0];
    return {
      ...gift,
      amount: parseFloat(gift.amount),
      status: gift.status === 'approved' ? 'confirmed' : gift.status as 'pending' | 'confirmed' | 'rejected'
    };
  } catch (error) {
    console.error('Digital gift confirmation failed:', error);
    throw error;
  }
}

export async function deleteDigitalGift(id: number): Promise<boolean> {
  try {
    const result = await db.delete(digitalGiftsTable)
      .where(eq(digitalGiftsTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Digital gift deletion failed:', error);
    throw error;
  }
}
