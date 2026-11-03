import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { NewPrompt, prompt, Prompt } from '@/config/db/schema';

export const PromptStatus = {
  PUBLISHED: 'published',
  DRAFT: 'draft',
} as const;

export async function getPrompts({
  page = 1,
  limit = 30,
  status = PromptStatus.PUBLISHED,
  type,
}: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
} = {}): Promise<Prompt[]> {
  try {
    const offset = (page - 1) * limit;
    const conditions = [];
    if (status) {
      conditions.push(eq(prompt.status, status));
    }
    if (type) {
      conditions.push(eq(prompt.type, type));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const database = db();

    return await database
      .select()
      .from(prompt)
      .where(where)
      .orderBy(desc(prompt.sort), desc(prompt.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error('getPrompts error:', error);
    return [];
  }
}

export async function getPromptsCount({
  status,
  type,
}: {
  status?: string;
  type?: string;
} = {}): Promise<number> {
  try {
    const conditions = [];
    if (status) {
      conditions.push(eq(prompt.status, status));
    }
    if (type) {
      conditions.push(eq(prompt.type, type));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const database = db();
    const result = await database
      .select({ count: count() })
      .from(prompt)
      .where(where);

    return result[0]?.count || 0;
  } catch (error) {
    console.error('getPromptsCount error:', error);
    return 0;
  }
}

export async function findPromptByTitle(title: string): Promise<Prompt | null> {
  try {
    const database = db();
    const result = await database
      .select()
      .from(prompt)
      .where(eq(prompt.promptTitle, title))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('findPromptByTitle error:', error);
    return null;
  }
}

export async function findPromptById(id: string): Promise<Prompt | null> {
  try {
    const database = db();
    const result = await database
      .select()
      .from(prompt)
      .where(eq(prompt.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('findPromptById error:', error);
    return null;
  }
}
