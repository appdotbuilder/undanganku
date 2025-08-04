
import { db } from '../db';
import { rsvpTable, invitationsTable } from '../db/schema';
import { type RSVP, type CreateRSVPInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getRSVPsByInvitation(invitationId: number): Promise<RSVP[]> {
  try {
    const results = await db.select()
      .from(rsvpTable)
      .where(eq(rsvpTable.invitation_id, invitationId))
      .execute();

    return results.map(rsvp => ({
      ...rsvp,
      created_at: rsvp.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch RSVPs by invitation:', error);
    throw error;
  }
}

export async function createRSVP(input: CreateRSVPInput): Promise<RSVP> {
  try {
    // Verify invitation exists and RSVP is enabled
    const invitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.invitation_id))
      .execute();

    if (invitation.length === 0) {
      throw new Error('Invitation not found');
    }

    if (!invitation[0].rsvp_enabled) {
      throw new Error('RSVP is not enabled for this invitation');
    }

    // Create RSVP record
    const result = await db.insert(rsvpTable)
      .values({
        invitation_id: input.invitation_id,
        guest_name: input.guest_name,
        guest_email: input.guest_email,
        guest_phone: input.guest_phone,
        attendance_status: input.attendance_status,
        guest_count: input.guest_count,
        message: input.message
      })
      .returning()
      .execute();

    return {
      ...result[0],
      created_at: result[0].created_at
    };
  } catch (error) {
    console.error('RSVP creation failed:', error);
    throw error;
  }
}

export async function updateRSVP(id: number, input: Partial<CreateRSVPInput>): Promise<RSVP> {
  try {
    // Check if RSVP exists
    const existingRSVP = await db.select()
      .from(rsvpTable)
      .where(eq(rsvpTable.id, id))
      .execute();

    if (existingRSVP.length === 0) {
      throw new Error('RSVP not found');
    }

    // Update RSVP record
    const result = await db.update(rsvpTable)
      .set({
        ...(input.guest_name && { guest_name: input.guest_name }),
        ...(input.guest_email !== undefined && { guest_email: input.guest_email }),
        ...(input.guest_phone !== undefined && { guest_phone: input.guest_phone }),
        ...(input.attendance_status && { attendance_status: input.attendance_status }),
        ...(input.guest_count && { guest_count: input.guest_count }),
        ...(input.message !== undefined && { message: input.message })
      })
      .where(eq(rsvpTable.id, id))
      .returning()
      .execute();

    return {
      ...result[0],
      created_at: result[0].created_at
    };
  } catch (error) {
    console.error('RSVP update failed:', error);
    throw error;
  }
}

export async function deleteRSVP(id: number): Promise<boolean> {
  try {
    // Check if RSVP exists
    const existingRSVP = await db.select()
      .from(rsvpTable)
      .where(eq(rsvpTable.id, id))
      .execute();

    if (existingRSVP.length === 0) {
      throw new Error('RSVP not found');
    }

    // Delete RSVP record
    await db.delete(rsvpTable)
      .where(eq(rsvpTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('RSVP deletion failed:', error);
    throw error;
  }
}
