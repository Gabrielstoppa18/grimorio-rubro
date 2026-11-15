export interface RollResult {
  label: string;
  expression: string;
  rolls: number[];
  total: number;
  natural?: number; // valor do d20, quando aplicável
  crit?: boolean;
  fumble?: boolean;
}

const rand = (sides: number) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % sides) + 1;
};

export function rollD20(label: string, bonus: number, critRange = 20): RollResult {
  const n = rand(20);
  return {
    label,
    expression: `1d20${bonus >= 0 ? '+' : ''}${bonus}`,
    rolls: [n],
    natural: n,
    total: n + bonus,
    crit: n >= critRange,
    fumble: n === 1,
  };
}

/** Rola expressões como "2d6+3", "1d8 + 1d6 - 1". Retorna null se não entender. */
export function rollExpression(label: string, expr: string, multiplier = 1): RollResult | null {
  const clean = expr.replace(/\s+/g, '').toLowerCase();
  if (!clean) return null;
  const parts = clean.match(/[+-]?[^+-]+/g);
  if (!parts) return null;
  const rolls: number[] = [];
  let total = 0;
  for (const raw of parts) {
    const sign = raw.startsWith('-') ? -1 : 1;
    const p = raw.replace(/^[+-]/, '');
    const m = p.match(/^(\d*)d(\d+)$/);
    if (m) {
      const count = (parseInt(m[1] || '1', 10) || 1) * multiplier;
      const sides = parseInt(m[2], 10);
      if (count > 200 || sides < 1) return null;
      for (let i = 0; i < count; i++) {
        const r = rand(sides);
        rolls.push(r);
        total += sign * r;
      }
    } else if (/^\d+$/.test(p)) {
      total += sign * parseInt(p, 10);
    } else {
      return null;
    }
  }
  return { label, expression: multiplier > 1 ? `${expr} (×${multiplier})` : expr, rolls, total };
}

/** "19/x3" -> { range: 19, mult: 3 } */
export function parseCrit(crit: string) {
  const range = parseInt(crit.match(/^(\d+)/)?.[1] ?? '20', 10);
  const mult = parseInt(crit.match(/x(\d+)/i)?.[1] ?? '2', 10);
  return { range: isNaN(range) ? 20 : range, mult: isNaN(mult) ? 2 : mult };
}
