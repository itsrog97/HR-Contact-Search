import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string, collegeId?: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      if (name && existing[0].name !== name) {
        const [updated] = await db.update(users)
          .set({ name, updatedAt: new Date() })
          .where(eq(users.uid, uid))
          .returning();
        return updated;
      }
      return existing[0];
    }

    const [newUser] = await db.insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0],
        collegeId: collegeId || null,
        role: 'placement_member',
      })
      .returning();

    return newUser;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Failed to retrieve or create user', { cause: error });
  }
}

export async function getUserById(id: string) {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw new Error('Failed to fetch user', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error in getUserByUid:', error);
    throw new Error('Failed to fetch user by UID', { cause: error });
  }
}
