import { BookOpen, Plus, Trash2 } from 'lucide-react';
import type { Updater } from '../App';
import type { Character, ClassEntry } from '../types';
import { maxPM, maxPV } from '../lib/calc';
import { uid } from '../lib/storage';
import { Modal, NumInput } from './ui';

export function ClassesModal({ c, update, onClose }: { c: Character; update: Updater; onClose: () => void }) {
  const set = (id: string, patch: Partial<ClassEntry>) =>
    update((d) => {
      const cl = d.classes.find((x) => x.id === id);
      if (cl) Object.assign(cl, patch);
    });

  return (
    <Modal
      title="Classes"
      wide
      onClose={onClose}
      footer={
        <>
          <span className="muted">
            PV máx. <strong>{maxPV(c)}</strong> · PM máx. <strong>{maxPM(c)}</strong>
          </span>
          <button className="btn primary" onClick={onClose}>
            Pronto
          </button>
        </>
      }
    >
      <p className="hint book-hint">
        <BookOpen size={15} /> Preencha com os valores da classe no livro. A primeira linha é a classe inicial: só ela usa os PV iniciais. A Constituição é
        somada automaticamente.
      </p>
      <div className="class-table">
        <div className="class-row head">
          <span>Classe</span>
          <span>Nível</span>
          <span>PV inicial</span>
          <span>PV/nível</span>
          <span>PM/nível</span>
          <span />
        </div>
        {c.classes.map((cl, i) => (
          <div key={cl.id} className="class-row">
            <input value={cl.name} placeholder="Nome da classe" onChange={(e) => set(cl.id, { name: e.target.value })} aria-label="Classe" />
            <NumInput value={cl.level} min={0} max={20} onChange={(n) => set(cl.id, { level: n })} ariaLabel="Nível" />
            {i === 0 ? (
              <NumInput value={cl.pvInicial} min={0} onChange={(n) => set(cl.id, { pvInicial: n })} ariaLabel="PV inicial" />
            ) : (
              <span className="muted center">—</span>
            )}
            <NumInput value={cl.pvPorNivel} min={0} onChange={(n) => set(cl.id, { pvPorNivel: n })} ariaLabel="PV por nível" />
            <NumInput value={cl.pmPorNivel} min={0} onChange={(n) => set(cl.id, { pmPorNivel: n })} ariaLabel="PM por nível" />
            <button
              className="icon-btn sm danger"
              title="Remover classe"
              disabled={c.classes.length <= 1}
              onClick={() => update((d) => void (d.classes = d.classes.filter((x) => x.id !== cl.id)))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="btn ghost sm"
        onClick={() => update((d) => void d.classes.push({ id: uid(), name: '', level: 1, pvInicial: 0, pvPorNivel: 0, pmPorNivel: 0 }))}
      >
        <Plus size={14} /> Adicionar classe (multiclasse)
      </button>
    </Modal>
  );
}
