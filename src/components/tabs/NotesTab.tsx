import type { Updater } from '../../App';
import type { Character } from '../../types';
import { ACCENTS } from '../../data/rules';
import { Panel, TextArea } from '../ui';

export function NotesTab({ c, update }: { c: Character; update: Updater }) {
  return (
    <div className="grid-notes">
      <Panel title="Aparência">
        <TextArea value={c.appearance} minRows={4} placeholder="Altura, cabelos, marcas, como se veste…" onChange={(v) => update((d) => void (d.appearance = v))} />
      </Panel>
      <Panel title="Cor da ficha">
        <div className="accents">
          {ACCENTS.map((a) => (
            <button
              key={a}
              className={`accent-dot ${c.accent === a ? 'active' : ''}`}
              style={{ background: a }}
              aria-label={`Cor ${a}`}
              onClick={() => update((d) => void (d.accent = a))}
            />
          ))}
          <label className="accent-custom" title="Escolher outra cor">
            <input type="color" value={c.accent} onChange={(e) => update((d) => void (d.accent = e.target.value))} />
          </label>
        </div>
      </Panel>
      <Panel title="História" className="span-2">
        <TextArea value={c.backstory} minRows={8} placeholder="De onde veio, o que busca, quem deixou para trás…" onChange={(v) => update((d) => void (d.backstory = v))} />
      </Panel>
      <Panel title="Anotações da campanha" className="span-2">
        <TextArea value={c.notes} minRows={8} placeholder="NPCs, pistas, dívidas, promessas…" onChange={(v) => update((d) => void (d.notes = v))} />
      </Panel>
    </div>
  );
}
