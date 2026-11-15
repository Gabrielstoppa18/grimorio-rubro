import { useRef, useState } from 'react';
import { CloudUpload, Copy, Download, Plus, Trash2, Upload, User } from 'lucide-react';
import type { Character } from '../types';
import { exportCharacter, importCharacter } from '../lib/storage';
import { maxPM, maxPV, totalLevel } from '../lib/calc';
import { Modal } from './ui';
import { Divider } from './Ornaments';
import { AccountMenu, SyncBadge, useAccount } from './Account';
import { HomeNav } from './Mesas';

interface Props {
  chars: Character[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onImport: (c: Character) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  loading?: boolean;
  legacyCount?: number;
  onImportLegacy?: () => Promise<void>;
  onDismissLegacy?: () => void;
}

export function CharacterList({ chars, onOpen, onCreate, onImport, onDelete, onDuplicate, loading, legacyCount = 0, onImportLegacy, onDismissLegacy }: Props) {
  const { email } = useAccount();
  const [sendingLegacy, setSendingLegacy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<Character | null>(null);
  const [error, setError] = useState('');

  const handleImport = async (files: FileList | null) => {
    setError('');
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        onImport(await importCharacter(f));
      } catch {
        setError(`Não consegui ler "${f.name}". É um arquivo de ficha exportado por este app?`);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const sorted = [...chars].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="home">
      <div className="home-account">
        <SyncBadge />
        <AccountMenu />
      </div>
      <header className="home-hero">
        <div className="brand">
          <img className="brand-logo" src="./logo-256.webp" alt="" width={256} height={256} />
          <div>
            <h1>Grimório Rubro</h1>
            <p>Fichas de Tormenta 20 para criar, evoluir e levar seus heróis à mesa.</p>
          </div>
        </div>
        <div className="home-actions">
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Importar
          </button>
          <button className="btn primary" onClick={onCreate}>
            <Plus size={16} /> Novo personagem
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" multiple hidden onChange={(e) => handleImport(e.target.files)} />
        </div>
      </header>

      <Divider />

      {email && <HomeNav active="chars" />}

      {error && <div className="banner-error">{error}</div>}

      {legacyCount > 0 && onImportLegacy && (
        <div className="banner-legacy">
          <CloudUpload size={22} />
          <p>
            Encontramos <strong>{legacyCount}</strong> {legacyCount === 1 ? 'ficha salva' : 'fichas salvas'} neste navegador antes do login. Quer enviar para a sua
            conta?
          </p>
          <div className="banner-actions">
            <button className="btn ghost sm" onClick={onDismissLegacy} disabled={sendingLegacy}>
              Agora não
            </button>
            <button
              className="btn primary sm"
              disabled={sendingLegacy}
              onClick={async () => {
                setSendingLegacy(true);
                await onImportLegacy();
                setSendingLegacy(false);
              }}
            >
              <CloudUpload size={14} /> {sendingLegacy ? 'Enviando…' : 'Enviar para minha conta'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="home-loading">Abrindo o grimório…</div>
      ) : sorted.length === 0 ? (
        <div className="home-empty">
          <div className="home-empty-art">
            <User size={56} strokeWidth={1.2} />
          </div>
          <h2>Nenhum herói por aqui… ainda.</h2>
          <p>Comece uma ficha nova ou importe um arquivo que o mestre (ou outro jogador) te enviou.</p>
          <button className="btn primary lg" onClick={onCreate}>
            <Plus size={18} /> Criar meu personagem
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {sorted.map((c) => {
            const lvl = totalLevel(c);
            const cls = c.classes.map((cl) => `${cl.name || '—'} ${cl.level}`).join(' / ');
            const pvMax = maxPV(c);
            const pmMax = maxPM(c);
            return (
              <article key={c.id} className="char-card" style={{ ['--accent' as string]: c.accent }} onClick={() => onOpen(c.id)}>
                <div className="char-card-photo">
                  {c.photo ? <img src={c.photo} alt="" /> : <User size={48} strokeWidth={1.2} />}
                  <span className="char-card-level">Nv {lvl}</span>
                </div>
                <div className="char-card-body">
                  <h3>{c.name || 'Sem nome'}</h3>
                  <p className="muted">{[c.race, cls].filter(Boolean).join(' · ')}</p>
                  <div className="mini-bars">
                    <div className="mini-bar pv">
                      <span style={{ width: `${Math.min(100, (c.pv.current / pvMax) * 100)}%` }} />
                      <em>
                        PV {c.pv.current}/{pvMax}
                      </em>
                    </div>
                    <div className="mini-bar pm">
                      <span style={{ width: `${pmMax ? Math.min(100, (c.pm.current / pmMax) * 100) : 0}%` }} />
                      <em>
                        PM {c.pm.current}/{pmMax}
                      </em>
                    </div>
                  </div>
                </div>
                <div className="char-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn" title="Exportar arquivo" onClick={() => exportCharacter(c)}>
                    <Download size={16} />
                  </button>
                  <button className="icon-btn" title="Duplicar" onClick={() => onDuplicate(c.id)}>
                    <Copy size={16} />
                  </button>
                  <button className="icon-btn danger" title="Excluir" onClick={() => setToDelete(c)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <footer className="home-foot">
        {email ? (
          <>
            Suas fichas ficam na sua conta e também neste aparelho, para funcionar sem internet. Para o mestre acompanhar, entre na mesa dele pela aba <strong>Mesas</strong>.
          </>
        ) : (
          <>
            As fichas ficam salvas neste navegador. Use <strong>Exportar</strong> para fazer backup ou mandar para o mestre.
          </>
        )}
      </footer>

      {toDelete && (
        <Modal
          title="Excluir personagem?"
          onClose={() => setToDelete(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setToDelete(null)}>
                Cancelar
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  onDelete(toDelete.id);
                  setToDelete(null);
                }}
              >
                <Trash2 size={16} /> Excluir
              </button>
            </>
          }
        >
          <p>
            <strong>{toDelete.name || 'Sem nome'}</strong> será apagado deste navegador. Se quiser guardar uma cópia, exporte antes.
          </p>
        </Modal>
      )}
    </div>
  );
}
