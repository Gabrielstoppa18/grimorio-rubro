# Grimório Rubro

Web app de fichas de Tormenta 20 para os jogadores criarem e acompanharem seus personagens.

- Atributos, perícias (com ½ nível, treino e penalidade de armadura calculados), Defesa, PV/PM automáticos por classe (com multiclasse)
- Rastreador de PV/PM com dano, cura e pontos temporários
- Poderes e magias 100% personalizáveis (botão "Usar"/"Lançar" desconta PM)
- Ataques com rolagem de ataque, dano e crítico; rolagem de perícias com um clique
- Assistente de "Subir de nível"
- Inventário com carga e dinheiro (T$), história e anotações, foto e cor da ficha
- Salva automaticamente no navegador; exporte/importe a ficha em `.json`

## Rodando

```bash
npm install
npm run dev
```

## Contas e nuvem (Supabase)

Sem configuração, o app funciona só no navegador. Para login e fichas na nuvem:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **SQL Editor**, rode o arquivo [`supabase/schema.sql`](supabase/schema.sql) (cria a tabela de fichas, o bucket de retratos e as regras de acesso).
3. Em **Authentication → URL Configuration**, coloque em *Site URL* o endereço do app (ex.: `https://grimorio-rubro.vercel.app`) e adicione `http://localhost:5173` em *Redirect URLs*.
4. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings → API).

O login é por link no e-mail. O e-mail padrão do Supabase tem limite baixo de envios por hora; para um grupo maior, configure um SMTP próprio (Authentication → Emails) ou ative Google/Discord e use `VITE_AUTH_PROVIDERS`.

## Publicando

Na Vercel: importe o repositório (framework **Vite**, build `npm run build`, saída `dist`) e cadastre as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em *Settings → Environment Variables*.
