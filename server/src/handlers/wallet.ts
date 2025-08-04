
import { db } from '../db';
import { walletTopupsTable, usersTable } from '../db/schema';
import { type WalletTopup, type CreateWalletTopupInput, type ProcessWalletTopupInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getWalletTopups(userId?: number): Promise<WalletTopup[]> {
  try {
    const conditions = userId !== undefined ? eq(walletTopupsTable.user_id, userId) : undefined;
    
    const results = conditions
      ? await db.select().from(walletTopupsTable).where(conditions).execute()
      : await db.select().from(walletTopupsTable).execute();

    return results.map(topup => ({
      id: topup.id,
      user_id: topup.user_id,
      amount: parseFloat(topup.amount),
      payment_method: topup.payment_method,
      payment_proof_url: topup.payment_proof_url,
      status: topup.status as 'pending' | 'approved' | 'rejected',
      admin_notes: topup.admin_notes,
      processed_by: topup.processed_by,
      processed_at: topup.processed_at,
      created_at: topup.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch wallet topups:', error);
    throw error;
  }
}

export async function createWalletTopup(userId: number, input: CreateWalletTopupInput): Promise<WalletTopup> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const result = await db.insert(walletTopupsTable)
      .values({
        user_id: userId,
        amount: input.amount.toString(),
        payment_method: input.payment_method,
        payment_proof_url: input.payment_proof_url
      })
      .returning()
      .execute();

    const topup = result[0];
    return {
      id: topup.id,
      user_id: topup.user_id,
      amount: parseFloat(topup.amount),
      payment_method: topup.payment_method,
      payment_proof_url: topup.payment_proof_url,
      status: topup.status as 'pending' | 'approved' | 'rejected',
      admin_notes: topup.admin_notes,
      processed_by: topup.processed_by,
      processed_at: topup.processed_at,
      created_at: topup.created_at
    };
  } catch (error) {
    console.error('Failed to create wallet topup:', error);
    throw error;
  }
}

export async function processWalletTopup(adminId: number, input: ProcessWalletTopupInput): Promise<WalletTopup> {
  try {
    // Verify admin exists
    const admin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminId))
      .limit(1)
      .execute();

    if (admin.length === 0) {
      throw new Error('Admin not found');
    }

    // Verify topup exists and is still pending
    const existingTopup = await db.select()
      .from(walletTopupsTable)
      .where(eq(walletTopupsTable.id, input.id))
      .limit(1)
      .execute();

    if (existingTopup.length === 0) {
      throw new Error('Topup request not found');
    }

    if (existingTopup[0].status !== 'pending') {
      throw new Error('Topup request already processed');
    }

    // Update topup status
    const result = await db.update(walletTopupsTable)
      .set({
        status: input.status,
        admin_notes: input.admin_notes,
        processed_by: adminId,
        processed_at: new Date()
      })
      .where(eq(walletTopupsTable.id, input.id))
      .returning()
      .execute();

    // If approved, update user wallet balance
    if (input.status === 'approved') {
      const topupAmount = parseFloat(existingTopup[0].amount);
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, existingTopup[0].user_id))
        .limit(1)
        .execute();

      const currentBalance = parseFloat(user[0].wallet_balance);
      const newBalance = currentBalance + topupAmount;

      await db.update(usersTable)
        .set({
          wallet_balance: newBalance.toString(),
          updated_at: new Date()
        })
        .where(eq(usersTable.id, existingTopup[0].user_id))
        .execute();
    }

    const updatedTopup = result[0];
    return {
      id: updatedTopup.id,
      user_id: updatedTopup.user_id,
      amount: parseFloat(updatedTopup.amount),
      payment_method: updatedTopup.payment_method,
      payment_proof_url: updatedTopup.payment_proof_url,
      status: updatedTopup.status as 'pending' | 'approved' | 'rejected',
      admin_notes: updatedTopup.admin_notes,
      processed_by: updatedTopup.processed_by,
      processed_at: updatedTopup.processed_at,
      created_at: updatedTopup.created_at
    };
  } catch (error) {
    console.error('Failed to process wallet topup:', error);
    throw error;
  }
}

export async function getWalletBalance(userId: number): Promise<number> {
  try {
    const result = await db.select({ wallet_balance: usersTable.wallet_balance })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    return parseFloat(result[0].wallet_balance);
  } catch (error) {
    console.error('Failed to fetch wallet balance:', error);
    throw error;
  }
}
