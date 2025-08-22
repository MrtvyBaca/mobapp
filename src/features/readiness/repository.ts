// features/readiness/repository.ts
import type { ReadinessEntry, ReadinessAnswers } from '@/shared/lib/readiness';

export interface ReadinessRepo {
  getByDate(userId: string, date: string): Promise<ReadinessEntry | null>;
  getRange(userId: string, from: string, to: string): Promise<ReadinessEntry[]>;
  upsert(userId: string, date: string, answers: ReadinessAnswers): Promise<ReadinessEntry>;
  deleteByDate(userId: string, date: string): Promise<void>;
  lastSyncedAt?(): Promise<string | null>; // pre sync
  setLastSyncedAt?(iso: string): Promise<void>;
}
