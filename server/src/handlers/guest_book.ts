
import { db } from '../db';
import { guestBookTable, invitationsTable } from '../db/schema';
import { type GuestBook, type CreateGuestBookInput } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getGuestBookByInvitation(invitationId: number): Promise<GuestBook[]> {
  try {
    const results = await db.select()
      .from(guestBookTable)
      .where(eq(guestBookTable.invitation_id, invitationId))
      .orderBy(desc(guestBookTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get guest book entries:', error);
    throw error;
  }
}

export async function createGuestBookEntry(input: CreateGuestBookInput): Promise<GuestBook> {
  try {
    // Verify invitation exists and guest book is enabled
    const invitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.invitation_id))
      .execute();

    if (invitation.length === 0) {
      throw new Error('Invitation not found');
    }

    if (!invitation[0].guest_book_enabled) {
      throw new Error('Guest book is disabled for this invitation');
    }

    // Create guest book entry
    const result = await db.insert(guestBookTable)
      .values({
        invitation_id: input.invitation_id,
        guest_name: input.guest_name,
        message: input.message
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Failed to create guest book entry:', error);
    throw error;
  }
}

export async function deleteGuestBookEntry(id: number): Promise<boolean> {
  try {
    const result = await db.delete(guestBookTable)
      .where(eq(guestBookTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete guest book entry:', error);
    throw error;
  }
}
