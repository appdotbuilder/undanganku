
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function registerUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password
    const hashedPassword = await Bun.password.hash(input.password);

    // Check if email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('Email already registered');
    }

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password: hashedPassword,
        name: input.name,
        phone: input.phone,
        role: input.role,
        wallet_balance: '0.00' // Convert number to string for numeric column
      })
      .returning()
      .execute();

    const user = result[0];
    return {
      ...user,
      wallet_balance: parseFloat(user.wallet_balance) // Convert string back to number
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await Bun.password.verify(input.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token (simplified - in production use proper JWT library)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const token = await Bun.password.hash(JSON.stringify(tokenPayload));

    return {
      user: {
        ...user,
        wallet_balance: parseFloat(user.wallet_balance) // Convert string back to number
      },
      token
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<User> {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    return {
      ...user,
      wallet_balance: parseFloat(user.wallet_balance) // Convert string back to number
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}
