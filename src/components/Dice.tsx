import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Dices, X } from 'lucide-react';
import type { RollResult } from '../lib/dice';

interface Ctx {
  push: (r: RollResult) => void;
}
const DiceCtx = createContext<Ctx>({ push: () => {} });
export const useDice = () => useContext(DiceCtx);

interface Entry extends RollResult {
  key: number;
}

export function DiceProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(true);

  const push = useCallback((r: RollResult) => {
    const key = Date.now() + Math.random();
    setEntries((e) => [{ ...r, key }, ...e].slice(0, 20));
    setOpen(true);
  }, []);

  const latest = entries[0];

  return (
    <DiceCtx.Provider value={{ push }}>
      {children}
      {latest && open && (
        <div className="dice-tray" aria-live="polite">
          <div className="dice-tray-head">
            <span>
              <Dices size={14} /> Rolagens
            </span>
            <button className="icon-btn sm" onClick={() => setOpen(false)} aria-label="Fechar rolagens">
              <X size={14} />
            </button>
          </div>
          {entries.slice(0, 4).map((r, i) => (
            <div key={r.key} className={`roll ${i === 0 ? 'roll-latest' : ''} ${r.crit ? 'is-crit' : ''} ${r.fumble ? 'is-fumble' : ''}`}>
              <div className="roll-main">
                <span className="roll-label">{r.label}</span>
                <span className="roll-detail">
                  {r.expression} · [{r.rolls.join(', ')}]
                  {r.crit && ' · CRÍTICO!'}
                  {r.fumble && ' · falha natural'}
                </span>
              </div>
              <span className="roll-total">{r.total}</span>
            </div>
          ))}
        </div>
      )}
    </DiceCtx.Provider>
  );
}
