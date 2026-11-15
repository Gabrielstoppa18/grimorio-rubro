import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Copy, Crown, DoorOpen, KeyRound, LogOut, Pencil, Plus, RefreshCw, Share2, Shield, Trash2, User, UserMinus, Users } from 'lucide-react';
import type { Character } from '../types';
import { defense, maxPM, maxPV, totalLevel } from '../lib/calc';
import { pushCharacters } from '../lib/cloud';
import {
  createMesa,
  deleteMesa,
  errorText,
  inviteLink,
  joinMesa,
  leaveMesa,
  listMyMesas,
  loadCharacter,
  loadMesa,
  previewInvite,
  renewInvite,
  updateMesa,
  watchMesa,
  type InvitePreview,
  type Mesa,
  type MesaLink,
} from '../lib/mesas';
import { Divider } from './Ornaments';
import { AccountMenu, SyncBadge } from './Account';
import { Modal } from './ui';
import { Sheet } from './Sheet';

export const go = (hash: string) => {
  window.location.hash = hash;
  window.scrollTo(0, 0);
};

/** Abas da tela inicial: Personagens | Mesas. */
export function HomeNav({ active }: { active: 'chars' | 'mesas' }) {
  return (
    <nav className="tabs home-nav" aria-label="Seções">
      <a className={`tab ${active === 'chars' ? 'active' : ''}`} href="#/" aria-current={active === 'chars' ? 'page' : undefined}>
        <User size={16} /> <span>Personagens</span>
      </a>
      <a className={`tab ${active === 'mesas' ? 'active' : ''}`} href="#/mesas" aria-current={active === 'mesas' ? 'page' : undefined}>
        <Users size={16} /> <span>Mesas</span>
      </a>
    </nav>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div className="home-account">
        <SyncBadge />
        <AccountMenu />
      </div>
      <header className="home-hero">
        <div className="brand">
          <img className="brand-logo" src="./logo-256.webp" alt="" width={256} height={256} />
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
      </header>
      <Divider />
    </>
  );
}

// ---------------------------------------------------------------------------
// Lista de mesas
// ---------------------------------------------------------------------------

interface MesaForm {
  name: string;
  gmName: string;
  description: string;
}

function MesaFormModal({ title, initial, submitLabel, onClose, onSubmit }: { title: string; initial: MesaForm; submitLabel: string; onClose: () => void; onSubmit: (f: MesaForm) => Promise<void> }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!f.name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({ name: f.name.trim(), gmName: f.gmName.trim(), description: f.description.trim() });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={() => void submit()} disabled={busy || !f.name.trim()}>
            <Check size={16} /> {busy ? 'Salvando…' : submitLabel}
          </button>
        </>
      }
    >
      <form className="mesa-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Nome da mesa</span>
          <input autoFocus value={f.name} placeholder="A Flecha de Fogo" onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Mestre</span>
          <input value={f.gmName} placeholder="Como os jogadores te chamam" onChange={(e) => setF({ ...f, gmName: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Descrição (opcional)</span>
          <textarea className="textarea" rows={3} value={f.description} placeholder="Campanha, dia e horário, regras da casa…" onChange={(e) => setF({ ...f, description: e.target.value })} />
        </label>
        {error && <div className="banner-error">{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export function MesasPage({ userId, chars, defaultGmName }: { userId: string; chars: Character[]; defaultGmName: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof listMyMesas>> | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');

  const load = useCallback(() => {
    listMyMesas(userId)
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(`Não foi possível carregar as mesas: ${errorText(e)}`));
  }, [userId]);

  useEffect(load, [load]);

  const charName = (id: string) => chars.find((c) => c.id === id)?.name || 'Sem nome';

  const openCode = (e: FormEvent) => {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) return;
    const fromLink = raw.match(/convite\/([A-Za-z0-9]+)/);
    go(`#/convite/${(fromLink ? fromLink[1] : raw).toUpperCase()}`);
  };

  return (
    <div className="home">
      <PageHeader title="Mesas" subtitle="Reúna as fichas do grupo num só lugar — o mestre acompanha tudo ao vivo." />
      <HomeNav active="mesas" />

      {error && <div className="banner-error">{error}</div>}

      <section className="mesa-section">
        <header className="mesa-section-head">
          <h2>
            <Crown size={18} /> Mesas que eu mestro
          </h2>
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Nova mesa
          </button>
        </header>
        {!data ? (
          !error && <div className="home-loading">Abrindo o grimório…</div>
        ) : data.gm.length === 0 ? (
          <p className="mesa-empty">Você ainda não mestra nenhuma mesa. Crie uma e mande o convite para os jogadores.</p>
        ) : (
          <div className="mesa-grid">
            {data.gm.map((m) => (
              <a key={m.id} className="mesa-card" href={`#/mesa/${m.id}`}>
                <h3>{m.name || 'Mesa sem nome'}</h3>
                {m.description && <p className="mesa-card-desc">{m.description}</p>}
                <span className="mesa-card-meta">
                  <Users size={14} /> {m.players ?? 0} {m.players === 1 ? 'ficha' : 'fichas'}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="mesa-section">
        <header className="mesa-section-head">
          <h2>
            <Shield size={18} /> Mesas em que jogo
          </h2>
        </header>
        {data && data.playing.length === 0 && <p className="mesa-empty">Nenhuma ficha sua está vinculada a uma mesa. Peça o convite ao mestre.</p>}
        {data && data.playing.length > 0 && (
          <div className="mesa-grid">
            {data.playing.map(({ mesa, characterIds }) => (
              <a key={mesa.id} className="mesa-card" href={`#/mesa/${mesa.id}`}>
                <h3>{mesa.name || 'Mesa sem nome'}</h3>
                {mesa.gmName && (
                  <p className="mesa-card-gm">
                    <Crown size={13} /> {mesa.gmName}
                  </p>
                )}
                <span className="mesa-card-meta">
                  <User size={14} /> {characterIds.map(charName).join(', ')}
                </span>
              </a>
            ))}
          </div>
        )}
        <form className="invite-code-form" onSubmit={openCode}>
          <label className="field">
            <span className="field-label">Recebeu um convite?</span>
            <input value={code} placeholder="Cole o link ou digite o código" onChange={(e) => setCode(e.target.value)} />
          </label>
          <button className="btn" type="submit" disabled={!code.trim()}>
            <KeyRound size={16} /> Abrir convite
          </button>
        </form>
      </section>

      {creating && (
        <MesaFormModal
          title="Nova mesa"
          submitLabel="Criar mesa"
          initial={{ name: '', gmName: defaultGmName, description: '' }}
          onClose={() => setCreating(false)}
          onSubmit={async (f) => {
            const m = await createMesa(f);
            go(`#/mesa/${m.id}`);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Uma mesa: convite (mestre) e fichas do grupo
// ---------------------------------------------------------------------------

function InviteBox({ mesa, onRenewed }: { mesa: Mesa; onRenewed: (code: string) => void }) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [confirmRenew, setConfirmRenew] = useState(false);
  const link = inviteLink(mesa.inviteCode);

  const copy = async (text: string, what: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      prompt('Copie o convite:', text);
    }
  };

  const share = () =>
    void navigator.share?.({ title: `Mesa ${mesa.name}`, text: `Entre na mesa "${mesa.name}" no Grimório Rubro e vincule sua ficha:`, url: link }).catch(() => {});

  return (
    <section className="invite-box">
      <div className="invite-text">
        <h3>
          <KeyRound size={18} /> Convite
        </h3>
        <p>Mande este link para os jogadores. Cada um escolhe a própria ficha e ela aparece aqui.</p>
      </div>
      <div className="invite-row">
        <input className="invite-link" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link de convite" />
        <button className="btn primary sm" onClick={() => void copy(link, 'link')}>
          {copied === 'link' ? <Check size={15} /> : <Copy size={15} />} {copied === 'link' ? 'Copiado' : 'Copiar link'}
        </button>
        {'share' in navigator && (
          <button className="btn sm" onClick={share}>
            <Share2 size={15} /> Enviar
          </button>
        )}
      </div>
      <div className="invite-row invite-code-row">
        <span className="muted">Código:</span>
        <button className="invite-code" onClick={() => void copy(mesa.inviteCode, 'code')} title="Copiar código">
          {mesa.inviteCode}
        </button>
        {copied === 'code' && <span className="muted small">copiado!</span>}
        <span className="spacer" />
        <button className="btn ghost sm" onClick={() => setConfirmRenew(true)} title="O link antigo deixa de funcionar">
          <RefreshCw size={14} /> Novo código
        </button>
      </div>
      {confirmRenew && (
        <Modal
          title="Gerar novo código?"
          onClose={() => setConfirmRenew(false)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setConfirmRenew(false)}>
                Cancelar
              </button>
              <button
                className="btn primary"
                onClick={async () => {
                  try {
                    onRenewed(await renewInvite(mesa.id));
                  } catch (e) {
                    alert(errorText(e));
                  }
                  setConfirmRenew(false);
                }}
              >
                <RefreshCw size={16} /> Gerar
              </button>
            </>
          }
        >
          <p>O link e o código atuais deixam de funcionar. Quem já está na mesa continua nela.</p>
        </Modal>
      )}
    </section>
  );
}

function PartyCard({ c, link, isMine, canRemove, onOpen, onRemove }: { c: Character; link: MesaLink; isMine: boolean; canRemove: boolean; onOpen: () => void; onRemove: () => void }) {
  const pvMax = maxPV(c);
  const pmMax = maxPM(c);
  const cls = c.classes.map((cl) => `${cl.name || '—'} ${cl.level}`).join(' / ');
  const pvPct = pvMax ? Math.max(0, Math.min(100, (c.pv.current / pvMax) * 100)) : 0;
  const down = c.pv.current <= 0 && pvMax > 0;
  return (
    <article className={`char-card party-card ${down ? 'is-down' : ''}`} style={{ ['--accent' as string]: c.accent }} onClick={onOpen} data-owner={link.ownerId}>
      <div className="char-card-photo">
        {c.photo ? <img src={c.photo} alt="" /> : <User size={48} strokeWidth={1.2} />}
        <span className="char-card-level">Nv {totalLevel(c)}</span>
        {isMine && <span className="party-mine">Sua ficha</span>}
      </div>
      <div className="char-card-body">
        <h3>{c.name || 'Sem nome'}</h3>
        <p className="muted">{[c.race, cls].filter(Boolean).join(' · ') || '—'}</p>
        {c.player && <p className="party-player">{c.player}</p>}
        <div className="party-stats">
          <div className="mini-bars">
            <div className="mini-bar pv">
              <span style={{ width: `${pvPct}%` }} />
              <em>
                PV {c.pv.current}/{pvMax}
                {c.pv.temp > 0 ? ` +${c.pv.temp}` : ''}
              </em>
            </div>
            <div className="mini-bar pm">
              <span style={{ width: `${pmMax ? Math.min(100, (c.pm.current / pmMax) * 100) : 0}%` }} />
              <em>
                PM {c.pm.current}/{pmMax}
              </em>
            </div>
          </div>
          <div className="party-def" title="Defesa">
            <small>Def</small>
            {defense(c)}
          </div>
        </div>
        {c.conditions.trim() && <p className="party-cond">{c.conditions}</p>}
      </div>
      {canRemove && (
        <div className="char-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn danger" title={isMine ? 'Tirar minha ficha da mesa' : 'Remover da mesa'} onClick={onRemove}>
            {isMine ? <LogOut size={16} /> : <UserMinus size={16} />}
          </button>
        </div>
      )}
    </article>
  );
}

export function MesaPage({ mesaId, userId }: { mesaId: string; userId: string }) {
  const [state, setState] = useState<{ mesa: Mesa; links: MesaLink[]; chars: Character[] } | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState<{ link: MesaLink; c: Character } | null>(null);

  const load = useCallback(() => {
    loadMesa(mesaId)
      .then((d) => {
        setState(d);
        setError('');
      })
      .catch((e) => setError(`Não foi possível abrir a mesa: ${errorText(e)}`));
  }, [mesaId]);

  useEffect(load, [load]);

  // Ao vivo: fichas que mudam e jogadores que entram/saem.
  const idsKey = state?.links.map((l) => l.characterId).join(',') ?? '';
  useEffect(() => {
    if (!state) return;
    const stop = watchMesa(
      mesaId,
      idsKey ? idsKey.split(',') : [],
      (c) => setState((s) => (s ? { ...s, chars: s.chars.map((x) => (x.id === c.id ? c : x)) } : s)),
      load,
    );
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaId, idsKey, !!state, load]);

  if (state === undefined)
    return (
      <div className="home">
        {error ? <div className="banner-error">{error}</div> : <div className="home-loading">Abrindo a mesa…</div>}
      </div>
    );

  if (state === null)
    return (
      <div className="home">
        <div className="home-empty">
          <h2>Mesa não encontrada</h2>
          <p>Ela pode ter sido apagada pelo mestre, ou nenhuma ficha sua está mais nela.</p>
          <a className="btn primary" href="#/mesas">
            <ArrowLeft size={16} /> Voltar às mesas
          </a>
        </div>
      </div>
    );

  const { mesa, links, chars } = state;
  const isGm = mesa.ownerId === userId;
  const byId = new Map(chars.map((c) => [c.id, c]));
  const party = links.map((l) => ({ link: l, c: byId.get(l.characterId) })).filter((x): x is { link: MesaLink; c: Character } => !!x.c);

  const open = (link: MesaLink) => go(link.ownerId === userId ? `#/ficha/${encodeURIComponent(link.characterId)}` : `#/mesa/${mesaId}/ficha/${encodeURIComponent(link.characterId)}`);

  return (
    <div className="home mesa-page">
      <nav className="topbar">
        <a className="btn ghost sm" href="#/mesas">
          <ArrowLeft size={16} /> <span className="hide-xs">Mesas</span>
        </a>
        <div className="topbar-actions">
          {isGm && (
            <>
              <button className="btn ghost sm" onClick={() => setEditing(true)}>
                <Pencil size={14} /> <span className="hide-xs">Editar</span>
              </button>
              <button className="btn ghost sm danger-text" onClick={() => setDeleting(true)}>
                <Trash2 size={14} /> <span className="hide-xs">Apagar mesa</span>
              </button>
            </>
          )}
        </div>
      </nav>

      <header className="mesa-head">
        <span className="mesa-role">{isGm ? 'Você é o mestre' : 'Você joga nesta mesa'}</span>
        <h1>{mesa.name || 'Mesa sem nome'}</h1>
        {mesa.gmName && (
          <p className="mesa-gm">
            <Crown size={15} /> Mestre: {mesa.gmName}
          </p>
        )}
        {mesa.description && <p className="mesa-desc">{mesa.description}</p>}
      </header>

      <Divider />

      {error && <div className="banner-error">{error}</div>}

      {isGm && <InviteBox mesa={mesa} onRenewed={(code) => setState({ ...state, mesa: { ...mesa, inviteCode: code } })} />}

      <section className="mesa-section">
        <header className="mesa-section-head">
          <h2>
            <Users size={18} /> Grupo <em className="tab-count">{party.length}</em>
          </h2>
          <span className="live-dot" title="As fichas se atualizam sozinhas quando os jogadores mexem">
            ao vivo
          </span>
        </header>
        {party.length === 0 ? (
          <p className="mesa-empty">{isGm ? 'Ninguém entrou ainda. Mande o convite acima para os jogadores.' : 'Nenhuma ficha nesta mesa.'}</p>
        ) : (
          <div className="card-grid">
            {party.map(({ link, c }) => (
              <PartyCard
                key={link.characterId}
                c={c}
                link={link}
                isMine={link.ownerId === userId}
                canRemove={isGm || link.ownerId === userId}
                onOpen={() => open(link)}
                onRemove={() => setRemoving({ link, c })}
              />
            ))}
          </div>
        )}
        {!isGm && (
          <p className="mesa-note">
            Fichas dos colegas abrem só para leitura. Para pôr outra ficha sua nesta mesa, use o convite do mestre.
          </p>
        )}
      </section>

      {editing && (
        <MesaFormModal
          title="Editar mesa"
          submitLabel="Salvar"
          initial={{ name: mesa.name, gmName: mesa.gmName, description: mesa.description }}
          onClose={() => setEditing(false)}
          onSubmit={async (f) => {
            await updateMesa(mesa.id, f);
            setState({ ...state, mesa: { ...mesa, ...f } });
            setEditing(false);
          }}
        />
      )}

      {deleting && (
        <Modal
          title="Apagar a mesa?"
          onClose={() => setDeleting(false)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setDeleting(false)}>
                Cancelar
              </button>
              <button
                className="btn danger"
                onClick={async () => {
                  try {
                    await deleteMesa(mesa.id);
                    go('#/mesas');
                  } catch (e) {
                    alert(errorText(e));
                  }
                }}
              >
                <Trash2 size={16} /> Apagar
              </button>
            </>
          }
        >
          <p>
            <strong>{mesa.name}</strong> será apagada e o convite deixa de funcionar. As fichas dos jogadores <strong>não</strong> são apagadas — continuam com eles.
          </p>
        </Modal>
      )}

      {removing && (
        <Modal
          title={removing.link.ownerId === userId ? 'Tirar sua ficha da mesa?' : 'Remover da mesa?'}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setRemoving(null)}>
                Cancelar
              </button>
              <button
                className="btn danger"
                onClick={async () => {
                  try {
                    await leaveMesa(mesa.id, removing.link.characterId);
                    setRemoving(null);
                    if (!isGm && party.filter((p) => p.link.ownerId === userId).length <= 1) go('#/mesas');
                    else load();
                  } catch (e) {
                    alert(errorText(e));
                  }
                }}
              >
                <DoorOpen size={16} /> {removing.link.ownerId === userId ? 'Sair da mesa' : 'Remover'}
              </button>
            </>
          }
        >
          <p>
            <strong>{removing.c.name || 'Sem nome'}</strong> deixa de aparecer nesta mesa. A ficha em si não é apagada.
          </p>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ficha de outra pessoa (só leitura, ao vivo)
// ---------------------------------------------------------------------------

export function MesaSheet({ mesaId, charId }: { mesaId: string; charId: string }) {
  const [c, setC] = useState<Character | null | undefined>(undefined);

  const load = useCallback(() => {
    loadCharacter(charId).then(setC, () => setC((x) => x ?? null));
  }, [charId]);

  useEffect(() => {
    load();
    const stop = watchMesa(mesaId, [charId], setC, () => {});
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [mesaId, charId, load]);

  const back = () => go(`#/mesa/${mesaId}`);

  if (c === undefined) return <div className="splash">Abrindo a ficha…</div>;
  if (c === null)
    return (
      <div className="home">
        <div className="home-empty">
          <h2>Ficha indisponível</h2>
          <p>Ela saiu da mesa ou foi apagada.</p>
          <button className="btn primary" onClick={back}>
            <ArrowLeft size={16} /> Voltar à mesa
          </button>
        </div>
      </div>
    );

  return <Sheet key={c.id} c={c} update={() => {}} onBack={back} readOnly live backLabel="Mesa" />;
}

// ---------------------------------------------------------------------------
// Convite: escolher qual ficha vincular
// ---------------------------------------------------------------------------

export function InvitePage({ code, chars, onCreate }: { code: string; chars: Character[]; onCreate: () => Character }) {
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    previewInvite(code).then(setPreview, (e) => {
      setPreview(null);
      setError(errorText(e));
    });
  }, [code]);

  const join = async (c: Character, openSheet = false) => {
    setBusy(true);
    setError('');
    try {
      // Garante que a ficha já está no servidor antes de vincular.
      await pushCharacters([c]);
      const mesaId = await joinMesa(code, c.id);
      go(openSheet ? `#/ficha/${encodeURIComponent(c.id)}` : `#/mesa/${mesaId}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const sorted = [...chars].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="home invite-page">
      <nav className="topbar">
        <a className="btn ghost sm" href="#/mesas">
          <ArrowLeft size={16} /> <span className="hide-xs">Mesas</span>
        </a>
      </nav>

      {preview === undefined ? (
        <div className="home-loading">Lendo o convite…</div>
      ) : preview === null ? (
        <div className="home-empty">
          <h2>Convite inválido</h2>
          <p>O código <strong>{code}</strong> não existe ou foi trocado pelo mestre. Peça um link novo.</p>
          {error && <div className="banner-error">{error}</div>}
          <a className="btn primary" href="#/mesas">
            Ir para as mesas
          </a>
        </div>
      ) : (
        <>
          <header className="mesa-head">
            <span className="mesa-role">Você foi convidado para a mesa</span>
            <h1>{preview.name || 'Mesa sem nome'}</h1>
            {preview.gmName && (
              <p className="mesa-gm">
                <Crown size={15} /> Mestre: {preview.gmName}
              </p>
            )}
            {preview.description && <p className="mesa-desc">{preview.description}</p>}
            <p className="muted small">
              {preview.players} {preview.players === 1 ? 'ficha já está' : 'fichas já estão'} na mesa
            </p>
          </header>
          <Divider />

          {preview.isGm && (
            <div className="banner-legacy">
              <Crown size={20} />
              <p>Esta mesa é sua. Você pode vincular uma ficha também, se quiser jogar nela.</p>
              <a className="btn sm" href={`#/mesa/${preview.id}`}>
                Abrir a mesa
              </a>
            </div>
          )}

          <section className="mesa-section">
            <header className="mesa-section-head">
              <h2>Qual ficha vai para a mesa?</h2>
            </header>
            <p className="mesa-note">O mestre e os colegas de mesa vão poder ver a ficha (sem editar). Só você continua alterando.</p>

            {sorted.length > 0 && (
              <div className="pick-list" role="radiogroup" aria-label="Escolha a ficha">
                {sorted.map((c) => (
                  <button
                    key={c.id}
                    role="radio"
                    aria-checked={picked === c.id}
                    className={`pick-card ${picked === c.id ? 'active' : ''}`}
                    style={{ ['--accent' as string]: c.accent }}
                    onClick={() => setPicked(c.id)}
                  >
                    <span className="pick-photo">{c.photo ? <img src={c.photo} alt="" /> : <User size={28} strokeWidth={1.3} />}</span>
                    <span className="pick-info">
                      <strong>{c.name || 'Sem nome'}</strong>
                      <small>
                        Nível {totalLevel(c)}
                        {c.race ? ` · ${c.race}` : ''}
                        {c.classes[0]?.name ? ` · ${c.classes.map((cl) => cl.name).join('/')}` : ''}
                      </small>
                    </span>
                    {picked === c.id && <Check size={18} className="pick-check" />}
                  </button>
                ))}
              </div>
            )}

            {error && <div className="banner-error">{error}</div>}

            <div className="invite-actions">
              <button className="btn ghost" disabled={busy} onClick={() => void join(onCreate(), true)}>
                <Plus size={16} /> Criar personagem novo
              </button>
              {sorted.length > 0 && (
                <button
                  className="btn primary lg"
                  disabled={busy || !picked}
                  onClick={() => {
                    const c = chars.find((x) => x.id === picked);
                    if (c) void join(c);
                  }}
                >
                  <DoorOpen size={18} /> {busy ? 'Entrando…' : 'Entrar na mesa'}
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
