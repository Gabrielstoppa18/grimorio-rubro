import type { AttrKey, PowerType } from '../types';

export const ATTRS: { key: AttrKey; name: string; short: string }[] = [
  { key: 'for', name: 'Força', short: 'FOR' },
  { key: 'des', name: 'Destreza', short: 'DES' },
  { key: 'con', name: 'Constituição', short: 'CON' },
  { key: 'int', name: 'Inteligência', short: 'INT' },
  { key: 'sab', name: 'Sabedoria', short: 'SAB' },
  { key: 'car', name: 'Carisma', short: 'CAR' },
];

export const ATTR_SHORT: Record<AttrKey, string> = Object.fromEntries(
  ATTRS.map((a) => [a.key, a.short]),
) as Record<AttrKey, string>;

export interface SkillDef {
  id: string;
  name: string;
  attr: AttrKey;
  trainedOnly?: boolean;
  armorPenalty?: boolean;
}

export const SKILLS: SkillDef[] = [
  { id: 'acrobacia', name: 'Acrobacia', attr: 'des', armorPenalty: true },
  { id: 'adestramento', name: 'Adestramento', attr: 'car', trainedOnly: true },
  { id: 'atletismo', name: 'Atletismo', attr: 'for' },
  { id: 'atuacao', name: 'Atuação', attr: 'car' },
  { id: 'cavalgar', name: 'Cavalgar', attr: 'des' },
  { id: 'conhecimento', name: 'Conhecimento', attr: 'int', trainedOnly: true },
  { id: 'cura', name: 'Cura', attr: 'sab' },
  { id: 'diplomacia', name: 'Diplomacia', attr: 'car' },
  { id: 'enganacao', name: 'Enganação', attr: 'car' },
  { id: 'fortitude', name: 'Fortitude', attr: 'con' },
  { id: 'furtividade', name: 'Furtividade', attr: 'des', armorPenalty: true },
  { id: 'guerra', name: 'Guerra', attr: 'int', trainedOnly: true },
  { id: 'iniciativa', name: 'Iniciativa', attr: 'des' },
  { id: 'intimidacao', name: 'Intimidação', attr: 'car' },
  { id: 'intuicao', name: 'Intuição', attr: 'sab' },
  { id: 'investigacao', name: 'Investigação', attr: 'int' },
  { id: 'jogatina', name: 'Jogatina', attr: 'car', trainedOnly: true },
  { id: 'ladinagem', name: 'Ladinagem', attr: 'des', trainedOnly: true, armorPenalty: true },
  { id: 'luta', name: 'Luta', attr: 'for' },
  { id: 'misticismo', name: 'Misticismo', attr: 'int', trainedOnly: true },
  { id: 'nobreza', name: 'Nobreza', attr: 'int', trainedOnly: true },
  { id: 'oficio', name: 'Ofício', attr: 'int', trainedOnly: true },
  { id: 'percepcao', name: 'Percepção', attr: 'sab' },
  { id: 'pilotagem', name: 'Pilotagem', attr: 'des', trainedOnly: true },
  { id: 'pontaria', name: 'Pontaria', attr: 'des' },
  { id: 'reflexos', name: 'Reflexos', attr: 'des' },
  { id: 'religiao', name: 'Religião', attr: 'sab', trainedOnly: true },
  { id: 'sobrevivencia', name: 'Sobrevivência', attr: 'sab' },
  { id: 'vontade', name: 'Vontade', attr: 'sab' },
];

export const POWER_TYPES: PowerType[] = ['Classe', 'Geral', 'Origem', 'Raça', 'Concedido', 'Tormenta', 'Outro'];

export const SPELL_SCHOOLS = ['Abjuração', 'Adivinhação', 'Convocação', 'Encantamento', 'Evocação', 'Ilusão', 'Necromancia', 'Transmutação'];

/** Custo padrão em PM por círculo de magia. */
export const CIRCLE_COST = [0, 1, 3, 6, 10, 15];

export const SIZES = ['Minúsculo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Colossal'];

/** Modificadores de tamanho: [Furtividade, manobras de combate]. */
export const SIZE_MODS: Record<string, [number, number]> = {
  minúsculo: [5, -5],
  pequeno: [2, -2],
  médio: [0, 0],
  grande: [-2, 2],
  enorme: [-5, 5],
  colossal: [-10, 10],
};

export const ACCENTS = ['#b3242a', '#c9a45c', '#3f6fa8', '#4d8a5a', '#7a4bb0', '#c8641e', '#8c8c8c'];
