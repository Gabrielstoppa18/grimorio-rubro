import { useRef, useState } from 'react';
import { ArrowLeft, Backpack, BookOpen, Camera, ChevronsUp, Download, Eye, Flame, Pencil, Radio, Scroll, Swords, Trash2, User } from 'lucide-react';
import type { Character } from '../types';
import type { Updater } from '../App';
import { defense, fmt, maxPM, maxPV, sizeMods, totalLevel } from '../lib/calc';
import { exportCharacter, resizeImage } from '../lib/storage';
import { uploadPortrait } from '../lib/cloud';
import { SyncBadge, useAccount } from './Account';
import { SIZES } from '../data/rules';
import { Field, NumInput, ReadOnlyContext } from './ui';
import { ResourceTracker } from './Resource';
import { Divider, ShieldValue } from './Ornaments';
import { CombatTab } from './tabs/CombatTab';
import { PowersTab } from './tabs/PowersTab';
import { SpellsTab } from './tabs/SpellsTab';
import { InventoryTab } from './tabs/InventoryTab';
import { NotesTab } from './tabs/NotesTab';
import { ClassesModal } from './ClassesModal';
import { LevelUpModal } from './LevelUpModal';

type Tab = 'ficha' | 'poderes' | 'magias' | 'inventario' | 'historia';

interface SheetProps {
  c: Character;
  update: Updater;
  onBack: () => void;
  /** Mestre/colega vendo a ficha: nada pode ser alterado. */
  readOnly?: boolean;
  backLabel?: string;
  /** Mostra o selo "ao vivo" (atualiza sozinha quando o jogador mexe). */
  live?: boolean;
}

export function Sheet({ c, update, onBack, readOnly = false, backLabel = 'Personagens', live = false }: SheetProps) {
  const [tab, setTab] = useState<Tab>('ficha');
  const [classesOpen, setClassesOpen] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const pvMax = maxPV(c);
  const pmMax = maxPM(c);
  const lvl = totalLevel(c);
  const def = defense(c);

  const [uploading, setUploading] = useState(false);
  const { releasePhoto } = useAccount();

  const onPhoto = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      const data = await resizeImage(f);
      let url = data;
      try {
        url = await uploadPortrait(c.id, data);
      } catch {
        // Sem conexão: guarda a foto dentro da ficha mesmo, para não perder.
      }
      const old = c.photo;
      update((d) => void (d.photo = url));
      if (old && old !== url) releasePhoto(old, c.id);
    } catch {
      alert('Não consegui carregar essa imagem.');
    } finally {
      setUploading(false);
    }
    if (photoRef.current) photoRef.current.value = '';
  };

  const clearPhoto = () => {
    const old = c.photo;
    update((d) => void (d.photo = ''));
    releasePhoto(old, c.id);
  };

  const tabs: { id: Tab; label: string; icon: JSX.Element; count?: number }[] = [
    { id: 'ficha', label: 'Ficha', icon: <Swords size={16} /> },
    { id: 'poderes', label: 'Poderes', icon: <Flame size={16} />, count: c.powers.length },
    { id: 'magias', label: 'Magias', icon: <BookOpen size={16} />, count: c.spells.length },
    { id: 'inventario', label: 'Inventário', icon: <Backpack size={16} /> },
    { id: 'historia', label: 'História', icon: <Scroll size={16} /> },
  ];

  return (
    <ReadOnlyContext.Provider value={readOnly}>
    <div className={`sheet ${readOnly ? 'is-readonly' : ''}`} style={{ ['--accent' as string]: c.accent }}>
      <nav className="topbar">
        <button className="btn ghost sm" onClick={onBack}>
          <ArrowLeft size={16} /> <span className="hide-xs">{backLabel}</span>
        </button>
        <div className="topbar-actions">
          {readOnly && (
            <span className="ro-badge" title="Só o dono da ficha pode alterá-la">
              {live ? <Radio size={14} /> : <Eye size={14} />} <span className="hide-xs">{live ? 'Ao vivo · só leitura' : 'Só leitura'}</span>
            </span>
          )}
          {!readOnly && <SyncBadge compact />}
          <button className="btn ghost sm" onClick={() => exportCharacter(c)} title="Baixar arquivo da ficha">
            <Download size={16} /> <span className="hide-sm">Exportar</span>
          </button>
          {!readOnly && (
            <button className="btn primary sm" onClick={() => setLevelUpOpen(true)}>
              <ChevronsUp size={16} /> Subir<span className="hide-xs"> de nível</span>
            </button>
          )}
        </div>
      </nav>

      <fieldset className="ro" disabled={readOnly}>
      <header className="hero">
        <div className="portrait-wrap">
          <button className="portrait" onClick={() => photoRef.current?.click()} title="Trocar foto">
            {c.photo ? <img src={c.photo} alt={c.name} /> : <User size={64} strokeWidth={1} />}
            <span className="portrait-overlay">
              <Camera size={20} /> {uploading ? 'Enviando…' : c.photo ? 'Trocar' : 'Adicionar foto'}
            </span>
          </button>
          {c.photo && (
            <button className="icon-btn sm portrait-remove" title="Remover foto" onClick={clearPhoto}>
              <Trash2 size={13} />
            </button>
          )}
          <div className="level-badge" title="Nível do personagem">
            <small>Nível</small>
            {lvl}
          </div>
          <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>

        <div className="hero-id">
          <input className="hero-name" value={c.name} placeholder="Nome do personagem" onChange={(e) => update((d) => void (d.name = e.target.value))} />
          <button className="class-line" onClick={() => setClassesOpen(true)} title="Editar classes">
            {c.classes.length ? c.classes.map((cl) => `${cl.name || 'Classe'} ${cl.level}`).join(' / ') : 'Adicionar classe'}
            <Pencil size={13} />
          </button>
          <div className="hero-fields">
            <Field label="Jogador" value={c.player} onChange={(v) => update((d) => void (d.player = v))} />
            <Field label="Raça" value={c.race} onChange={(v) => update((d) => void (d.race = v))} />
            <Field label="Origem" value={c.origin} onChange={(v) => update((d) => void (d.origin = v))} />
            <Field label="Divindade" value={c.deity} onChange={(v) => update((d) => void (d.deity = v))} />
            <Field label="Tamanho" value={c.size} list="sizes" onChange={(v) => update((d) => void (d.size = v))} />
            <Field label="Deslocamento" value={c.speed} onChange={(v) => update((d) => void (d.speed = v))} />
            <label className="field">
              <span className="field-label">Experiência</span>
              <NumInput className="left" value={c.xp} min={0} onChange={(n) => update((d) => void (d.xp = n))} ariaLabel="Pontos de experiência" />
            </label>
            <div className="field size-mods" title="Modificadores de tamanho: Furtividade / manobras de combate">
              <span className="field-label">Mod. tamanho</span>
              <div>
                <span>
                  <small>Furt.</small> {fmt(sizeMods(c)[0])}
                </span>
                <span>
                  <small>Man.</small> {fmt(sizeMods(c)[1])}
                </span>
              </div>
            </div>
            <datalist id="sizes">
              {SIZES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="hero-stats">
          <ResourceTracker kind="pv" res={c.pv} max={pvMax} onChange={(r) => update((d) => void (d.pv = r))} />
          <ResourceTracker kind="pm" res={c.pm} max={pmMax} onChange={(r) => update((d) => void (d.pm = r))} />
          <ShieldValue value={def} label="Defesa" />
        </div>
      </header>
      </fieldset>

      <Divider />

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon}
            <span>{t.label}</span>
            {!!t.count && <em className="tab-count">{t.count}</em>}
          </button>
        ))}
      </div>

      <fieldset className="ro" disabled={readOnly}>
      <main className="tab-body">
        {tab === 'ficha' && <CombatTab c={c} update={update} />}
        {tab === 'poderes' && <PowersTab c={c} update={update} />}
        {tab === 'magias' && <SpellsTab c={c} update={update} />}
        {tab === 'inventario' && <InventoryTab c={c} update={update} />}
        {tab === 'historia' && <NotesTab c={c} update={update} />}
      </main>
      </fieldset>

      {classesOpen && <ClassesModal c={c} update={update} onClose={() => setClassesOpen(false)} />}
      {levelUpOpen && <LevelUpModal c={c} update={update} onClose={() => setLevelUpOpen(false)} />}
    </div>
    </ReadOnlyContext.Provider>
  );
}
