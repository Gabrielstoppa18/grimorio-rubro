import { useState } from 'react';
import { Heart, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';
import type { Resource } from '../types';
import { NumInput } from './ui';

export function ResourceTracker({
  kind,
  res,
  max,
  onChange,
}: {
  kind: 'pv' | 'pm';
  res: Resource;
  max: number;
  onChange: (r: Resource) => void;
}) {
  const [amount, setAmount] = useState(1);
  const label = kind === 'pv' ? 'Pontos de Vida' : 'Pontos de Mana';
  const pct = max > 0 ? Math.max(0, Math.min(100, (res.current / max) * 100)) : 0;
  const low = kind === 'pv' && res.current <= max / 4;
  const down = res.current <= 0;

  const set = (patch: Partial<Resource>) => onChange({ ...res, ...patch });

  /** Dano consome primeiro os pontos temporários. */
  const spend = (n: number) => {
    let left = n;
    let temp = res.temp;
    if (temp > 0) {
      const used = Math.min(temp, left);
      temp -= used;
      left -= used;
    }
    const floor = kind === 'pm' ? 0 : -999;
    set({ temp, current: Math.max(floor, res.current - left) });
  };
  const gain = (n: number) => set({ current: Math.min(max, res.current + n) });

  return (
    <div className={`tracker tracker-${kind} ${low ? 'is-low' : ''} ${down ? 'is-down' : ''}`}>
      <div className="tracker-top">
        <span className="tracker-label">
          {kind === 'pv' ? <Heart size={15} /> : <Sparkles size={15} />} {label}
        </span>
        <button className="icon-btn sm" title="Restaurar ao máximo" onClick={() => set({ current: max })}>
          <RotateCcw size={13} />
        </button>
      </div>
      <div className="tracker-values" style={{ ['--digits' as string]: String(res.current).length }}>
        <NumInput className="tracker-current" value={res.current} onChange={(n) => set({ current: n })} ariaLabel={`${label} atuais`} />
        <span className="tracker-max">/ {max}</span>
        {res.temp > 0 && <span className="tracker-temp">+{res.temp} temp</span>}
      </div>
      <div className="bar">
        <span style={{ width: `${pct}%` }} />
        {res.temp > 0 && max > 0 && <i style={{ width: `${Math.min(100, (res.temp / max) * 100)}%` }} />}
      </div>
      <div className="tracker-controls">
        <button className="btn sm hurt" onClick={() => spend(amount)} title={kind === 'pv' ? 'Sofrer dano' : 'Gastar PM'}>
          <Minus size={14} /> {kind === 'pv' ? 'Dano' : 'Gastar'}
        </button>
        <NumInput className="tracker-amount" value={amount} min={0} onChange={setAmount} ariaLabel="Quantidade" />
        <button className="btn sm heal" onClick={() => gain(amount)} title={kind === 'pv' ? 'Curar' : 'Recuperar PM'}>
          <Plus size={14} /> {kind === 'pv' ? 'Cura' : 'Recup.'}
        </button>
      </div>
      <div className="tracker-extra">
        <label>
          Temp. <NumInput value={res.temp} min={0} onChange={(n) => set({ temp: n })} ariaLabel="Temporários" />
        </label>
        <label title="Bônus no máximo (poderes, itens…)">
          Bônus máx. <NumInput value={res.bonusMax} onChange={(n) => set({ bonusMax: n })} ariaLabel="Bônus no máximo" />
        </label>
      </div>
    </div>
  );
}
