import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Character } from '../types';
import { supabase } from './supabase';
import { normalize } from './storage';

export interface Mesa {
  id: string;
  ownerId: string;
  name: string;
  gmName: string;
  description: string;
  inviteCode: string;
  createdAt: string;
  players?: number;
}

export interface MesaLink {
  mesaId: string;
  characterId: string;
  ownerId: string;
}

export interface InvitePreview {
  id: string;
  name: string;
  gmName: string;
  description: string;
  players: number;
  isGm: boolean;
}

interface MesaRow {
  id: string;
  owner_id: string;
  name: string;
  gm_name: string;
  description: string;
  invite_code: string;
  created_at: string;
  mesa_fichas?: { count: number }[];
}

interface LinkRow {
  mesa_id: string;
  character_id: string;
  owner_id: string;
}

function db() {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase;
}

const toMesa = (r: MesaRow): Mesa => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  gmName: r.gm_name,
  description: r.description,
  inviteCode: r.invite_code,
  createdAt: r.created_at,
  players: r.mesa_fichas?.[0]?.count,
});

const toLink = (r: LinkRow): MesaLink => ({ mesaId: r.mesa_id, characterId: r.character_id, ownerId: r.owner_id });

const rowToChar = (r: { id: string; data: Character }) => ({ ...normalize(r.data), id: r.id });

/** Mensagem de erro amigável (as funções do banco já devolvem textos em português). */
export const errorText = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Algo deu errado.');

export const inviteLink = (code: string) => `${window.location.origin}${window.location.pathname}#/convite/${code}`;

/** Mesas que eu mestro + mesas em que alguma ficha minha está. */
export async function listMyMesas(userId: string): Promise<{ gm: Mesa[]; playing: { mesa: Mesa; characterIds: string[] }[] }> {
  const [gm, links] = await Promise.all([
    db().from('mesas').select('*, mesa_fichas(count)').eq('owner_id', userId).order('created_at', { ascending: false }),
    db().from('mesa_fichas').select('mesa_id, character_id, owner_id, mesas(*, mesa_fichas(count))').eq('owner_id', userId),
  ]);
  if (gm.error) throw gm.error;
  if (links.error) throw links.error;
  const playing = new Map<string, { mesa: Mesa; characterIds: string[] }>();
  for (const r of links.data as unknown as (LinkRow & { mesas: MesaRow | null })[]) {
    if (!r.mesas) continue;
    const entry = playing.get(r.mesa_id) ?? { mesa: toMesa(r.mesas), characterIds: [] };
    entry.characterIds.push(r.character_id);
    playing.set(r.mesa_id, entry);
  }
  return { gm: (gm.data as MesaRow[]).map(toMesa), playing: [...playing.values()] };
}

export async function createMesa(fields: { name: string; gmName: string; description: string }): Promise<Mesa> {
  const { data, error } = await db()
    .from('mesas')
    .insert({ name: fields.name, gm_name: fields.gmName, description: fields.description })
    .select('*')
    .single();
  if (error) throw error;
  return toMesa(data as MesaRow);
}

export async function updateMesa(id: string, fields: { name: string; gmName: string; description: string }) {
  const { error } = await db().from('mesas').update({ name: fields.name, gm_name: fields.gmName, description: fields.description }).eq('id', id);
  if (error) throw error;
}

export async function deleteMesa(id: string) {
  const { error } = await db().from('mesas').delete().eq('id', id);
  if (error) throw error;
}

export async function renewInvite(id: string): Promise<string> {
  const { data, error } = await db().rpc('renovar_convite', { m: id });
  if (error) throw error;
  return data as string;
}

/** Mesa + vínculos + fichas vinculadas (o que a pessoa tem permissão de ver). */
export async function loadMesa(id: string): Promise<{ mesa: Mesa; links: MesaLink[]; chars: Character[] } | null> {
  const [m, l] = await Promise.all([
    db().from('mesas').select('*').eq('id', id).maybeSingle(),
    db().from('mesa_fichas').select('mesa_id, character_id, owner_id').eq('mesa_id', id).order('joined_at'),
  ]);
  if (m.error) throw m.error;
  if (l.error) throw l.error;
  if (!m.data) return null;
  const links = (l.data as LinkRow[]).map(toLink);
  let chars: Character[] = [];
  if (links.length) {
    const c = await db()
      .from('characters')
      .select('id, data')
      .in(
        'id',
        links.map((x) => x.characterId),
      );
    if (c.error) throw c.error;
    chars = (c.data as { id: string; data: Character }[]).map(rowToChar);
  }
  return { mesa: toMesa(m.data as MesaRow), links, chars };
}

export async function loadCharacter(id: string): Promise<Character | null> {
  const { data, error } = await db().from('characters').select('id, data').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToChar(data as { id: string; data: Character }) : null;
}

export async function previewInvite(code: string): Promise<InvitePreview | null> {
  const { data, error } = await db().rpc('mesa_por_convite', { codigo: code });
  if (error) throw error;
  const r = (data as { id: string; name: string; gm_name: string; description: string; jogadores: number; sou_mestre: boolean }[])[0];
  return r ? { id: r.id, name: r.name, gmName: r.gm_name, description: r.description, players: r.jogadores, isGm: r.sou_mestre } : null;
}

export async function joinMesa(code: string, characterId: string): Promise<string> {
  const { data, error } = await db().rpc('entrar_na_mesa', { codigo: code, ficha: characterId });
  if (error) throw error;
  return data as string;
}

export async function leaveMesa(mesaId: string, characterId: string) {
  const { error } = await db().from('mesa_fichas').delete().eq('mesa_id', mesaId).eq('character_id', characterId);
  if (error) throw error;
}

/**
 * Escuta mudanças nas fichas vinculadas e nos vínculos da mesa.
 * Devolve a função que encerra a escuta.
 */
export function watchMesa(
  mesaId: string,
  characterIds: string[],
  onCharacter: (c: Character) => void,
  onRosterChange: () => void,
): () => void {
  if (!supabase) return () => {};
  const sb = supabase;
  let ch: RealtimeChannel = sb
    .channel(`mesa-${mesaId}-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mesa_fichas', filter: `mesa_id=eq.${mesaId}` }, onRosterChange)
    // Exclusões não podem ser filtradas pelo Realtime; recarregar é barato.
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mesa_fichas' }, (p) => {
      const old = p.old as Partial<LinkRow>;
      if (!old.mesa_id || old.mesa_id === mesaId) onRosterChange();
    });
  if (characterIds.length) {
    ch = ch.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=in.(${characterIds.join(",")})` },
      (p) => {
        const row = p.new as { id: string; data: Character };
        if (row?.data) onCharacter(rowToChar(row));
      },
    );
  }
  ch.subscribe();
  return () => void sb.removeChannel(ch);
}
