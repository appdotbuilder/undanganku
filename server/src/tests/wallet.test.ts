
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, walletTopupsTable } from '../db/schema';
import { type CreateWalletTopupInput, type ProcessWalletTopupInput } from '../schema';
import { getWalletTopups, createWalletTopup, processWalletTopup, getWalletBalance } from '../handlers/wallet';
import { eq } from 'drizzle-orm';

describe('Wallet handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let adminUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password: 'password123',
        name: 'Test User',
        phone: null,
        role: 'member',
        wallet_balance: '50000'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Admin User',
        phone: null,
        role: 'admin',
        wallet_balance: '0'
      })
      .returning()
      .execute();
    adminUserId = adminResult[0].id;
  });

  describe('getWalletTopups', () => {
    it('should fetch all topups when no userId provided', async () => {
      // Create topups for different users
      await db.insert(walletTopupsTable)
        .values([
          {
            user_id: testUserId,
            amount: '100000',
            payment_method: 'Transfer Bank',
            payment_proof_url: null
          },
          {
            user_id: adminUserId,
            amount: '200000',
            payment_method: 'E-wallet',
            payment_proof_url: null
          }
        ])
        .execute();

      const result = await getWalletTopups();

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(100000);
      expect(result[1].amount).toBe(200000);
      expect(result[0].status).toBe('pending');
      expect(result[0].created_at).toBeInstanceOf(Date);
    });

    it('should fetch only user topups when userId provided', async () => {
      // Create topups for different users
      await db.insert(walletTopupsTable)
        .values([
          {
            user_id: testUserId,
            amount: '100000',
            payment_method: 'Transfer Bank',
            payment_proof_url: null
          },
          {
            user_id: adminUserId,
            amount: '200000',
            payment_method: 'E-wallet',
            payment_proof_url: null
          }
        ])
        .execute();

      const result = await getWalletTopups(testUserId);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(testUserId);
      expect(result[0].amount).toBe(100000);
    });

    it('should return empty array when no topups exist', async () => {
      const result = await getWalletTopups();
      expect(result).toHaveLength(0);
    });
  });

  describe('createWalletTopup', () => {
    const testInput: CreateWalletTopupInput = {
      amount: 150000,
      payment_method: 'Transfer Bank',
      payment_proof_url: 'https://example.com/proof.jpg'
    };

    it('should create a wallet topup request', async () => {
      const result = await createWalletTopup(testUserId, testInput);

      expect(result.user_id).toBe(testUserId);
      expect(result.amount).toBe(150000);
      expect(result.payment_method).toBe('Transfer Bank');
      expect(result.payment_proof_url).toBe('https://example.com/proof.jpg');
      expect(result.status).toBe('pending');
      expect(result.admin_notes).toBeNull();
      expect(result.processed_by).toBeNull();
      expect(result.processed_at).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save topup to database', async () => {
      const result = await createWalletTopup(testUserId, testInput);

      const topups = await db.select()
        .from(walletTopupsTable)
        .where(eq(walletTopupsTable.id, result.id))
        .execute();

      expect(topups).toHaveLength(1);
      expect(topups[0].user_id).toBe(testUserId);
      expect(parseFloat(topups[0].amount)).toBe(150000);
      expect(topups[0].status).toBe('pending');
    });

    it('should throw error for non-existent user', async () => {
      await expect(createWalletTopup(999, testInput))
        .rejects
        .toThrow(/user not found/i);
    });
  });

  describe('processWalletTopup', () => {
    let topupId: number;

    beforeEach(async () => {
      const topupResult = await db.insert(walletTopupsTable)
        .values({
          user_id: testUserId,
          amount: '100000',
          payment_method: 'Transfer Bank',
          payment_proof_url: null
        })
        .returning()
        .execute();
      topupId = topupResult[0].id;
    });

    it('should approve topup and update wallet balance', async () => {
      const processInput: ProcessWalletTopupInput = {
        id: topupId,
        status: 'approved',
        admin_notes: 'Payment verified'
      };

      const result = await processWalletTopup(adminUserId, processInput);

      expect(result.status).toBe('approved');
      expect(result.admin_notes).toBe('Payment verified');
      expect(result.processed_by).toBe(adminUserId);
      expect(result.processed_at).toBeInstanceOf(Date);

      // Check if wallet balance was updated
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .limit(1)
        .execute();

      expect(parseFloat(user[0].wallet_balance)).toBe(150000); // 50000 + 100000
    });

    it('should reject topup without updating wallet balance', async () => {
      const processInput: ProcessWalletTopupInput = {
        id: topupId,
        status: 'rejected',
        admin_notes: 'Invalid payment proof'
      };

      const result = await processWalletTopup(adminUserId, processInput);

      expect(result.status).toBe('rejected');
      expect(result.admin_notes).toBe('Invalid payment proof');

      // Check that wallet balance was not updated
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .limit(1)
        .execute();

      expect(parseFloat(user[0].wallet_balance)).toBe(50000); // Original balance unchanged
    });

    it('should throw error for non-existent topup', async () => {
      const processInput: ProcessWalletTopupInput = {
        id: 999,
        status: 'approved',
        admin_notes: null
      };

      await expect(processWalletTopup(adminUserId, processInput))
        .rejects
        .toThrow(/topup request not found/i);
    });

    it('should throw error for already processed topup', async () => {
      // First, process the topup
      await processWalletTopup(adminUserId, {
        id: topupId,
        status: 'approved',
        admin_notes: 'First processing'
      });

      // Try to process again
      const processInput: ProcessWalletTopupInput = {
        id: topupId,
        status: 'rejected',
        admin_notes: 'Second processing'
      };

      await expect(processWalletTopup(adminUserId, processInput))
        .rejects
        .toThrow(/already processed/i);
    });

    it('should throw error for non-existent admin', async () => {
      const processInput: ProcessWalletTopupInput = {
        id: topupId,
        status: 'approved',
        admin_notes: null
      };

      await expect(processWalletTopup(999, processInput))
        .rejects
        .toThrow(/admin not found/i);
    });
  });

  describe('getWalletBalance', () => {
    it('should return user wallet balance', async () => {
      const balance = await getWalletBalance(testUserId);
      expect(balance).toBe(50000);
    });

    it('should throw error for non-existent user', async () => {
      await expect(getWalletBalance(999))
        .rejects
        .toThrow(/user not found/i);
    });
  });
});
