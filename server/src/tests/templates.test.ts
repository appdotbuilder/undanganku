
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { templatesTable } from '../db/schema';
import { type CreateTemplateInput } from '../schema';
import { 
  getTemplates, 
  getTemplateById, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate 
} from '../handlers/templates';
import { eq } from 'drizzle-orm';

const testTemplateInput: CreateTemplateInput = {
  name: 'Elegant Wedding Template',
  description: 'A beautiful elegant template for weddings',
  preview_image: 'https://example.com/preview.jpg',
  template_data: '{"layout": "elegant", "colors": ["gold", "white"]}',
  is_active: true
};

const minimalTemplateInput: CreateTemplateInput = {
  name: 'Minimal Template',
  description: null,
  preview_image: null,
  template_data: '{"layout": "minimal"}',
  is_active: true
};

describe('Template Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createTemplate', () => {
    it('should create a template with all fields', async () => {
      const result = await createTemplate(testTemplateInput);

      expect(result.name).toEqual('Elegant Wedding Template');
      expect(result.description).toEqual('A beautiful elegant template for weddings');
      expect(result.preview_image).toEqual('https://example.com/preview.jpg');
      expect(result.template_data).toEqual('{"layout": "elegant", "colors": ["gold", "white"]}');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a template with minimal fields', async () => {
      const result = await createTemplate(minimalTemplateInput);

      expect(result.name).toEqual('Minimal Template');
      expect(result.description).toBeNull();
      expect(result.preview_image).toBeNull();
      expect(result.template_data).toEqual('{"layout": "minimal"}');
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save template to database', async () => {
      const result = await createTemplate(testTemplateInput);

      const templates = await db.select()
        .from(templatesTable)
        .where(eq(templatesTable.id, result.id))
        .execute();

      expect(templates).toHaveLength(1);
      expect(templates[0].name).toEqual('Elegant Wedding Template');
      expect(templates[0].is_active).toBe(true);
      expect(templates[0].created_at).toBeInstanceOf(Date);
    });
  });

  describe('getTemplates', () => {
    it('should return empty array when no templates exist', async () => {
      const result = await getTemplates();
      expect(result).toEqual([]);
    });

    it('should return only active templates', async () => {
      // Create active template
      await createTemplate(testTemplateInput);
      
      // Create inactive template
      await createTemplate({
        ...minimalTemplateInput,
        name: 'Inactive Template',
        is_active: false
      });

      const result = await getTemplates();

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Elegant Wedding Template');
      expect(result[0].is_active).toBe(true);
    });

    it('should return multiple active templates', async () => {
      await createTemplate(testTemplateInput);
      await createTemplate(minimalTemplateInput);

      const result = await getTemplates();

      expect(result).toHaveLength(2);
      expect(result.map(t => t.name)).toContain('Elegant Wedding Template');
      expect(result.map(t => t.name)).toContain('Minimal Template');
      result.forEach(template => {
        expect(template.is_active).toBe(true);
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return null for non-existent template', async () => {
      const result = await getTemplateById(999);
      expect(result).toBeNull();
    });

    it('should return template by ID', async () => {
      const created = await createTemplate(testTemplateInput);
      const result = await getTemplateById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Elegant Wedding Template');
      expect(result!.description).toEqual(testTemplateInput.description);
      expect(result!.template_data).toEqual(testTemplateInput.template_data);
    });

    it('should return inactive template by ID', async () => {
      const created = await createTemplate({
        ...testTemplateInput,
        is_active: false
      });

      const result = await getTemplateById(created.id);

      expect(result).not.toBeNull();
      expect(result!.is_active).toBe(false);
    });
  });

  describe('updateTemplate', () => {
    it('should update template fields', async () => {
      const created = await createTemplate(testTemplateInput);

      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description',
        is_active: false
      };

      const result = await updateTemplate(created.id, updateData);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Template Name');
      expect(result.description).toEqual('Updated description');
      expect(result.is_active).toBe(false);
      expect(result.template_data).toEqual(testTemplateInput.template_data); // Unchanged
    });

    it('should update only provided fields', async () => {
      const created = await createTemplate(testTemplateInput);

      const result = await updateTemplate(created.id, {
        name: 'New Name Only'
      });

      expect(result.name).toEqual('New Name Only');
      expect(result.description).toEqual(testTemplateInput.description); // Unchanged
      expect(result.is_active).toBe(true); // Unchanged
    });

    it('should throw error for non-existent template', async () => {
      await expect(updateTemplate(999, { name: 'New Name' }))
        .rejects.toThrow(/Template with ID 999 not found/i);
    });

    it('should save changes to database', async () => {
      const created = await createTemplate(testTemplateInput);
      await updateTemplate(created.id, { name: 'Database Updated Name' });

      const templates = await db.select()
        .from(templatesTable)
        .where(eq(templatesTable.id, created.id))
        .execute();

      expect(templates).toHaveLength(1);
      expect(templates[0].name).toEqual('Database Updated Name');
    });
  });

  describe('deleteTemplate', () => {
    it('should soft delete template (set is_active to false)', async () => {
      const created = await createTemplate(testTemplateInput);

      const result = await deleteTemplate(created.id);

      expect(result).toBe(true);

      // Verify template still exists but is inactive
      const template = await getTemplateById(created.id);
      expect(template).not.toBeNull();
      expect(template!.is_active).toBe(false);
    });

    it('should return false for non-existent template', async () => {
      const result = await deleteTemplate(999);
      expect(result).toBe(false);
    });

    it('should remove template from active templates list', async () => {
      const created = await createTemplate(testTemplateInput);
      await createTemplate(minimalTemplateInput);

      // Delete one template
      await deleteTemplate(created.id);

      const activeTemplates = await getTemplates();
      expect(activeTemplates).toHaveLength(1);
      expect(activeTemplates[0].name).toEqual('Minimal Template');
    });

    it('should save deletion to database', async () => {
      const created = await createTemplate(testTemplateInput);
      await deleteTemplate(created.id);

      const templates = await db.select()
        .from(templatesTable)
        .where(eq(templatesTable.id, created.id))
        .execute();

      expect(templates).toHaveLength(1);
      expect(templates[0].is_active).toBe(false);
    });
  });
});
