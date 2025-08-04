
import { db } from '../db';
import { 
  usersTable, 
  invitationsTable, 
  rsvpTable, 
  digitalGiftsTable, 
  walletTopupsTable 
} from '../db/schema';
import { type Statistics } from '../schema';
import { eq, count, sum, and, gte } from 'drizzle-orm';

export async function getStatistics(): Promise<Statistics> {
  try {
    // Count total members (non-admin users)
    const totalMembersResult = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.role, 'member'))
      .execute();

    // Count total invitations
    const totalInvitationsResult = await db.select({ count: count() })
      .from(invitationsTable)
      .execute();

    // Count published invitations
    const publishedInvitationsResult = await db.select({ count: count() })
      .from(invitationsTable)
      .where(eq(invitationsTable.is_published, true))
      .execute();

    // Count total RSVP responses
    const totalRsvpResult = await db.select({ count: count() })
      .from(rsvpTable)
      .execute();

    // Count total digital gifts
    const totalDigitalGiftsResult = await db.select({ count: count() })
      .from(digitalGiftsTable)
      .execute();

    // Sum total wallet balance
    const totalWalletBalanceResult = await db.select({ 
      total: sum(usersTable.wallet_balance) 
    })
      .from(usersTable)
      .execute();

    // Count pending wallet top-ups
    const pendingTopupsResult = await db.select({ count: count() })
      .from(walletTopupsTable)
      .where(eq(walletTopupsTable.status, 'pending'))
      .execute();

    // Calculate revenue this month from approved digital gifts
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const revenueThisMonthResult = await db.select({ 
      total: sum(digitalGiftsTable.amount) 
    })
      .from(digitalGiftsTable)
      .where(
        and(
          eq(digitalGiftsTable.status, 'confirmed'),
          gte(digitalGiftsTable.created_at, firstDayOfMonth)
        )
      )
      .execute();

    return {
      total_members: totalMembersResult[0]?.count || 0,
      total_invitations: totalInvitationsResult[0]?.count || 0,
      published_invitations: publishedInvitationsResult[0]?.count || 0,
      total_rsvp: totalRsvpResult[0]?.count || 0,
      total_digital_gifts: totalDigitalGiftsResult[0]?.count || 0,
      total_wallet_balance: parseFloat(totalWalletBalanceResult[0]?.total || '0'),
      pending_topups: pendingTopupsResult[0]?.count || 0,
      revenue_this_month: parseFloat(revenueThisMonthResult[0]?.total || '0')
    };
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
    throw error;
  }
}

export async function getUserStatistics(userId: number): Promise<Partial<Statistics>> {
  try {
    // Count user's total invitations
    const totalInvitationsResult = await db.select({ count: count() })
      .from(invitationsTable)
      .where(eq(invitationsTable.user_id, userId))
      .execute();

    // Count user's published invitations
    const publishedInvitationsResult = await db.select({ count: count() })
      .from(invitationsTable)
      .where(
        and(
          eq(invitationsTable.user_id, userId),
          eq(invitationsTable.is_published, true)
        )
      )
      .execute();

    // Count total RSVP responses for user's invitations
    const totalRsvpResult = await db.select({ count: count() })
      .from(rsvpTable)
      .innerJoin(invitationsTable, eq(rsvpTable.invitation_id, invitationsTable.id))
      .where(eq(invitationsTable.user_id, userId))
      .execute();

    // Count total digital gifts for user's invitations
    const totalDigitalGiftsResult = await db.select({ count: count() })
      .from(digitalGiftsTable)
      .innerJoin(invitationsTable, eq(digitalGiftsTable.invitation_id, invitationsTable.id))
      .where(eq(invitationsTable.user_id, userId))
      .execute();

    return {
      total_invitations: totalInvitationsResult[0]?.count || 0,
      published_invitations: publishedInvitationsResult[0]?.count || 0,
      total_rsvp: totalRsvpResult[0]?.count || 0,
      total_digital_gifts: totalDigitalGiftsResult[0]?.count || 0
    };
  } catch (error) {
    console.error('Failed to fetch user statistics:', error);
    throw error;
  }
}
