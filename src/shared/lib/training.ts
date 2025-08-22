// src/shared/lib/training.ts

// ---- Široké kategórie pre štatistiky ----
export type TrainingType =
  | 'Led' // 🏒 nový typ pre ľad
  | 'Silový'
  | 'Beh'
  | 'Bicykel'
  | 'Chôdza'
  | 'Plávanie'
  | 'Veslo'
  | 'Eliptický'
  | 'Švihadlo'
  | 'AirBike'
  | 'SkiErg'
  | 'Turistika'
  | 'Korčule'
  | 'Bežky'
  | 'Mobilita'
  | 'Učebná'
  | 'Kardio'
  | 'Iné';
export type TrackPoint = { lat: number; lon: number; t: number; alt?: number };
// shared/lib/training.ts
export type TrainingRecord = {
  id: string;
  userId: string;
  date: string;
  duration: number;
  description?: string;
  category?: 'Led' | 'Kondice' | 'Ucebna' | 'Jine';
  group?: 'Led' | 'Silovy' | 'Kardio' | 'Mobilita';
  subtype?: string;
  type?: TrainingType;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
  deleted?: boolean;
  syncedAt?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  avgPaceSecPerKm?: number;
  elevationGainM?: number;
  route?: TrackPoint[];
};

export interface Repo<T, Draft> {
  getAll(): Promise<T[]>;
  getRange(from: string, to: string): Promise<T[]>;
  upsert(draft: Draft): Promise<T>;
  update(id: string, patch: Partial<Draft>): Promise<T | null>;
  remove(id: string): Promise<void>; // soft delete odporúčané
}

export type TrainingDraft = Omit<TrainingRecord, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;

// ---- Chips – podtypy do formulára ----
export const LED_SUBTYPES = ['Individuál', 'Tímový', 'Zápas'] as const;

export const SILOVY_SUBTYPES = [
  'Core',
  'Horná časť',
  'Nohy',
  'Celé telo',
  'Push',
  'Pull',
  'Glute/Ham',
  'Kettlebell',
  'TRX',
  'Váha vlastného tela',
  'Olympijské zdvihy',
] as const;

export const KARDIO_SUBTYPES = [
  'Beh – ľahký',
  'Beh – intervaly',
  'Beh – tempo',
  'Dlhý beh',
  'Bicykel – cesta',
  'Bicykel – MTB',
  'Spinning',
  'Veslo (erg)',
  'Eliptický trenažér',
  'Švihadlo',
  'AirBike',
  'SkiErg',
  'Turistika / Trail',
  'Korčule',
  'Bežky',
  'Plávanie',
  'Chôdza',
] as const;

export const MOBILITA_SUBTYPES = [
  'Joga',
  'Stretching',
  'Pilates',
  'Foam rolling',
  'Fyziocviky',
  'Bedrá',
  'Ramená',
  'Hrudník',
  'Členky',
] as const;

// ---- (voliteľné) ikonky do UI ----
export const TYPE_ICON: Record<TrainingType, string> = {
  Led: '🏒',
  Silový: '🏋️',
  Beh: '🏃',
  Bicykel: '🚴',
  Chôdza: '🚶',
  Plávanie: '🏊',
  Veslo: '🚣',
  Eliptický: '🏃‍♂️',
  Švihadlo: '🤸',
  AirBike: '🚴‍♂️',
  SkiErg: '🎿',
  Turistika: '🥾',
  Korčule: '🛼',
  Bežky: '⛷️',
  Mobilita: '🧘',
  Učebná: '📚',
  Kardio: '❤️‍🔥',
  Iné: '✨',
};

// ---- Mapovanie (group, subtype) → široká kategória ----
export function deriveNormalizedType(
  group?: 'Led' | 'Silovy' | 'Kardio' | 'Mobilita',
  subtype?: string,
): TrainingType {
  if (!group) return 'Iné';

  if (group === 'Led') return 'Led';
  if (group === 'Silovy') return 'Silový';
  if (group === 'Mobilita') return 'Mobilita';

  if (group === 'Kardio') {
    const s = (subtype || '').toLowerCase().trim();
    if (!s) return 'Kardio';                         // 👈 default bez subtypu
    if (s.startsWith('beh')) return 'Beh';
    if (s.startsWith('bicykel') || s.includes('spinning') || s.includes('mtb') || s.includes('cesta')) return 'Bicykel';
    if (s.startsWith('plav')) return 'Plávanie';
    if (s.startsWith('chôdza') || s.startsWith('chodza')) return 'Chôdza';
    if (s.includes('veslo') || s.includes('erg')) return 'Veslo';
    if (s.includes('elipt')) return 'Eliptický';
    if (s.includes('švihad') || s.includes('svihad')) return 'Švihadlo';
    if (s.includes('airbike') || s.includes('assault')) return 'AirBike';
    if (s.includes('skierg')) return 'SkiErg';
    if (s.includes('turist') || s.includes('trail') || s.includes('hike')) return 'Turistika';
    if (s.includes('korč') || s.includes('korcule') || s.includes('brusle') || s.includes('inline')) return 'Korčule';
    if (s.includes('bežky') || s.includes('bezky')) return 'Bežky';
    return 'Kardio';                                   // 👈 fallback pri neznámom texte
  }

  return 'Iné';
}


// ---- Univerzálne inferovanie typu (nové aj staré dáta) ----
type InferInput = {
  category?: 'Led' | 'Kondice' | 'Ucebna' | 'Jine';
  group?: 'Led' | 'Silovy' | 'Kardio' | 'Mobilita';
  subtype?: string | null;
  type?: string | null;
  description?: string | null;
};

export function inferType(input: InferInput): TrainingType {
  // Prednosť má explicitná kategória
  if (input.category === 'Led') return 'Led';
  if (input.category === 'Ucebna') return 'Učebná';
  if (input.category === 'Jine') return 'Iné';

  // Nová štruktúra má prednosť
  if (input.group) return deriveNormalizedType(input.group, input.subtype ?? undefined);

  // Staré .type → normalizácia
  if (input.type && String(input.type).trim()) {
    const t = String(input.type).toLowerCase();
    if (t === 'led' || t === 'ice' || t === 'hokej') return 'Led';
    if (t === 'joga') return 'Mobilita';
    if (t === 'silový' || t === 'silovy') return 'Silový';
    if (t === 'beh') return 'Beh';
    if (t === 'bicykel') return 'Bicykel';
    if (t === 'chôdza' || t === 'chodza') return 'Chôdza';
    if (t === 'plávanie' || t === 'plavanie') return 'Plávanie';
    if (t === 'korčule' || t === 'korcule') return 'Korčule';
    if (t === 'veslo') return 'Veslo';
    if (t === 'eliptický' || t === 'elipticky') return 'Eliptický';
    if (t === 'švihadlo' || t === 'svihadlo') return 'Švihadlo';
    if (t === 'airbike' || t === 'assault bike') return 'AirBike';
    if (t === 'skierg') return 'SkiErg';
    if (t === 'turistika') return 'Turistika';
    if (t === 'bežky' || t === 'bezky') return 'Bežky';
    if (t === 'mobilita') return 'Mobilita';
    if (t === 'učebná' || t === 'ucebna') return 'Učebná';
  }

  // Fallback – podľa description
  const s = (input.description ?? '').toLowerCase();
  const tests: Array<[TrainingType, RegExp]> = [
    ['Led', /\b(led|ľad|ice|hokej|zapas|zápas|timovy|tímový|individual|individuál)\b/],
    ['Silový', /\b(silov|posilka|gym|strength|drep|kettlebell|klik|bench|press|mrtv(y|y tah))\b/],
    ['Beh', /\b(beh|behat|run|running|tempo|interval)\b/],
    ['Bicykel', /\b(bicykel|bike|cyklo|cycling|spinning|mtb|cesta)\b/],
    ['Plávanie', /\b(plav|swim|kra|prsia|motyl)\b/],
    ['Chôdza', /\b(chodza|chôdza|walk|walking)\b/],
    ['Veslo', /\b(vesl|row|erg)\b/],
    ['Eliptický', /\b(elipt)\b/],
    ['Švihadlo', /\b(svihad|švihad)\b/],
    ['AirBike', /\b(air ?bike|assault)\b/],
    ['SkiErg', /\b(skierg)\b/],
    ['Turistika', /\b(turist|hike|trail)\b/],
    ['Korčule', /\b(korču|korcule|brusle|inline)\b/],
    ['Bežky', /\b(bezky|bežky|xcski)\b/],
    ['Mobilita', /\b(joga|jóga|yoga|stretch|pilates|foam|fyziocv)\b/],
  ];
  for (const [label, re] of tests) {
    if (re.test(s)) return label;
  }

  return 'Iné';
}
