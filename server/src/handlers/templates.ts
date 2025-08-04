
import { db } from '../db';
import { templatesTable } from '../db/schema';
import { type Template, type CreateTemplateInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTemplates(): Promise<Template[]> {
  try {
    const results = await db.select()
      .from(templatesTable)
      .where(eq(templatesTable.is_active, true))
      .execute();

    return results.map(template => ({
      ...template,
      created_at: template.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    throw error;
  }
}

export async function getTemplateById(id: number): Promise<Template | null> {
  try {
    const results = await db.select()
      .from(templatesTable)
      .where(eq(templatesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const template = results[0];
    return {
      ...template,
      created_at: template.created_at
    };
  } catch (error) {
    console.error('Failed to fetch template by ID:', error);
    throw error;
  }
}

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  try {
    const results = await db.insert(templatesTable)
      .values({
        name: input.name,
        description: input.description,
        preview_image: input.preview_image,
        template_data: input.template_data,
        is_active: input.is_active
      })
      .returning()
      .execute();

    const template = results[0];
    return {
      ...template,
      created_at: template.created_at
    };
  } catch (error) {
    console.error('Template creation failed:', error);
    throw error;
  }
}

export async function updateTemplate(id: number, input: Partial<CreateTemplateInput>): Promise<Template> {
  try {
    const results = await db.update(templatesTable)
      .set({
        ...input,
        // Add updated timestamp if we had one in schema
      })
      .where(eq(templatesTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error(`Template with ID ${id} not found`);
    }

    const template = results[0];
    return {
      ...template,
      created_at: template.created_at
    };
  } catch (error) {
    console.error('Template update failed:', error);
    throw error;
  }
}

export async function deleteTemplate(id: number): Promise<boolean> {
  try {
    const results = await db.update(templatesTable)
      .set({ is_active: false })
      .where(eq(templatesTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Template deletion failed:', error);
    throw error;
  }
}
