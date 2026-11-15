export type AttrKey = 'for' | 'des' | 'con' | 'int' | 'sab' | 'car';

export interface Attribute {
  base: number;
  bonus: number;
}

export interface ClassEntry {
  id: string;
  name: string;
  level: number;
  pvInicial: number;
  pvPorNivel: number;
  pmPorNivel: number;
}

export interface SkillState {
  trained: boolean;
  other: number;
  attr?: AttrKey;
}

export interface CustomSkill {
  id: string;
  name: string;
  attr: AttrKey;
  trained: boolean;
  other: number;
}

export type PowerType = 'Classe' | 'Geral' | 'Origem' | 'Raça' | 'Concedido' | 'Tormenta' | 'Outro';

export interface Power {
  id: string;
  name: string;
  type: PowerType;
  cost: number;
  description: string;
}

export interface Spell {
  id: string;
  name: string;
  circle: number;
  type: 'Arcana' | 'Divina' | 'Universal';
  school: string;
  execution: string;
  range: string;
  target: string;
  duration: string;
  resistance: string;
  cost: number | null; // null = custo padrão do círculo
  description: string;
}

export interface Weapon {
  id: string;
  name: string;
  skill: 'luta' | 'pontaria';
  attackBonus: number;
  damage: string;
  crit: string;
  damageType: string;
  range: string;
  notes: string;
}

export interface Item {
  id: string;
  name: string;
  qty: number;
  spaces: number;
  notes: string;
}

export interface ArmorPiece {
  name: string;
  defense: number;
  penalty: number;
}

export interface Resource {
  current: number;
  temp: number;
  bonusMax: number;
}

export interface Character {
  id: string;
  version: 1;
  createdAt: number;
  updatedAt: number;

  name: string;
  player: string;
  race: string;
  origin: string;
  deity: string;
  size: string;
  speed: string;
  xp: number;
  photo: string;
  accent: string;

  classes: ClassEntry[];
  attributes: Record<AttrKey, Attribute>;

  pv: Resource;
  pm: Resource;

  defense: { useDex: boolean; other: number };
  armor: ArmorPiece;
  shield: ArmorPiece;

  skills: Record<string, SkillState>;
  customSkills: CustomSkill[];

  spellcasting: { attr: AttrKey; cdBonus: number };

  powers: Power[];
  spells: Spell[];
  weapons: Weapon[];
  items: Item[];
  money: number;

  proficiencies: string;
  languages: string;
  conditions: string;
  appearance: string;
  backstory: string;
  notes: string;
}
