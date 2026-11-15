import type { AttrKey, Character } from '../types';
import { CIRCLE_COST, SIZE_MODS, SKILLS, type SkillDef } from '../data/rules';

export const attr = (c: Character, k: AttrKey) => c.attributes[k].base + c.attributes[k].bonus;

export const totalLevel = (c: Character) => Math.max(1, c.classes.reduce((s, cl) => s + cl.level, 0));

export const halfLevel = (c: Character) => Math.floor(totalLevel(c) / 2);

export const trainingBonus = (level: number) => (level >= 15 ? 6 : level >= 7 ? 4 : 2);

export function maxPV(c: Character) {
  const con = attr(c, 'con');
  let total = 0;
  c.classes.forEach((cl, i) => {
    if (cl.level <= 0) return;
    if (i === 0) total += cl.pvInicial + con + (cl.level - 1) * (cl.pvPorNivel + con);
    else total += cl.level * (cl.pvPorNivel + con);
  });
  return Math.max(1, total + c.pv.bonusMax);
}

export function maxPM(c: Character) {
  const total = c.classes.reduce((s, cl) => s + cl.level * cl.pmPorNivel, 0);
  return Math.max(0, total + c.pm.bonusMax);
}

export const armorPenalty = (c: Character) => (c.armor.penalty || 0) + (c.shield.penalty || 0);

export function defense(c: Character) {
  return 10 + (c.defense.useDex ? attr(c, 'des') : 0) + (c.armor.defense || 0) + (c.shield.defense || 0) + (c.defense.other || 0);
}

/** [mod. de Furtividade, mod. de manobras] de acordo com o tamanho. */
export const sizeMods = (c: Character): [number, number] => SIZE_MODS[c.size.trim().toLowerCase()] ?? [0, 0];

export interface SkillParts {
  half: number;
  attrKey: AttrKey;
  attr: number;
  training: number;
  other: number;
  armor: number;
  size: number;
}

export function skillParts(c: Character, def: SkillDef): SkillParts {
  const st = c.skills[def.id] ?? { trained: false, other: 0 };
  const attrKey = st.attr ?? def.attr;
  return {
    half: halfLevel(c),
    attrKey,
    attr: attr(c, attrKey),
    training: st.trained ? trainingBonus(totalLevel(c)) : 0,
    other: st.other || 0,
    armor: def.armorPenalty ? -armorPenalty(c) : 0,
    size: def.id === 'furtividade' ? sizeMods(c)[0] : 0,
  };
}

export function skillTotal(c: Character, def: SkillDef) {
  const p = skillParts(c, def);
  return p.half + p.attr + p.training + p.other + p.armor + p.size;
}

export const skillById = (id: string) => SKILLS.find((s) => s.id === id)!;

export const spellCD = (c: Character) => 10 + halfLevel(c) + attr(c, c.spellcasting.attr) + (c.spellcasting.cdBonus || 0);

export const spellCost = (circle: number, cost: number | null) => cost ?? CIRCLE_COST[circle] ?? 0;

/** 10 + 2×Força; com Força negativa, perde só 1 espaço por ponto. */
export const carryCapacity = (c: Character) => {
  const f = attr(c, 'for');
  return Math.max(0, f >= 0 ? 10 + 2 * f : 10 + f);
};

export const usedSpaces = (c: Character) => c.items.reduce((s, it) => s + (it.qty || 0) * (it.spaces || 0), 0);

export function weaponAttack(c: Character, w: { skill: 'luta' | 'pontaria'; attackBonus: number }) {
  return skillTotal(c, skillById(w.skill)) + (w.attackBonus || 0);
}

export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
