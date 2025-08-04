
import { db } from '../db';
import { packagesTable } from '../db/schema';
import { type Package, type CreatePackageInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPackages(): Promise<Package[]> {
  try {
    const results = await db.select()
      .from(packagesTable)
      .where(eq(packagesTable.is_active, true))
      .execute();

    return results.map(pkg => ({
      ...pkg,
      price: parseFloat(pkg.price)
    }));
  } catch (error) {
    console.error('Failed to fetch packages:', error);
    throw error;
  }
}

export async function getPackageById(id: number): Promise<Package | null> {
  try {
    const results = await db.select()
      .from(packagesTable)
      .where(eq(packagesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const pkg = results[0];
    return {
      ...pkg,
      price: parseFloat(pkg.price)
    };
  } catch (error) {
    console.error('Failed to fetch package by ID:', error);
    throw error;
  }
}

export async function createPackage(input: CreatePackageInput): Promise<Package> {
  try {
    const results = await db.insert(packagesTable)
      .values({
        name: input.name,
        description: input.description,
        price: input.price.toString(),
        features: input.features,
        max_guests: input.max_guests,
        is_active: input.is_active
      })
      .returning()
      .execute();

    const pkg = results[0];
    return {
      ...pkg,
      price: parseFloat(pkg.price)
    };
  } catch (error) {
    console.error('Failed to create package:', error);
    throw error;
  }
}

export async function updatePackage(id: number, input: Partial<CreatePackageInput>): Promise<Package> {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price !== undefined) updateData.price = input.price.toString();
    if (input.features !== undefined) updateData.features = input.features;
    if (input.max_guests !== undefined) updateData.max_guests = input.max_guests;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const results = await db.update(packagesTable)
      .set(updateData)
      .where(eq(packagesTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error('Package not found');
    }

    const pkg = results[0];
    return {
      ...pkg,
      price: parseFloat(pkg.price)
    };
  } catch (error) {
    console.error('Failed to update package:', error);
    throw error;
  }
}

export async function deletePackage(id: number): Promise<boolean> {
  try {
    const results = await db.update(packagesTable)
      .set({ is_active: false })
      .where(eq(packagesTable.id, id))
      .returning({ id: packagesTable.id })
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Failed to delete package:', error);
    throw error;
  }
}
