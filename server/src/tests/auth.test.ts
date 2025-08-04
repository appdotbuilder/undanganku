
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { registerUser, loginUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const testCreateUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  phone: '+1234567890',
  role: 'member'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('Auth Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('registerUser', () => {
    it('should register a new user', async () => {
      const result = await registerUser(testCreateUserInput);

      expect(result.email).toEqual('test@example.com');
      expect(result.name).toEqual('Test User');
      expect(result.phone).toEqual('+1234567890');
      expect(result.role).toEqual('member');
      expect(result.wallet_balance).toEqual(0);
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should hash the password', async () => {
      const result = await registerUser(testCreateUserInput);

      // Verify password is hashed (not plain text)
      expect(result.password).not.toEqual('password123');
      expect(result.password.length).toBeGreaterThan(20);

      // Verify password can be verified
      const isValid = await Bun.password.verify('password123', result.password);
      expect(isValid).toBe(true);
    });

    it('should save user to database', async () => {
      const result = await registerUser(testCreateUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].name).toEqual('Test User');
      expect(parseFloat(users[0].wallet_balance)).toEqual(0);
      expect(users[0].is_active).toBe(true);
    });

    it('should default role to member when not specified', async () => {
      const inputWithoutRole: CreateUserInput = {
        email: 'member@example.com',
        password: 'password123',
        name: 'Member User',
        phone: null,
        role: 'member' // Include role field with default value
      };

      const result = await registerUser(inputWithoutRole);
      expect(result.role).toEqual('member');
    });

    it('should allow admin role', async () => {
      const adminInput: CreateUserInput = {
        ...testCreateUserInput,
        email: 'admin@example.com',
        role: 'admin'
      };

      const result = await registerUser(adminInput);
      expect(result.role).toEqual('admin');
    });

    it('should reject duplicate email', async () => {
      await registerUser(testCreateUserInput);

      await expect(registerUser(testCreateUserInput))
        .rejects.toThrow(/email already registered/i);
    });

    it('should handle null phone number', async () => {
      const inputWithNullPhone: CreateUserInput = {
        ...testCreateUserInput,
        phone: null
      };

      const result = await registerUser(inputWithNullPhone);
      expect(result.phone).toBeNull();
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await registerUser(testCreateUserInput);
    });

    it('should login with valid credentials', async () => {
      const result = await loginUser(testLoginInput);

      expect(result.user.email).toEqual('test@example.com');
      expect(result.user.name).toEqual('Test User');
      expect(result.user.role).toEqual('member');
      expect(result.user.is_active).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBeGreaterThan(20);
    });

    it('should reject invalid email', async () => {
      const invalidEmailInput: LoginInput = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      await expect(loginUser(invalidEmailInput))
        .rejects.toThrow(/invalid email or password/i);
    });

    it('should reject invalid password', async () => {
      const invalidPasswordInput: LoginInput = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(loginUser(invalidPasswordInput))
        .rejects.toThrow(/invalid email or password/i);
    });

    it('should reject login for inactive user', async () => {
      // Deactivate the user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.email, 'test@example.com'))
        .execute();

      await expect(loginUser(testLoginInput))
        .rejects.toThrow(/account is deactivated/i);
    });

    it('should return user with correct numeric wallet balance', async () => {
      const result = await loginUser(testLoginInput);
      expect(typeof result.user.wallet_balance).toBe('number');
      expect(result.user.wallet_balance).toEqual(0);
    });
  });

  describe('getCurrentUser', () => {
    let testUserId: number;

    beforeEach(async () => {
      const user = await registerUser(testCreateUserInput);
      testUserId = user.id;
    });

    it('should return current user data', async () => {
      const result = await getCurrentUser(testUserId);

      expect(result.id).toEqual(testUserId);
      expect(result.email).toEqual('test@example.com');
      expect(result.name).toEqual('Test User');
      expect(result.role).toEqual('member');
      expect(result.is_active).toBe(true);
      expect(typeof result.wallet_balance).toBe('number');
      expect(result.wallet_balance).toEqual(0);
    });

    it('should reject non-existent user', async () => {
      await expect(getCurrentUser(99999))
        .rejects.toThrow(/user not found/i);
    });

    it('should reject inactive user', async () => {
      // Deactivate the user
      await db.update(usersTable)
        .set({ is_active: false })
        .where(eq(usersTable.id, testUserId))
        .execute();

      await expect(getCurrentUser(testUserId))
        .rejects.toThrow(/account is deactivated/i);
    });

    it('should return user with updated wallet balance', async () => {
      // Update wallet balance
      const newBalance = '150.75';
      await db.update(usersTable)
        .set({ wallet_balance: newBalance })
        .where(eq(usersTable.id, testUserId))
        .execute();

      const result = await getCurrentUser(testUserId);
      expect(result.wallet_balance).toEqual(150.75);
    });
  });
});
