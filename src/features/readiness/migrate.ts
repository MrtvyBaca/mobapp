// features/readiness/migrate.ts
import { v4 as uuid } from 'uuid';
/* async function migrateV0toV1(userId: string) {
  const list = await legacyReadAll(); // tvoje staré pole
  const migrated = list.map((old) => ({
    id: uuid(),
    userId,
    date: old.date,
    answers: old.answers,
    score: old.score,
    createdAt: old.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  }));
  await writeAllV1(migrated);
}
 */