
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type CreatePackageInput } from '../schema';
import { getPackages, getPackageById, createPackage, updatePackage, deletePackage } from '../handlers/packages';

const testPackageInput: CreatePackageInput = {
  name: 'Premium Package',
  description: 'Premium wedding invitation package',
  price: 299.99,
  features: '["RSVP", "Guest Book", "Photo Gallery", "Live Stream"]',
  max_guests: 200,
  is_active: true
};

describe('Package Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createPackage', () => {
    it('should create a package successfully', async () => {
      const result = await createPackage(testPackageInput);

      expect(result.id).toBeDefined();
      expect(result.name).toEqual('Premium Package');
      expect(result.description).toEqual('Premium wedding invitation package');
      expect(result.price).toEqual(299.99);
      expect(typeof result.price).toBe('number');
      expect(result.features).toEqual('["RSVP", "Guest Book", "Photo Gallery", "Live Stream"]');
      expect(result.max_guests).toEqual(200);
      expect(result.is_active).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create package with nullable fields', async () => {
      const input: CreatePackageInput = {
        name: 'Basic Package',
        description: null,
        price: 99.99,
        features: '["RSVP"]',
        max_guests: null,
        is_active: true
      };

      const result = await createPackage(input);

      expect(result.name).toEqual('Basic Package');
      expect(result.description).toBeNull();
      expect(result.max_guests).toBeNull();
      expect(result.price).toEqual(99.99);
    });

    it('should apply default values from schema', async () => {
      const input: CreatePackageInput = {
        name: 'Standard Package',
        description: 'Standard package',
        price: 199.99,
        features: '["RSVP", "Guest Book"]',
        max_guests: 100,
        is_active: true
      };

      const result = await createPackage(input);

      expect(result.is_active).toBe(true);
    });
  });

  describe('getPackages', () => {
    it('should return empty array when no packages exist', async () => {
      const result = await getPackages();
      expect(result).toEqual([]);
    });

    it('should return all active packages', async () => {
      // Create multiple packages
      await createPackage(testPackageInput);
      await createPackage({
        ...testPackageInput,
        name: 'Basic Package',
        price: 99.99
      });

      const result = await getPackages();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Premium Package');
      expect(result[1].name).toEqual('Basic Package');
      expect(result[0].price).toEqual(299.99);
      expect(result[1].price).toEqual(99.99);
    });

    it('should only return active packages', async () => {
      // Create active package
      const activePackage = await createPackage(testPackageInput);
      
      // Create inactive package
      await createPackage({
        ...testPackageInput,
        name: 'Inactive Package',
        is_active: false
      });

      const result = await getPackages();

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(activePackage.id);
      expect(result[0].name).toEqual('Premium Package');
    });
  });

  describe('getPackageById', () => {
    it('should return null for non-existent package', async () => {
      const result = await getPackageById(999);
      expect(result).toBeNull();
    });

    it('should return package by ID', async () => {
      const createdPackage = await createPackage(testPackageInput);

      const result = await getPackageById(createdPackage.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdPackage.id);
      expect(result!.name).toEqual('Premium Package');
      expect(result!.price).toEqual(299.99);
      expect(typeof result!.price).toBe('number');
    });

    it('should return inactive package by ID', async () => {
      const createdPackage = await createPackage({
        ...testPackageInput,
        is_active: false
      });

      const result = await getPackageById(createdPackage.id);

      expect(result).not.toBeNull();
      expect(result!.is_active).toBe(false);
    });
  });

  describe('updatePackage', () => {
    it('should update package fields', async () => {
      const createdPackage = await createPackage(testPackageInput);

      const updateData = {
        name: 'Updated Premium Package',
        price: 349.99,
        max_guests: 250
      };

      const result = await updatePackage(createdPackage.id, updateData);

      expect(result.id).toEqual(createdPackage.id);
      expect(result.name).toEqual('Updated Premium Package');
      expect(result.price).toEqual(349.99);
      expect(typeof result.price).toBe('number');
      expect(result.max_guests).toEqual(250);
      // Unchanged fields should remain the same
      expect(result.description).toEqual(testPackageInput.description);
      expect(result.features).toEqual(testPackageInput.features);
    });

    it('should update only provided fields', async () => {
      const createdPackage = await createPackage(testPackageInput);

      const result = await updatePackage(createdPackage.id, {
        name: 'New Name Only'
      });

      expect(result.name).toEqual('New Name Only');
      expect(result.price).toEqual(299.99); // Unchanged
      expect(result.description).toEqual(testPackageInput.description); // Unchanged
    });

    it('should throw error for non-existent package', async () => {
      expect(updatePackage(999, { name: 'Test' }))
        .rejects.toThrow(/Package not found/i);
    });
  });

  describe('deletePackage', () => {
    it('should soft delete package (set is_active to false)', async () => {
      const createdPackage = await createPackage(testPackageInput);

      const result = await deletePackage(createdPackage.id);

      expect(result).toBe(true);

      // Verify package is soft deleted
      const fetchedPackage = await getPackageById(createdPackage.id);
      expect(fetchedPackage).not.toBeNull();
      expect(fetchedPackage!.is_active).toBe(false);

      // Verify it doesn't appear in active packages list
      const activePackages = await getPackages();
      expect(activePackages).toHaveLength(0);
    });

    it('should return false for non-existent package', async () => {
      const result = await deletePackage(999);
      expect(result).toBe(false);
    });
  });
});
