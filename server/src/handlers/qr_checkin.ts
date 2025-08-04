
import { db } from '../db';
import { qrCheckinsTable, invitationsTable } from '../db/schema';
import { type QRCheckin, type CreateQRCheckinInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getQRCheckinsByInvitation(invitationId: number): Promise<QRCheckin[]> {
  try {
    const results = await db.select()
      .from(qrCheckinsTable)
      .where(eq(qrCheckinsTable.invitation_id, invitationId))
      .execute();

    return results.map(result => ({
      ...result,
      check_in_time: result.check_in_time
    }));
  } catch (error) {
    console.error('Failed to fetch QR check-ins:', error);
    throw error;
  }
}

export async function createQRCheckin(input: CreateQRCheckinInput): Promise<QRCheckin> {
  try {
    // Verify invitation exists
    const invitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.invitation_id))
      .execute();

    if (invitation.length === 0) {
      throw new Error('Invitation not found');
    }

    // Decode guest name from QR code (assuming QR code format: "guestName|invitationId")
    const qrParts = input.qr_code.split('|');
    if (qrParts.length !== 2 || parseInt(qrParts[1]) !== input.invitation_id) {
      throw new Error('Invalid QR code format');
    }

    const guestName = qrParts[0];

    // Create check-in record
    const result = await db.insert(qrCheckinsTable)
      .values({
        invitation_id: input.invitation_id,
        guest_name: guestName,
        qr_code: input.qr_code
      })
      .returning()
      .execute();

    return {
      ...result[0],
      check_in_time: result[0].check_in_time
    };
  } catch (error) {
    console.error('QR check-in failed:', error);
    throw error;
  }
}

export async function generateQRCode(invitationId: number, guestName: string): Promise<string> {
  try {
    // Verify invitation exists
    const invitation = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();

    if (invitation.length === 0) {
      throw new Error('Invitation not found');
    }

    // Generate QR code data in format: "guestName|invitationId"
    const qrCodeData = `${guestName}|${invitationId}`;
    
    return qrCodeData;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw error;
  }
}
