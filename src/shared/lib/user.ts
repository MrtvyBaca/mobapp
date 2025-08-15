// src/shared/lib/user.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'auth_user_id';

function makeId(): string {
  // Preferuj natívny UUID, fallback na jednoduchý ID string
  const c: any = globalThis.crypto as any;
  return c?.randomUUID
    ? c.randomUUID()
    : `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Vráti existujúci userId, alebo ho vytvorí a uloží. */
export async function ensureUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = makeId();
    await AsyncStorage.setItem(KEY, id);
  }
  return id;
}

/** Prečíta userId (ak chýba, vytvorí). */
export async function getUserId(): Promise<string> {
  const id = await AsyncStorage.getItem(KEY);
  return id ?? (await ensureUserId());
}

/** (voliteľné) manuálne nastavenie/prehodenie usera */
export async function setUserId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEY, id);
}
