import { Dices, Plus, Shield, Swords, Trash2 } from 'lucide-react';
import type { Updater } from '../../App';
import type { AttrKey, Character, Weapon } from '../../types';
import { ATTRS, ATTR_SHORT, SKILLS } from '../../data/rules';
import { armorPenalty, attr, fmt, halfLevel, skillParts, skillTotal, totalLevel, trainingBonus, weaponAttack } from '../../lib/calc';
import { parseCrit, rollD20, rollExpression } from '../../lib/dice';
import { uid } from '../../lib/storage';
import { useDice } from '../Dice';
import { Empty, Field, NumInput, Panel, TextArea } from '../ui';

export function CombatTab({ c, update }: { c: Character; update: Updater }) {
  return (
    <div className="grid-combat">
      <div className="col">
        <Attributes c={c} update={update} />
        <Defense c={c} update={update} />
        <Panel title="Proficiências e idiomas">
          <div className="stack">
            <label className="field">
              <span className="field-label">Proficiências</span>
              <TextArea minRows={2} value={c.proficiencies} placeholder="Armas simples, armaduras leves…" onChange={(v) => update((d) => void (d.proficiencies = v))} />
            </label>
            <label className="field">
              <span className="field-label">Idiomas</span>
              <TextArea minRows={1} value={c.languages} onChange={(v) => update((d) => void (d.languages = v))} />
            </label>
            <label className="field">
              <span className="field-label">Condições ativas</span>
              <TextArea minRows={1} value={c.conditions} placeholder="Abalado, Fatigado…" onChange={(v) => update((d) => void (d.conditions = v))} />
            </label>
          </div>
        </Panel>
      </div>
      <div className="col">
        <Skills c={c} update={update} />
      </div>
      <div className="col">
        <Attacks c={c} update={update} />
      </div>
    </div>
  );
}

function Attributes({ c, update }: { c: Character; update: Updater }) {
  const { push } = useDice();
  return (
    <Panel title="Atributos">
      <div className="attr-grid">
        {ATTRS.map((a) => {
          const v = attr(c, a.key);
          return (
            <div key={a.key} className="attr">
              <button className="attr-name" title={`Rolar teste de ${a.name}`} onClick={() => push(rollD20(a.name, v))}>
                {a.short}
              </button>
              <div className="attr-value">{fmt(v)}</div>
              <div className="attr-inputs">
                <label title="Valor base">
                  <span>base</span>
                  <NumInput value={c.attributes[a.key].base} onChange={(n) => update((d) => void (d.attributes[a.key].base = n))} ariaLabel={`${a.name} base`} />
                </label>
                <label title="Bônus de raça, itens etc.">
                  <span>bônus</span>
                  <NumInput value={c.attributes[a.key].bonus} onChange={(n) => update((d) => void (d.attributes[a.key].bonus = n))} ariaLabel={`${a.name} bônus`} />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Defense({ c, update }: { c: Character; update: Updater }) {
  const pen = armorPenalty(c);
  return (
    <Panel title="Defesa">
      <div className="def-formula">
        <span>10</span>
        <span>+</span>
        <label className="toggle-chip" title="Somar Destreza na Defesa">
          <input type="checkbox" checked={c.defense.useDex} onChange={(e) => update((d) => void (d.defense.useDex = e.target.checked))} />
          DES {fmt(attr(c, 'des'))}
        </label>
        <span>+</span>
        <span className="chip">Arm. {fmt(c.armor.defense)}</span>
        <span>+</span>
        <span className="chip">Esc. {fmt(c.shield.defense)}</span>
        <span>+</span>
        <label className="chip">
          Outros <NumInput value={c.defense.other} onChange={(n) => update((d) => void (d.defense.other = n))} ariaLabel="Outros bônus de defesa" />
        </label>
      </div>
      <div className="armor-rows">
        {(['armor', 'shield'] as const).map((k) => (
          <div key={k} className="armor-row">
            <Field label={k === 'armor' ? 'Armadura' : 'Escudo'} value={c[k].name} placeholder="—" onChange={(v) => update((d) => void (d[k].name = v))} />
            <label className="field small">
              <span className="field-label">Defesa</span>
              <NumInput value={c[k].defense} onChange={(n) => update((d) => void (d[k].defense = n))} />
            </label>
            <label className="field small">
              <span className="field-label">Penalidade</span>
              <NumInput value={c[k].penalty} min={0} onChange={(n) => update((d) => void (d[k].penalty = n))} />
            </label>
          </div>
        ))}
      </div>
      {pen > 0 && <p className="hint">Penalidade de armadura −{pen} aplicada em Acrobacia, Furtividade e Ladinagem.</p>}
    </Panel>
  );
}

function Skills({ c, update }: { c: Character; update: Updater }) {
  const { push } = useDice();
  const lvl = totalLevel(c);
  const setSkill = (id: string, patch: Partial<{ trained: boolean; other: number; attr: AttrKey }>) =>
    update((d) => {
      d.skills[id] = { ...(d.skills[id] ?? { trained: false, other: 0 }), ...patch };
    });

  return (
    <Panel
      title="Perícias"
      className="skills-panel"
      actions={
        <span className="muted small">
          ½ nível {fmt(halfLevel(c))} · treino {fmt(trainingBonus(lvl))}
        </span>
      }
    >
      <div className="skills">
        {SKILLS.map((s) => {
          const st = c.skills[s.id] ?? { trained: false, other: 0 };
          const total = skillTotal(c, s);
          const blocked = s.trainedOnly && !st.trained;
          return (
            <div key={s.id} className={`skill ${st.trained ? 'trained' : ''} ${blocked ? 'blocked' : ''}`}>
              <label className="skill-check" title="Treinada">
                <input type="checkbox" checked={st.trained} onChange={(e) => setSkill(s.id, { trained: e.target.checked })} />
                <span />
              </label>
              <span className="skill-name">
                {s.name}
                {s.trainedOnly && <sup title="Somente treinada">†</sup>}
                {s.armorPenalty && <sup title="Sofre penalidade de armadura">*</sup>}
              </span>
              <select className="skill-attr" value={st.attr ?? s.attr} onChange={(e) => setSkill(s.id, { attr: e.target.value as AttrKey })} aria-label={`Atributo de ${s.name}`}>
                {ATTRS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {ATTR_SHORT[a.key]}
                  </option>
                ))}
              </select>
              <NumInput className="skill-other" value={st.other} onChange={(n) => setSkill(s.id, { other: n })} title="Outros bônus" />
              <button
                className="skill-total"
                title={(() => {
                  const p = skillParts(c, s);
                  const parts = [`½ nível ${fmt(p.half)}`, `${ATTR_SHORT[p.attrKey]} ${fmt(p.attr)}`, `treino ${fmt(p.training)}`, `outros ${fmt(p.other)}`];
                  if (p.armor) parts.push(`armadura ${fmt(p.armor)}`);
                  if (p.size) parts.push(`tamanho ${fmt(p.size)}`);
                  return `${parts.join(' · ')}${blocked ? '\nSomente treinada' : '\nClique para rolar'}`;
                })()}
                onClick={() => push(rollD20(s.name, total))}
              >
                {fmt(total)}
                <Dices size={12} />
              </button>
            </div>
          );
        })}
        {c.customSkills.map((s) => {
          const total = halfLevel(c) + attr(c, s.attr) + (s.trained ? trainingBonus(lvl) : 0) + (s.other || 0);
          const set = (fn: (x: typeof s) => void) =>
            update((d) => {
              const x = d.customSkills.find((y) => y.id === s.id);
              if (x) fn(x);
            });
          return (
            <div key={s.id} className={`skill custom ${s.trained ? 'trained' : ''}`}>
              <label className="skill-check" title="Treinada">
                <input type="checkbox" checked={s.trained} onChange={(e) => set((x) => void (x.trained = e.target.checked))} />
                <span />
              </label>
              <input className="skill-name-input" value={s.name} placeholder="Ofício (…)" onChange={(e) => set((x) => void (x.name = e.target.value))} />
              <select className="skill-attr" value={s.attr} onChange={(e) => set((x) => void (x.attr = e.target.value as AttrKey))}>
                {ATTRS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {ATTR_SHORT[a.key]}
                  </option>
                ))}
              </select>
              <NumInput className="skill-other" value={s.other} onChange={(n) => set((x) => void (x.other = n))} title="Outros bônus" />
              <button className="skill-total" onClick={() => push(rollD20(s.name || 'Perícia', total))}>
                {fmt(total)}
                <Dices size={12} />
              </button>
              <button className="icon-btn sm danger skill-del" title="Remover" onClick={() => update((d) => void (d.customSkills = d.customSkills.filter((y) => y.id !== s.id)))}>
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="skills-foot">
        <span className="muted small">† só treinada · * penalidade de armadura · clique no total para rolar</span>
        <button
          className="btn ghost sm"
          onClick={() => update((d) => void d.customSkills.push({ id: uid(), name: 'Ofício ()', attr: 'int', trained: true, other: 0 }))}
        >
          <Plus size={14} /> Perícia extra
        </button>
      </div>
    </Panel>
  );
}

function Attacks({ c, update }: { c: Character; update: Updater }) {
  const { push } = useDice();
  const setW = (id: string, patch: Partial<Weapon>) =>
    update((d) => {
      const w = d.weapons.find((x) => x.id === id);
      if (w) Object.assign(w, patch);
    });

  const add = () =>
    update((d) =>
      void d.weapons.push({ id: uid(), name: '', skill: 'luta', attackBonus: 0, damage: '1d6', crit: '20/x2', damageType: '', range: '', notes: '' }),
    );

  return (
    <Panel
      title="Ataques"
      actions={
        <button className="btn ghost sm" onClick={add}>
          <Plus size={14} /> Arma
        </button>
      }
    >
      {c.weapons.length === 0 ? (
        <Empty icon={<Swords size={28} />} title="Nenhum ataque">
          Adicione armas para rolar ataque e dano com um clique.
        </Empty>
      ) : (
        <div className="weapons">
          {c.weapons.map((w) => {
            const atk = weaponAttack(c, w);
            const { range, mult } = parseCrit(w.crit);
            const rollAttack = () => {
              const r = rollD20(`Ataque · ${w.name || 'Arma'}`, atk, range);
              push(r);
            };
            const rollDamage = (crit: boolean) => {
              const r = rollExpression(`${crit ? 'Dano crítico' : 'Dano'} · ${w.name || 'Arma'}`, w.damage, crit ? mult : 1);
              if (r) push(r);
              else alert('Não entendi a fórmula de dano. Use algo como 1d8+2.');
            };
            return (
              <div key={w.id} className="weapon">
                <div className="weapon-head">
                  <input className="weapon-name" value={w.name} placeholder="Nome da arma" onChange={(e) => setW(w.id, { name: e.target.value })} />
                  <button className="icon-btn sm danger" title="Remover" onClick={() => update((d) => void (d.weapons = d.weapons.filter((x) => x.id !== w.id)))}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="weapon-rolls">
                  <button className="roll-btn atk" onClick={rollAttack}>
                    <small>Ataque</small>
                    {fmt(atk)}
                  </button>
                  <button className="roll-btn dmg" onClick={() => rollDamage(false)}>
                    <small>Dano</small>
                    {w.damage || '—'}
                  </button>
                  <button className="roll-btn crit" onClick={() => rollDamage(true)} title="Rolar dano crítico">
                    <small>Crítico</small>
                    {w.crit || '20/x2'}
                  </button>
                </div>
                <div className="weapon-fields">
                  <label className="field small">
                    <span className="field-label">Perícia</span>
                    <select value={w.skill} onChange={(e) => setW(w.id, { skill: e.target.value as Weapon['skill'] })}>
                      <option value="luta">Luta</option>
                      <option value="pontaria">Pontaria</option>
                    </select>
                  </label>
                  <label className="field small">
                    <span className="field-label">Bônus</span>
                    <NumInput value={w.attackBonus} onChange={(n) => setW(w.id, { attackBonus: n })} />
                  </label>
                  <Field className="small" label="Dano" value={w.damage} placeholder="1d8+2" onChange={(v) => setW(w.id, { damage: v })} />
                  <Field className="small" label="Crítico" value={w.crit} placeholder="19/x2" onChange={(v) => setW(w.id, { crit: v })} />
                  <Field className="small" label="Tipo" value={w.damageType} placeholder="Corte" onChange={(v) => setW(w.id, { damageType: v })} />
                  <Field className="small" label="Alcance" value={w.range} placeholder="Curto" onChange={(v) => setW(w.id, { range: v })} />
                </div>
                <input className="weapon-notes" value={w.notes} placeholder="Observações (habilidades, munição…)" onChange={(e) => setW(w.id, { notes: e.target.value })} />
              </div>
            );
          })}
        </div>
      )}
      <p className="hint">
        <Shield size={12} /> O ataque soma o total da perícia (Luta/Pontaria) + bônus da arma.
      </p>
    </Panel>
  );
}
