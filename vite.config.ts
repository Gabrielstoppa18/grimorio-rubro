import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Lê também as variáveis do sistema (é assim que a Vercel as entrega no build).
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  // Aceita os nomes VITE_* ou os nomes "puros" usados no painel da Vercel.
  // Só estas duas chaves públicas vão para o site — nunca a secret key.
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';

  if (anonKey.startsWith('sb_secret_')) {
    throw new Error('A chave configurada é a SECRET key do Supabase. Use a publishable/anon key.');
  }

  return {
    plugins: [react()],
    base: './',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anonKey),
    },
  };
});
