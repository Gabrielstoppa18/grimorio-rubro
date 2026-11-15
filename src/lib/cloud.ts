import type { Character } from '../types';
import { supabase } from './supabase';
import { normalize } from './storage';

const TABLE = 'characters';
const BUCKET = 'retratos';

interface Row {
  id: string;
  name: string;
  data: Character;
  updated_at: string;
}

/** Alterações que ainda não chegaram ao servidor (sobrevivem a recarregar a página). */
export interface Pending {
  dirty: string[];
  deleted: string[];
}

const pendingKey = (userId: string) => `grimorio:pendente:${userId}`;

export function loadPending(userId: string): Pending {
  try {
    const p = JSON.parse(localStorage.getItem(pendingKey(userId)) ?? '');
    return { dirty: Array.isArray(p.dirty) ? p.dirty : [], deleted: Array.isArray(p.deleted) ? p.deleted : [] };
  } catch {
    return { dirty: [], deleted: [] };
  }
}

export function savePending(userId: string, p: Pending) {
  try {
    localStorage.setItem(pendingKey(userId), JSON.stringify(p));
  } catch {
    /* sem espaço: as alterações continuam em memória */
  }
}

function db() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

export async function fetchRemote(): Promise<Character[]> {
  const { data, error } = await db().from(TABLE).select('id, name, data, updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as Row[]).map((r) => ({ ...normalize(r.data), id: r.id }));
}

export async function pushCharacters(chars: Character[]) {
  if (!chars.length) return;
  const rows = chars.map((c) => ({ id: c.id, name: c.name, data: c, updated_at: new Date(c.updatedAt).toISOString() }));
  const { error } = await db().from(TABLE).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteRemote(ids: string[]) {
  if (!ids.length) return;
  const { error } = await db().from(TABLE).delete().in('id', ids);
  if (error) throw error;
}

/**
 * Junta o que está no servidor com a cópia local.
 * - alterações locais pendentes vencem se forem mais novas;
 * - fichas que sumiram do servidor (apagadas em outro aparelho) somem daqui também;
 * - exclusões pendentes são respeitadas.
 */
export function merge(remote: Character[], local: Character[], pending: Pending): Character[] {
  const dirty = new Set(pending.dirty);
  const deleted = new Set(pending.deleted);
  const byId = new Map(remote.map((c) => [c.id, c]));
  for (const c of local) {
    const r = byId.get(c.id);
    if (dirty.has(c.id) && (!r || c.updatedAt >= r.updatedAt)) byId.set(c.id, c);
  }
  for (const id of deleted) byId.delete(id);
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

/**
 * Envia o retrato para o Storage e devolve a URL pública.
 * Sem login (modo local) devolve o próprio data URL.
 */
export async function uploadPortrait(charId: string, dataUrl: string): Promise<string> {
  if (!supabase || !dataUrl.startsWith('data:')) return dataUrl;
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth.session?.user.id;
  if (!userId) return dataUrl;
  const path = `${userId}/${charId}-${Date.now()}.jpg`;
  const blob = await dataUrlToBlob(dataUrl);
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Apaga um retrato antigo do Storage (ignora falhas — é só limpeza). */
export async function removePortrait(url: string) {
  if (!supabase || !url.includes(`/${BUCKET}/`)) return;
  const path = url.split(`/${BUCKET}/`)[1]?.split('?')[0];
  if (path) await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]).then(() => undefined, () => undefined);
}
