import { Backpack, Coins, Plus, Trash2 } from 'lucide-react';
import type { Updater } from '../../App';
import type { Character, Item } from '../../types';
import { carryCapacity, usedSpaces } from '../../lib/calc';
import { uid } from '../../lib/storage';
import { Empty, NumInput, Panel } from '../ui';

export function InventoryTab({ c, update }: { c: Character; update: Updater }) {
  const cap = carryCapacity(c);
  const used = usedSpaces(c);
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 100;
  const over = used > cap;

  const setItem = (id: string, patch: Partial<Item>) =>
    update((d) => {
      const it = d.items.find((x) => x.id === id);
      if (it) Object.assign(it, patch);
    });

  return (
    <div className="list-page">
      <div className="inv-top">
        <Panel className="money">
          <div className="big-stat">
            <small>
              <Coins size={14} /> Dinheiro
            </small>
            <div className="money-input">
              <span>T$</span>
              <NumInput value={c.money} onChange={(n) => update((d) => void (d.money = n))} ariaLabel="Tibares" />
            </div>
          </div>
          <div className="money-quick">
            {[-100, -10, -1, 1, 10, 100].map((n) => (
              <button key={n} className="btn sm ghost" onClick={() => update((d) => void (d.money = d.money + n))}>
                {n > 0 ? `+${n}` : n}
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="carry">
          <div className="big-stat">
            <small>Carga</small>
            <strong className={over ? 'over' : ''}>
              {used} / {cap} <em>espaços</em>
            </strong>
          </div>
          <div className={`bar carry-bar ${over ? 'over' : ''}`}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="hint">{over ? 'Sobrecarregado! Confira as penalidades com o mestre.' : 'Limite: 10 + 2 × Força (Força negativa: −1 por ponto).'}</p>
        </Panel>
      </div>

      <Panel
        title="Equipamento"
        actions={
          <button className="btn primary sm" onClick={() => update((d) => void d.items.push({ id: uid(), name: '', qty: 1, spaces: 1, notes: '' }))}>
            <Plus size={15} /> Item
          </button>
        }
      >
        {c.items.length === 0 ? (
          <Empty icon={<Backpack size={32} />} title="Mochila vazia">
            Adicione itens, poções, ferramentas e tesouros.
          </Empty>
        ) : (
          <div className="items">
            <div className="item item-head">
              <span>Item</span>
              <span>Qtd.</span>
              <span>Esp.</span>
              <span>Notas</span>
              <span />
            </div>
            {c.items.map((it) => (
              <div key={it.id} className="item">
                <input value={it.name} placeholder="Nome do item" onChange={(e) => setItem(it.id, { name: e.target.value })} aria-label="Nome" />
                <NumInput value={it.qty} min={0} onChange={(n) => setItem(it.id, { qty: n })} ariaLabel="Quantidade" />
                <NumInput value={it.spaces} min={0} onChange={(n) => setItem(it.id, { spaces: n })} ariaLabel="Espaços" />
                <input value={it.notes} placeholder="—" onChange={(e) => setItem(it.id, { notes: e.target.value })} aria-label="Notas" />
                <button className="icon-btn sm danger" title="Remover" onClick={() => update((d) => void (d.items = d.items.filter((x) => x.id !== it.id)))}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
