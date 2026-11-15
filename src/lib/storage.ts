import type { Character } from '../types';
import { SKILLS } from '../data/rules';

const KEY = 't20-fichas-v1';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function newCharacter(): Character {
  const now = Date.now();
  return {
    id: uid(),
    version: 1,
    createdAt: now,
    updatedAt: now,
    name: '',
    player: '',
    race: '',
    origin: '',
    deity: '',
    size: 'Médio',
    speed: '9m',
    xp: 0,
    photo: '',
    accent: '#b3242a',
    classes: [{ id: uid(), name: '', level: 1, pvInicial: 0, pvPorNivel: 0, pmPorNivel: 0 }],
    attributes: {
      for: { base: 0, bonus: 0 },
      des: { base: 0, bonus: 0 },
      con: { base: 0, bonus: 0 },
      int: { base: 0, bonus: 0 },
      sab: { base: 0, bonus: 0 },
      car: { base: 0, bonus: 0 },
    },
    pv: { current: 0, temp: 0, bonusMax: 0 },
    pm: { current: 0, temp: 0, bonusMax: 0 },
    defense: { useDex: true, other: 0 },
    armor: { name: '', defense: 0, penalty: 0 },
    shield: { name: '', defense: 0, penalty: 0 },
    skills: Object.fromEntries(SKILLS.map((s) => [s.id, { trained: false, other: 0 }])),
    customSkills: [],
    spellcasting: { attr: 'int', cdBonus: 0 },
    powers: [],
    spells: [],
    weapons: [],
    items: [],
    money: 0,
    proficiencies: '',
    languages: 'Comum',
    conditions: '',
    appearance: '',
    backstory: '',
    notes: '',
  };
}

/** Garante que fichas antigas/importadas tenham todos os campos atuais. */
export function normalize(raw: Partial<Character>): Character {
  const base = newCharacter();
  const c = { ...base, ...raw } as Character;
  c.attributes = { ...base.attributes, ...(raw.attributes ?? {}) };
  c.skills = { ...base.skills, ...(raw.skills ?? {}) };
  c.pv = { ...base.pv, ...(raw.pv ?? {}) };
  c.pm = { ...base.pm, ...(raw.pm ?? {}) };
  c.defense = { ...base.defense, ...(raw.defense ?? {}) };
  c.armor = { ...base.armor, ...(raw.armor ?? {}) };
  c.shield = { ...base.shield, ...(raw.shield ?? {}) };
  c.spellcasting = { ...base.spellcasting, ...(raw.spellcasting ?? {}) };
  for (const k of ['classes', 'customSkills', 'powers', 'spells', 'weapons', 'items'] as const) {
    if (!Array.isArray(c[k])) (c as unknown as Record<string, unknown>)[k] = base[k];
  }
  return c;
}

/** Chave das fichas salvas só no navegador (modo local / antes do login). */
export const LOCAL_KEY = KEY;
/** Cópia local das fichas de um usuário logado (funciona offline). */
export const userCacheKey = (userId: string) => `grimorio:fichas:${userId}`;

export function loadAll(key: string = KEY): Character[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.map(normalize) : [];
  } catch {
    return [];
  }
}

export function saveAll(list: Character[], key: string = KEY): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function exportCharacter(c: Character) {
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = (c.name || 'personagem').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_');
  a.href = url;
  a.download = `${safe}.t20.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importCharacter(file: File): Promise<Character> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('Arquivo inválido');
  const c = normalize(data);
  c.id = uid(); // evita sobrescrever uma ficha existente
  c.updatedAt = Date.now();
  return c;
}

/** Redimensiona a imagem para no máx. `max` px e devolve um data URL JPEG. */
export function resizeImage(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
