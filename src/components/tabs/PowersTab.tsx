import { useMemo, useState } from 'react';
import { Check, ChevronDown, Flame, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import type { Updater } from '../../App';
import type { Character, Power, PowerType } from '../../types';
import { POWER_TYPES } from '../../data/rules';
import { uid } from '../../lib/storage';
import { Empty, Field, NumInput, TextArea } from '../ui';

export function PowerEditor({ value, onChange }: { value: Power; onChange: (p: Power) => void }) {
  return (
    <div className="editor">
      <div className="editor-row">
        <Field label="Nome" value={value.name} placeholder="Ex.: Ataque Especial" onChange={(v) => onChange({ ...value, name: v })} />
        <label className="field">
          <span className="field-label">Tipo</span>
          <select value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value as PowerType })}>
            {POWER_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field small">
          <span className="field-label">Custo (PM)</span>
          <NumInput value={value.cost} min={0} onChange={(n) => onChange({ ...value, cost: n })} />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Descrição</span>
        <TextArea value={value.description} placeholder="O que o poder faz, pré-requisitos, limites de uso…" onChange={(v) => onChange({ ...value, description: v })} />
      </label>
    </div>
  );
}

export const blankPower = (): Power => ({ id: uid(), name: '', type: 'Classe', cost: 0, description: '' });

export function PowersTab({ c, update }: { c: Character; update: Updater }) {
  const [filter, setFilter] = useState<PowerType | 'Todos'>('Todos');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Power | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    c.powers.forEach((p) => (m[p.type] = (m[p.type] ?? 0) + 1));
    return m;
  }, [c.powers]);

  const list = c.powers.filter(
    (p) => (filter === 'Todos' || p.type === filter) && (!q || `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase())),
  );

  const startNew = () => {
    const p = blankPower();
    if (filter !== 'Todos') p.type = filter;
    setDraft(p);
    setEditing('new');
  };

  const save = () => {
    if (!draft) return;
    update((d) => {
      const i = d.powers.findIndex((p) => p.id === draft.id);
      if (i >= 0) d.powers[i] = draft;
      else d.powers.push(draft);
    });
    setEditing(null);
    setDraft(null);
  };

  const use = (p: Power) => {
    if (c.pm.current < p.cost && !confirm(`Você tem ${c.pm.current} PM e o poder custa ${p.cost}. Usar mesmo assim?`)) return;
    update((d) => void (d.pm.current = Math.max(0, d.pm.current - p.cost)));
    setFlash(p.id);
    setTimeout(() => setFlash(null), 900);
  };

  return (
    <div className="list-page">
      <div className="toolbar">
        <div className="chips">
          {(['Todos', ...POWER_TYPES] as const).map((t) => {
            const n = t === 'Todos' ? c.powers.length : counts[t] ?? 0;
            if (t !== 'Todos' && n === 0 && filter !== t) return null;
            return (
              <button key={t} className={`chip-btn ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                {t} <em>{n}</em>
              </button>
            );
          })}
        </div>
        <div className="toolbar-right">
          <label className="search">
            <Search size={15} />
            <input value={q} placeholder="Buscar poder…" onChange={(e) => setQ(e.target.value)} />
          </label>
          <button className="btn primary sm" onClick={startNew}>
            <Plus size={15} /> Novo poder
          </button>
        </div>
      </div>

      {editing === 'new' && draft && (
        <div className="card editing">
          <PowerEditor value={draft} onChange={setDraft} />
          <div className="editor-actions">
            <button className="btn ghost sm" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button className="btn primary sm" onClick={save} disabled={!draft.name.trim()}>
              <Check size={15} /> Adicionar
            </button>
          </div>
        </div>
      )}

      {list.length === 0 && editing !== 'new' ? (
        <Empty icon={<Flame size={32} />} title={c.powers.length ? 'Nenhum poder encontrado' : 'Nenhum poder ainda'}>
          {c.powers.length ? 'Tente outro filtro ou busca.' : 'Registre habilidades de classe, raça, origem e poderes gerais aqui. Tudo é personalizável.'}
        </Empty>
      ) : (
        <div className="cards">
          {list.map((p) =>
            editing === p.id && draft ? (
              <div key={p.id} className="card editing">
                <PowerEditor value={draft} onChange={setDraft} />
                <div className="editor-actions">
                  <button className="btn ghost sm" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                  <button className="btn primary sm" onClick={save}>
                    <Check size={15} /> Salvar
                  </button>
                </div>
              </div>
            ) : (
              <article key={p.id} className={`card power ${flash === p.id ? 'flash' : ''}`}>
                <header className="card-head" onClick={() => setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))}>
                  <div>
                    <h4>{p.name || 'Sem nome'}</h4>
                    <div className="tags">
                      <span className={`tag type-${p.type.toLowerCase()}`}>{p.type}</span>
                      {p.cost > 0 && <span className="tag pm">{p.cost} PM</span>}
                    </div>
                  </div>
                  <ChevronDown size={18} className={`chev ${expanded[p.id] ? 'open' : ''}`} />
                </header>
                {p.description && <p className={`card-desc ${expanded[p.id] ? 'open' : ''}`}>{p.description}</p>}
                <footer className="card-actions">
                  {p.cost > 0 && (
                    <button className="btn sm use" onClick={() => use(p)}>
                      <Sparkles size={14} /> Usar (−{p.cost} PM)
                    </button>
                  )}
                  <span className="spacer" />
                  <button
                    className="icon-btn sm"
                    title="Editar"
                    onClick={() => {
                      setDraft({ ...p });
                      setEditing(p.id);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-btn sm danger"
                    title="Remover"
                    onClick={() => confirm(`Remover "${p.name}"?`) && update((d) => void (d.powers = d.powers.filter((x) => x.id !== p.id)))}
                  >
                    <Trash2 size={14} />
                  </button>
                </footer>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}
