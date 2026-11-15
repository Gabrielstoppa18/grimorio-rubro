import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null quando as variáveis não estão configuradas — o app roda só no navegador (modo local). */
export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const cloudEnabled = supabase !== null;

/** Provedores extras de login (ex.: "google,discord"), ativados no painel do Supabase. */
export const oauthProviders = ((import.meta.env.VITE_AUTH_PROVIDERS as string | undefined) ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter((s): s is 'google' | 'discord' => s === 'google' || s === 'discord');
