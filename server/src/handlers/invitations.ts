
import { db } from '../db';
import { invitationsTable, usersTable, templatesTable, packagesTable } from '../db/schema';
import { type Invitation, type CreateInvitationInput, type UpdateInvitationInput } from '../schema';
import { eq, and } from 'drizzle-orm';

// Helper function to generate slug from bride and groom names
function generateSlug(brideName: string, groomName: string): string {
  const cleanName = (name: string) => name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
  
  return `${cleanName(brideName)}-${cleanName(groomName)}-wedding`;
}

// Helper function to convert database result to Invitation type
function mapInvitationResult(row: any): Invitation {
  return {
    ...row,
    // Convert date fields that might be strings back to Date objects
    wedding_date: new Date(row.wedding_date),
    published_at: row.published_at ? new Date(row.published_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
}

export async function getInvitations(userId?: number): Promise<Invitation[]> {
  try {
    const results = userId !== undefined
      ? await db.select()
          .from(invitationsTable)
          .where(eq(invitationsTable.user_id, userId))
          .execute()
      : await db.select()
          .from(invitationsTable)
          .execute();
    
    return results.map(mapInvitationResult);
  } catch (error) {
    console.error('Failed to fetch invitations:', error);
    throw error;
  }
}

export async function getInvitationById(id: number): Promise<Invitation | null> {
  try {
    const results = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, id))
      .limit(1)
      .execute();
    
    if (results.length === 0) {
      return null;
    }
    
    return mapInvitationResult(results[0]);
  } catch (error) {
    console.error('Failed to fetch invitation by ID:', error);
    throw error;
  }
}

export async function getInvitationBySlug(slug: string): Promise<Invitation | null> {
  try {
    const results = await db.select()
      .from(invitationsTable)
      .where(and(
        eq(invitationsTable.slug, slug),
        eq(invitationsTable.is_published, true)
      ))
      .limit(1)
      .execute();
    
    if (results.length === 0) {
      return null;
    }
    
    return mapInvitationResult(results[0]);
  } catch (error) {
    console.error('Failed to fetch invitation by slug:', error);
    throw error;
  }
}

export async function createInvitation(userId: number, input: CreateInvitationInput): Promise<Invitation> {
  try {
    // Verify that the user exists
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();
    
    if (userResults.length === 0) {
      throw new Error('User not found');
    }
    
    // Verify that the template exists and is active
    const templateResults = await db.select()
      .from(templatesTable)
      .where(and(
        eq(templatesTable.id, input.template_id),
        eq(templatesTable.is_active, true)
      ))
      .limit(1)
      .execute();
    
    if (templateResults.length === 0) {
      throw new Error('Template not found or inactive');
    }
    
    // Verify that the package exists and is active
    const packageResults = await db.select()
      .from(packagesTable)
      .where(and(
        eq(packagesTable.id, input.package_id),
        eq(packagesTable.is_active, true)
      ))
      .limit(1)
      .execute();
    
    if (packageResults.length === 0) {
      throw new Error('Package not found or inactive');
    }
    
    // Generate unique slug
    const baseSlug = generateSlug(input.bride_name, input.groom_name);
    let slug = baseSlug;
    let counter = 1;
    
    // Check if slug exists and increment counter if needed
    while (true) {
      const existingSlug = await db.select()
        .from(invitationsTable)
        .where(eq(invitationsTable.slug, slug))
        .limit(1)
        .execute();
      
      if (existingSlug.length === 0) {
        break;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Insert the invitation
    const results = await db.insert(invitationsTable)
      .values({
        user_id: userId,
        template_id: input.template_id,
        package_id: input.package_id,
        title: input.title,
        bride_name: input.bride_name,
        groom_name: input.groom_name,
        wedding_date: input.wedding_date,
        ceremony_time: input.ceremony_time,
        ceremony_location: input.ceremony_location,
        reception_time: input.reception_time,
        reception_location: input.reception_location,
        love_story: input.love_story,
        background_music_url: input.background_music_url,
        gallery_photos: input.gallery_photos,
        gallery_videos: input.gallery_videos,
        live_stream_url: input.live_stream_url,
        rsvp_enabled: input.rsvp_enabled,
        guest_book_enabled: input.guest_book_enabled,
        digital_gift_enabled: input.digital_gift_enabled,
        qr_checkin_enabled: input.qr_checkin_enabled,
        slug: slug
      })
      .returning()
      .execute();
    
    return mapInvitationResult(results[0]);
  } catch (error) {
    console.error('Failed to create invitation:', error);
    throw error;
  }
}

export async function updateInvitation(userId: number, input: UpdateInvitationInput): Promise<Invitation> {
  try {
    // First check if invitation exists and user has permission
    const existingResults = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, input.id))
      .limit(1)
      .execute();
    
    if (existingResults.length === 0) {
      throw new Error('Invitation not found');
    }
    
    const existing = existingResults[0];
    
    // Check if user owns the invitation (we don't check for admin role here as it's not part of the handler signature)
    if (existing.user_id !== userId) {
      throw new Error('Permission denied: You can only update your own invitations');
    }
    
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };
    
    if (input.title !== undefined) updateData.title = input.title;
    if (input.bride_name !== undefined) updateData.bride_name = input.bride_name;
    if (input.groom_name !== undefined) updateData.groom_name = input.groom_name;
    if (input.wedding_date !== undefined) updateData.wedding_date = input.wedding_date;
    if (input.ceremony_time !== undefined) updateData.ceremony_time = input.ceremony_time;
    if (input.ceremony_location !== undefined) updateData.ceremony_location = input.ceremony_location;
    if (input.reception_time !== undefined) updateData.reception_time = input.reception_time;
    if (input.reception_location !== undefined) updateData.reception_location = input.reception_location;
    if (input.love_story !== undefined) updateData.love_story = input.love_story;
    if (input.background_music_url !== undefined) updateData.background_music_url = input.background_music_url;
    if (input.gallery_photos !== undefined) updateData.gallery_photos = input.gallery_photos;
    if (input.gallery_videos !== undefined) updateData.gallery_videos = input.gallery_videos;
    if (input.live_stream_url !== undefined) updateData.live_stream_url = input.live_stream_url;
    if (input.rsvp_enabled !== undefined) updateData.rsvp_enabled = input.rsvp_enabled;
    if (input.guest_book_enabled !== undefined) updateData.guest_book_enabled = input.guest_book_enabled;
    if (input.digital_gift_enabled !== undefined) updateData.digital_gift_enabled = input.digital_gift_enabled;
    if (input.qr_checkin_enabled !== undefined) updateData.qr_checkin_enabled = input.qr_checkin_enabled;
    
    // Update the invitation
    const results = await db.update(invitationsTable)
      .set(updateData)
      .where(eq(invitationsTable.id, input.id))
      .returning()
      .execute();
    
    return mapInvitationResult(results[0]);
  } catch (error) {
    console.error('Failed to update invitation:', error);
    throw error;
  }
}

export async function publishInvitation(userId: number, invitationId: number): Promise<Invitation> {
  try {
    // Get invitation and verify ownership
    const invitationResults = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .limit(1)
      .execute();
    
    if (invitationResults.length === 0) {
      throw new Error('Invitation not found');
    }
    
    const invitation = invitationResults[0];
    
    if (invitation.user_id !== userId) {
      throw new Error('Permission denied: You can only publish your own invitations');
    }
    
    if (invitation.is_published) {
      throw new Error('Invitation is already published');
    }
    
    // Get user and package info to check balance and get price
    const userResults = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();
    
    const packageResults = await db.select()
      .from(packagesTable)
      .where(eq(packagesTable.id, invitation.package_id))
      .limit(1)
      .execute();
    
    if (userResults.length === 0 || packageResults.length === 0) {
      throw new Error('User or package not found');
    }
    
    const user = userResults[0];
    const packageInfo = packageResults[0];
    
    const userBalance = parseFloat(user.wallet_balance);
    const packagePrice = parseFloat(packageInfo.price);
    
    if (userBalance < packagePrice) {
      throw new Error('Insufficient wallet balance');
    }
    
    // Deduct balance and publish invitation in a transaction-like operation
    const newBalance = userBalance - packagePrice;
    
    // Update user balance
    await db.update(usersTable)
      .set({ wallet_balance: newBalance.toString() })
      .where(eq(usersTable.id, userId))
      .execute();
    
    // Publish invitation
    const results = await db.update(invitationsTable)
      .set({
        is_published: true,
        published_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(invitationsTable.id, invitationId))
      .returning()
      .execute();
    
    return mapInvitationResult(results[0]);
  } catch (error) {
    console.error('Failed to publish invitation:', error);
    throw error;
  }
}

export async function deleteInvitation(userId: number, invitationId: number): Promise<boolean> {
  try {
    // First check if invitation exists and user has permission
    const existingResults = await db.select()
      .from(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .limit(1)
      .execute();
    
    if (existingResults.length === 0) {
      throw new Error('Invitation not found');
    }
    
    const existing = existingResults[0];
    
    if (existing.user_id !== userId) {
      throw new Error('Permission denied: You can only delete your own invitations');
    }
    
    // Delete the invitation
    await db.delete(invitationsTable)
      .where(eq(invitationsTable.id, invitationId))
      .execute();
    
    return true;
  } catch (error) {
    console.error('Failed to delete invitation:', error);
    throw error;
  }
}
