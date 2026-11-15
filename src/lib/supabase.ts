import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null quando as variáveis não estão configuradas — o app roda só no navegador (modo local). */
export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const cloudEnabled = supabase !== null;

export type OAuthProvider = 'google' | 'discord';
const KNOWN: OAuthProvider[] = ['google', 'discord'];

/**
 * Pergunta ao Supabase quais logins sociais estão ligados no painel
 * (Authentication → Providers). Assim o botão aparece sozinho, sem variável de ambiente.
 */
export async function fetchEnabledProviders(): Promise<OAuthProvider[]> {
  if (!url || !anonKey) return [];
  // Só em desenvolvimento: ?previa-google mostra o botão mesmo sem o provedor ligado.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('previa-google')) return ['google'];
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } });
    if (!res.ok) return [];
    const data = (await res.json()) as { external?: Record<string, boolean> };
    return KNOWN.filter((p) => data.external?.[p]);
  } catch {
    return [];
  }
}
