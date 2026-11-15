import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Character } from './types';
import { LOCAL_KEY, loadAll, newCharacter, saveAll, uid, userCacheKey } from './lib/storage';
import { cloudEnabled, supabase } from './lib/supabase';
import { deleteRemote, fetchRemote, loadPending, merge, pushCharacters, removePortrait, savePending, uploadPortrait, type Pending } from './lib/cloud';
import { CharacterList } from './components/CharacterList';
import { Sheet } from './components/Sheet';
import { Login } from './components/Login';
import { AccountContext, type SyncStatus } from './components/Account';
import { InvitePage, MesaPage, MesaSheet, MesasPage } from './components/Mesas';

type Route =
  | { kind: 'list' }
  | { kind: 'sheet'; id: string }
  | { kind: 'mesas' }
  | { kind: 'mesa'; id: string }
  | { kind: 'mesaSheet'; mesaId: string; charId: string }
  | { kind: 'convite'; code: string };

function parseRoute(): Route {
  const h = window.location.hash;
  let m: RegExpMatchArray | null;
  if ((m = h.match(/^#\/ficha\/(.+)$/))) return { kind: 'sheet', id: decodeURIComponent(m[1]) };
  if ((m = h.match(/^#\/mesa\/([^/]+)\/ficha\/(.+)$/))) return { kind: 'mesaSheet', mesaId: m[1], charId: decodeURIComponent(m[2]) };
  if ((m = h.match(/^#\/mesa\/([^/]+)$/))) return { kind: 'mesa', id: m[1] };
  if (h === '#/mesas') return { kind: 'mesas' };
  if ((m = h.match(/^#\/convite\/([A-Za-z0-9]+)/))) return { kind: 'convite', code: m[1].toUpperCase() };
  return { kind: 'list' };
}

/** Convite aberto antes do login: guardado para continuar depois de entrar. */
const INVITE_KEY = 'grimorio:convite';
const storedInvite = () => {
  try {
    return localStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
};
const setStoredInvite = (code: string | null) => {
  try {
    if (code) localStorage.setItem(INVITE_KEY, code);
    else localStorage.removeItem(INVITE_KEY);
  } catch {
    /* sem armazenamento: o convite só não sobrevive ao login */
  }
};

export type Updater = (fn: (draft: Character) => void) => void;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!cloudEnabled);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="splash">Abrindo o grimório…</div>;
  if (cloudEnabled && !session) {
    const r = parseRoute();
    if (r.kind === 'convite') setStoredInvite(r.code);
    return <Login invited={r.kind === 'convite' || !!storedInvite()} />;
  }

  const userId = session?.user.id ?? null;
  const meta = session?.user.user_metadata ?? {};
  const displayName = String(meta.full_name || meta.name || '').trim();
  return <Workspace key={userId ?? 'local'} userId={userId} email={session?.user.email ?? null} displayName={displayName} />;
}

const RETRY_MS = 15000;

function Workspace({ userId, email, displayName }: { userId: string | null; email: string | null; displayName: string }) {
  const storageKey = userId ? userCacheKey(userId) : LOCAL_KEY;
  const [chars, setChars] = useState<Character[]>(() => loadAll(storageKey));
  const [route, setRoute] = useState<Route>(() => {
    // Voltou do login com um convite pendente: continua de onde parou.
    const pendingInvite = userId ? storedInvite() : null;
    if (pendingInvite && parseRoute().kind !== 'convite') {
      window.location.hash = `#/convite/${pendingInvite}`;
      return { kind: 'convite', code: pendingInvite };
    }
    return parseRoute();
  });
  const [saveError, setSaveError] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(userId ? 'syncing' : 'local');
  const [loaded, setLoaded] = useState(!userId);
  const [legacy, setLegacy] = useState<Character[]>(() => (userId ? loadAll(LOCAL_KEY) : []));

  const charsRef = useRef(chars);
  charsRef.current = chars;
  const pending = useRef<Pending>(userId ? loadPending(userId) : { dirty: [], deleted: [] });
  const timer = useRef<number | undefined>(undefined);
  const flushing = useRef(false);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Cópia local sempre atualizada (permite abrir e editar offline).
  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    const t = setTimeout(() => setSaveError(!saveAll(chars, storageKey)), 300);
    return () => clearTimeout(t);
  }, [chars, storageKey]);

  // ---------- Sincronização com o Supabase ----------
  const flush = useCallback(async () => {
    if (!userId || flushing.current) return;
    const p = pending.current;
    if (!p.dirty.length && !p.deleted.length) {
      setStatus('saved');
      return;
    }
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    flushing.current = true;
    setStatus('syncing');
    const sent = charsRef.current.filter((c) => p.dirty.includes(c.id)).map((c) => ({ id: c.id, at: c.updatedAt, c }));
    const sentDeletes = [...p.deleted];
    try {
      await pushCharacters(sent.map((s) => s.c));
      await deleteRemote(sentDeletes);
      // Só tira da fila o que não mudou enquanto enviávamos.
      const now = new Map(charsRef.current.map((c) => [c.id, c.updatedAt]));
      const done = new Set(sent.filter((s) => now.get(s.id) === s.at || !now.has(s.id)).map((s) => s.id));
      p.dirty = p.dirty.filter((id) => !done.has(id) && now.has(id));
      p.deleted = p.deleted.filter((id) => !sentDeletes.includes(id));
      savePending(userId, p);
      flushing.current = false;
      if (p.dirty.length || p.deleted.length) timer.current = window.setTimeout(() => void flush(), 500);
      else setStatus('saved');
    } catch {
      flushing.current = false;
      setStatus(navigator.onLine ? 'error' : 'offline');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), RETRY_MS);
    }
  }, [userId]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flushRef.current(), 1000);
  }, []);

  const markDirty = useCallback(
    (id: string) => {
      if (!userId) return;
      const p = pending.current;
      if (!p.dirty.includes(id)) {
        p.dirty.push(id);
        savePending(userId, p);
      }
      setStatus('syncing');
      schedule();
    },
    [userId, schedule],
  );

  const markDeleted = useCallback(
    (id: string) => {
      if (!userId) return;
      const p = pending.current;
      p.dirty = p.dirty.filter((x) => x !== id);
      if (!p.deleted.includes(id)) p.deleted.push(id);
      savePending(userId, p);
      setStatus('syncing');
      schedule();
    },
    [userId, schedule],
  );

  // Primeira carga: busca no servidor e junta com a cópia local.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetchRemote(userId)
      .then((remote) => {
        if (!alive) return;
        setChars(merge(remote, charsRef.current, pending.current));
        setLoaded(true);
        void flushRef.current();
      })
      .catch(() => {
        if (!alive) return;
        setLoaded(true);
        setStatus(navigator.onLine ? 'error' : 'offline');
        timer.current = window.setTimeout(() => void flushRef.current(), RETRY_MS);
      });
    const onOnline = () => void flushRef.current();
    window.addEventListener('online', onOnline);
    return () => {
      alive = false;
      window.removeEventListener('online', onOnline);
      window.clearTimeout(timer.current);
    };
  }, [userId]);

  // ---------- Ações ----------
  const open = (id: string | null) => {
    window.location.hash = id ? `#/ficha/${encodeURIComponent(id)}` : '#/';
    window.scrollTo(0, 0);
  };

  const createBlank = () => {
    const c = newCharacter();
    setChars((l) => [c, ...l]);
    markDirty(c.id);
    return c;
  };

  const create = () => open(createBlank().id);

  const add = (c: Character) => {
    setChars((l) => [c, ...l]);
    markDirty(c.id);
  };

  const releasePhoto = useCallback((url: string, exceptId: string) => {
    if (!url || charsRef.current.some((c) => c.id !== exceptId && c.photo === url)) return;
    void removePortrait(url);
  }, []);

  const remove = (id: string) => {
    const c = charsRef.current.find((x) => x.id === id);
    setChars((l) => l.filter((x) => x.id !== id));
    markDeleted(id);
    if (c?.photo) releasePhoto(c.photo, id);
  };

  const duplicate = (id: string) => {
    const src = charsRef.current.find((c) => c.id === id);
    if (!src) return;
    const copy: Character = { ...structuredClone(src), id: uid(), name: `${src.name || 'Sem nome'} (cópia)`, updatedAt: Date.now() };
    setChars((l) => [copy, ...l]);
    markDirty(copy.id);
  };

  const update = useCallback(
    (id: string): Updater =>
      (fn) => {
        setChars((l) =>
          l.map((c) => {
            if (c.id !== id) return c;
            const draft = structuredClone(c);
            fn(draft);
            draft.updatedAt = Date.now();
            return draft;
          }),
        );
        markDirty(id);
      },
    [markDirty],
  );

  /** Envia para a conta as fichas que estavam salvas só neste navegador. */
  const importLegacy = async () => {
    const taken = new Set(charsRef.current.map((c) => c.id));
    const out: Character[] = [];
    for (const c of legacy) {
      const id = taken.has(c.id) ? uid() : c.id;
      let photo = c.photo;
      if (photo.startsWith('data:')) {
        try {
          photo = await uploadPortrait(id, photo);
        } catch {
          /* mantém a foto embutida se o envio falhar */
        }
      }
      out.push({ ...c, id, photo, updatedAt: Date.now() });
    }
    setChars((l) => [...out, ...l]);
    out.forEach((c) => markDirty(c.id));
    localStorage.removeItem(LOCAL_KEY);
    setLegacy([]);
  };

  const signOut = async () => {
    if (!supabase) return;
    await flushRef.current();
    const p = pending.current;
    if ((p.dirty.length || p.deleted.length) && !confirm('Algumas alterações ainda não foram enviadas para a nuvem e serão perdidas. Sair mesmo assim?')) return;
    if (userId) {
      localStorage.removeItem(userCacheKey(userId));
      localStorage.removeItem(`grimorio:pendente:${userId}`);
    }
    window.location.hash = '#/';
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (route.kind === 'convite') setStoredInvite(null);
  }, [route]);

  const current = route.kind === 'sheet' ? chars.find((c) => c.id === route.id) : undefined;
  const cloudRoute = userId && (route.kind === 'mesas' || route.kind === 'mesa' || route.kind === 'mesaSheet' || route.kind === 'convite');

  return (
    <AccountContext.Provider value={{ status, email, signOut: userId ? () => void signOut() : null, releasePhoto }}>
      {saveError && (
        <div className="banner-error">
          Não foi possível salvar no navegador (talvez a memória local esteja cheia). Exporte suas fichas para não perder nada.
        </div>
      )}
      {cloudRoute && userId ? (
        route.kind === 'mesas' ? (
          <MesasPage userId={userId} chars={chars} defaultGmName={displayName} />
        ) : route.kind === 'mesa' ? (
          <MesaPage key={route.id} mesaId={route.id} userId={userId} />
        ) : route.kind === 'mesaSheet' ? (
          <MesaSheet key={route.charId} mesaId={route.mesaId} charId={route.charId} />
        ) : route.kind === 'convite' ? (
          <InvitePage key={route.code} code={route.code} chars={chars} onCreate={createBlank} />
        ) : null
      ) : current ? (
        <Sheet key={current.id} c={current} update={update(current.id)} onBack={() => open(null)} />
      ) : (
        <CharacterList
          chars={chars}
          loading={!loaded && chars.length === 0}
          legacyCount={legacy.length}
          onImportLegacy={importLegacy}
          onDismissLegacy={() => setLegacy([])}
          onOpen={open}
          onCreate={create}
          onImport={add}
          onDelete={remove}
          onDuplicate={duplicate}
        />
      )}
    </AccountContext.Provider>
  );
}
