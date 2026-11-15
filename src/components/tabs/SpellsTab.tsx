import { useState } from 'react';
import { BookOpen, Check, ChevronDown, Pencil, Plus, Search, Trash2, Wand2 } from 'lucide-react';
import type { Updater } from '../../App';
import type { AttrKey, Character, Spell } from '../../types';
import { ATTRS, CIRCLE_COST, SPELL_SCHOOLS } from '../../data/rules';
import { attr, fmt, spellCD, spellCost } from '../../lib/calc';
import { uid } from '../../lib/storage';
import { Empty, Field, NumInput, Panel, TextArea } from '../ui';

const blankSpell = (circle = 1): Spell => ({
  id: uid(),
  name: '',
  circle,
  type: 'Arcana',
  school: 'Evocação',
  execution: 'Padrão',
  range: 'Curto',
  target: '',
  duration: 'Instantânea',
  resistance: '',
  cost: null,
  description: '',
});

function SpellEditor({ value, onChange }: { value: Spell; onChange: (s: Spell) => void }) {
  const set = (patch: Partial<Spell>) => onChange({ ...value, ...patch });
  return (
    <div className="editor">
      <div className="editor-row">
        <Field label="Nome" value={value.name} placeholder="Ex.: Seta Infalível" onChange={(v) => set({ name: v })} />
        <label className="field small">
          <span className="field-label">Círculo</span>
          <select value={value.circle} onChange={(e) => set({ circle: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}º
              </option>
            ))}
          </select>
        </label>
        <label className="field small">
          <span className="field-label">Tipo</span>
          <select value={value.type} onChange={(e) => set({ type: e.target.value as Spell['type'] })}>
            <option>Arcana</option>
            <option>Divina</option>
            <option>Universal</option>
          </select>
        </label>
        <Field className="small" label="Escola" value={value.school} list="schools" onChange={(v) => set({ school: v })} />
        <datalist id="schools">
          {SPELL_SCHOOLS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div className="editor-row">
        <Field className="small" label="Execução" value={value.execution} onChange={(v) => set({ execution: v })} />
        <Field className="small" label="Alcance" value={value.range} onChange={(v) => set({ range: v })} />
        <Field className="small" label="Alvo / Área" value={value.target} onChange={(v) => set({ target: v })} />
        <Field className="small" label="Duração" value={value.duration} onChange={(v) => set({ duration: v })} />
        <Field className="small" label="Resistência" value={value.resistance} onChange={(v) => set({ resistance: v })} />
        <label className="field small">
          <span className="field-label">Custo PM</span>
          <NumInput value={value.cost ?? CIRCLE_COST[value.circle]} min={0} onChange={(n) => set({ cost: n === CIRCLE_COST[value.circle] ? null : n })} />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Efeito e aprimoramentos</span>
        <TextArea value={value.description} placeholder="Descrição, aprimoramentos (+1 PM: …), truques…" onChange={(v) => set({ description: v })} />
      </label>
    </div>
  );
}

export function SpellsTab({ c, update }: { c: Character; update: Updater }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Spell | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const save = () => {
    if (!draft) return;
    update((d) => {
      const i = d.spells.findIndex((s) => s.id === draft.id);
      if (i >= 0) d.spells[i] = draft;
      else d.spells.push(draft);
    });
    setEditing(null);
    setDraft(null);
  };

  const cast = (s: Spell) => {
    const cost = spellCost(s.circle, s.cost) + (extra[s.id] ?? 0);
    if (c.pm.current < cost && !confirm(`Você tem ${c.pm.current} PM e a magia custa ${cost}. Lançar mesmo assim?`)) return;
    update((d) => void (d.pm.current = Math.max(0, d.pm.current - cost)));
    setExtra((e) => ({ ...e, [s.id]: 0 }));
    setFlash(s.id);
    setTimeout(() => setFlash(null), 900);
  };

  const filtered = c.spells.filter((s) => !q || `${s.name} ${s.school} ${s.description}`.toLowerCase().includes(q.toLowerCase()));
  const circles = [1, 2, 3, 4, 5].filter((n) => filtered.some((s) => s.circle === n));

  return (
    <div className="list-page">
      <Panel className="spell-stats">
        <div className="spell-stats-row">
          <div className="big-stat">
            <small>CD das magias</small>
            <strong>{spellCD(c)}</strong>
          </div>
          <label className="field small">
            <span className="field-label">Atributo-chave</span>
            <select value={c.spellcasting.attr} onChange={(e) => update((d) => void (d.spellcasting.attr = e.target.value as AttrKey))}>
              {ATTRS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.name} ({fmt(attr(c, a.key))})
                </option>
              ))}
            </select>
          </label>
          <label className="field small">
            <span className="field-label">Bônus na CD</span>
            <NumInput value={c.spellcasting.cdBonus} onChange={(n) => update((d) => void (d.spellcasting.cdBonus = n))} />
          </label>
          <div className="pm-pill">
            <Wand2 size={16} /> {c.pm.current} PM disponíveis
          </div>
        </div>
      </Panel>

      <div className="toolbar">
        <label className="search">
          <Search size={15} />
          <input value={q} placeholder="Buscar magia…" onChange={(e) => setQ(e.target.value)} />
        </label>
        <button
          className="btn primary sm"
          onClick={() => {
            setDraft(blankSpell());
            setEditing('new');
          }}
        >
          <Plus size={15} /> Nova magia
        </button>
      </div>

      {editing === 'new' && draft && (
        <div className="card editing">
          <SpellEditor value={draft} onChange={setDraft} />
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

      {filtered.length === 0 && editing !== 'new' ? (
        <Empty icon={<BookOpen size={32} />} title={c.spells.length ? 'Nenhuma magia encontrada' : 'Grimório vazio'}>
          {c.spells.length ? 'Tente outra busca.' : 'Adicione as magias que seu personagem conhece. O custo em PM é calculado pelo círculo, mas pode ser alterado.'}
        </Empty>
      ) : (
        circles.map((n) => (
          <section key={n} className="circle-group">
            <h3 className="circle-title">
              <span>{n}º Círculo</span>
              <em>{CIRCLE_COST[n]} PM</em>
            </h3>
            <div className="cards">
              {filtered
                .filter((s) => s.circle === n)
                .map((s) =>
                  editing === s.id && draft ? (
                    <div key={s.id} className="card editing">
                      <SpellEditor value={draft} onChange={setDraft} />
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
                    <article key={s.id} className={`card spell ${flash === s.id ? 'flash' : ''}`}>
                      <header className="card-head" onClick={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))}>
                        <div>
                          <h4>{s.name || 'Sem nome'}</h4>
                          <div className="tags">
                            <span className={`tag spell-${s.type.toLowerCase()}`}>{s.type}</span>
                            {s.school && <span className="tag">{s.school}</span>}
                            <span className="tag pm">{spellCost(s.circle, s.cost)} PM</span>
                          </div>
                        </div>
                        <ChevronDown size={18} className={`chev ${expanded[s.id] ? 'open' : ''}`} />
                      </header>
                      <dl className="spell-meta">
                        {[
                          ['Execução', s.execution],
                          ['Alcance', s.range],
                          ['Alvo/Área', s.target],
                          ['Duração', s.duration],
                          ['Resistência', s.resistance],
                        ]
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k}>
                              <dt>{k}</dt>
                              <dd>{v}</dd>
                            </div>
                          ))}
                      </dl>
                      {s.description && <p className={`card-desc ${expanded[s.id] ? 'open' : ''}`}>{s.description}</p>}
                      <footer className="card-actions">
                        <button className="btn sm use" onClick={() => cast(s)}>
                          <Wand2 size={14} /> Lançar (−{spellCost(s.circle, s.cost) + (extra[s.id] ?? 0)} PM)
                        </button>
                        <label className="extra-pm" title="PM extras em aprimoramentos">
                          +<NumInput value={extra[s.id] ?? 0} min={0} onChange={(v) => setExtra((e) => ({ ...e, [s.id]: v }))} ariaLabel="PM extras" />
                        </label>
                        <span className="spacer" />
                        <button
                          className="icon-btn sm"
                          title="Editar"
                          onClick={() => {
                            setDraft({ ...s });
                            setEditing(s.id);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn sm danger"
                          title="Remover"
                          onClick={() => confirm(`Remover "${s.name}"?`) && update((d) => void (d.spells = d.spells.filter((x) => x.id !== s.id)))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </footer>
                    </article>
                  ),
                )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
