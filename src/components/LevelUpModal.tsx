import { useState } from 'react';
import { BookOpen, ChevronsUp, Flame, Heart, Plus, Sparkles, Star, Trash2 } from 'lucide-react';
import type { Updater } from '../App';
import type { Character, Power } from '../types';
import { attr, fmt, totalLevel, trainingBonus } from '../lib/calc';
import { uid } from '../lib/storage';
import { Field, Modal, NumInput } from './ui';
import { PowerEditor, blankPower } from './tabs/PowersTab';

export function LevelUpModal({ c, update, onClose }: { c: Character; update: Updater; onClose: () => void }) {
  const first = c.classes[0];
  const [target, setTarget] = useState<string>(first?.id ?? 'new');
  const [newName, setNewName] = useState('');
  const [pvPorNivel, setPvPorNivel] = useState(first?.pvPorNivel ?? 0);
  const [pmPorNivel, setPmPorNivel] = useState(first?.pmPorNivel ?? 0);
  const [powers, setPowers] = useState<Power[]>([blankPower()]);
  const [addToCurrent, setAddToCurrent] = useState(true);

  const lvl = totalLevel(c);
  const next = lvl + 1;
  const con = attr(c, 'con');
  const isNew = target === 'new';

  const pick = (id: string) => {
    setTarget(id);
    const cl = c.classes.find((x) => x.id === id);
    setPvPorNivel(cl?.pvPorNivel ?? 0);
    setPmPorNivel(cl?.pmPorNivel ?? 0);
  };

  const pvGain = pvPorNivel + con;
  const pmGain = pmPorNivel;
  const trainUp = trainingBonus(next) > trainingBonus(lvl);
  const halfUp = Math.floor(next / 2) > Math.floor(lvl / 2);
  const canApply = next <= 20 && (!isNew || newName.trim().length > 0);

  const apply = () => {
    update((d) => {
      if (isNew) {
        d.classes.push({ id: uid(), name: newName.trim(), level: 1, pvInicial: 0, pvPorNivel, pmPorNivel });
      } else {
        const x = d.classes.find((y) => y.id === target);
        if (x) Object.assign(x, { level: x.level + 1, pvPorNivel, pmPorNivel });
      }
      if (addToCurrent) {
        d.pv.current += pvGain;
        d.pm.current += pmGain;
      }
      d.powers.push(...powers.filter((p) => p.name.trim()));
    });
    onClose();
  };

  const targetName = isNew ? newName || 'nova classe' : c.classes.find((x) => x.id === target)?.name || 'classe';

  return (
    <Modal
      title={
        <>
          <ChevronsUp size={20} /> Nível {lvl} → {next}
        </>
      }
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={apply} disabled={!canApply}>
            <Star size={16} /> Subir para o nível {next}
          </button>
        </>
      }
    >
      <p className="hint book-hint">
        <BookOpen size={15} /> Tenha o livro em mãos: os valores e habilidades de cada nível estão na descrição da sua classe.
      </p>

      <section className="lvl-step">
        <h4 className="step-title">
          <span>1</span> Em qual classe você vai subir?
        </h4>
        <div className="lvl-options">
          {c.classes.map((cl) => (
            <button key={cl.id} className={`lvl-opt ${target === cl.id ? 'active' : ''}`} onClick={() => pick(cl.id)}>
              <strong>{cl.name || 'Classe sem nome'}</strong>
              <small>
                nível {cl.level} → {cl.level + 1}
              </small>
            </button>
          ))}
          <button
            className={`lvl-opt ${isNew ? 'active' : ''}`}
            onClick={() => {
              setTarget('new');
              setPvPorNivel(0);
              setPmPorNivel(0);
            }}
          >
            <strong>
              <Plus size={14} /> Nova classe
            </strong>
            <small>multiclasse</small>
          </button>
        </div>
        {isNew && <Field label="Nome da nova classe" value={newName} placeholder="Como está no livro" onChange={setNewName} />}
      </section>

      <section className="lvl-step">
        <h4 className="step-title">
          <span>2</span> PV e PM por nível de {targetName}
        </h4>
        <div className="lvl-values">
          <label className="field">
            <span className="field-label">PV por nível (sem CON)</span>
            <NumInput value={pvPorNivel} min={0} onChange={setPvPorNivel} />
          </label>
          <label className="field">
            <span className="field-label">PM por nível</span>
            <NumInput value={pmPorNivel} min={0} onChange={setPmPorNivel} />
          </label>
        </div>
        <div className="gains">
          <div className="gain pv">
            <Heart size={18} />
            <strong>{fmt(pvGain)}</strong>
            <small>
              PV ({pvPorNivel} {con >= 0 ? '+' : '−'} {Math.abs(con)} de CON)
            </small>
          </div>
          <div className="gain pm">
            <Sparkles size={18} />
            <strong>{fmt(pmGain)}</strong>
            <small>PM</small>
          </div>
          {halfUp && (
            <div className="gain">
              <Star size={18} />
              <strong>+1</strong>
              <small>em todas as perícias (½ nível)</small>
            </div>
          )}
          {trainUp && (
            <div className="gain">
              <Star size={18} />
              <strong>+{trainingBonus(next)}</strong>
              <small>bônus das perícias treinadas</small>
            </div>
          )}
        </div>
        <label className="check-line muted">
          <input type="checkbox" checked={addToCurrent} onChange={(e) => setAddToCurrent(e.target.checked)} />
          Somar os PV e PM ganhos aos valores atuais
        </label>
      </section>

      <section className="lvl-step">
        <h4 className="step-title">
          <span>3</span> O que você ganhou neste nível?
        </h4>
        <p className="hint">Habilidades de classe, poderes escolhidos, magias novas… Registre o que o livro indica (deixe em branco o que não quiser anotar).</p>
        {powers.map((p, i) => (
          <div key={p.id} className="card editing lvl-power">
            <PowerEditor value={p} onChange={(np) => setPowers((l) => l.map((x, j) => (j === i ? np : x)))} />
            {powers.length > 1 && (
              <button className="icon-btn sm danger lvl-power-del" title="Remover" onClick={() => setPowers((l) => l.filter((_, j) => j !== i))}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button className="btn ghost sm" onClick={() => setPowers((l) => [...l, blankPower()])}>
          <Flame size={14} /> Mais um poder ou habilidade
        </button>
      </section>
    </Modal>
  );
}
