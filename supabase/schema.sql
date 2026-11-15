-- =========================================================
-- Grimório Rubro — banco de dados (Supabase)
-- Rode este arquivo inteiro em: Supabase → SQL Editor → New query → Run
-- Pode rodar de novo sem problema (é idempotente).
-- =========================================================

-- ---------- Fichas ----------
create table if not exists public.characters (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null default '',
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists characters_owner_idx on public.characters (owner_id);

alter table public.characters enable row level security;

-- Cada pessoa só enxerga e altera as próprias fichas.
drop policy if exists "fichas: ler as minhas" on public.characters;
create policy "fichas: ler as minhas" on public.characters
  for select using (owner_id = auth.uid());

drop policy if exists "fichas: criar as minhas" on public.characters;
create policy "fichas: criar as minhas" on public.characters
  for insert with check (owner_id = auth.uid());

drop policy if exists "fichas: editar as minhas" on public.characters;
create policy "fichas: editar as minhas" on public.characters
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "fichas: apagar as minhas" on public.characters;
create policy "fichas: apagar as minhas" on public.characters
  for delete using (owner_id = auth.uid());

-- ---------- Retratos (fotos dos personagens) ----------
-- Bucket público para leitura; cada pessoa só grava na própria pasta (<id do usuário>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('retratos', 'retratos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Necessária para apagar/substituir arquivos (o Storage confere a linha antes de remover).
drop policy if exists "retratos: ver a minha pasta" on storage.objects;
create policy "retratos: ver a minha pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'retratos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "retratos: enviar na minha pasta" on storage.objects;
create policy "retratos: enviar na minha pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'retratos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "retratos: trocar na minha pasta" on storage.objects;
create policy "retratos: trocar na minha pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'retratos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "retratos: apagar da minha pasta" on storage.objects;
create policy "retratos: apagar da minha pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'retratos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- Mesas do mestre
-- O mestre cria uma mesa e compartilha um código/link de convite.
-- Cada jogador vincula a própria ficha; o mestre e os colegas de mesa
-- passam a enxergar essa ficha (só leitura). Só o dono edita.
-- =========================================================

create or replace function public.gerar_codigo_convite() returns text
language sql volatile set search_path = public as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 8)
$$;

create table if not exists public.mesas (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null default '',
  gm_name      text not null default '',
  description  text not null default '',
  invite_code  text not null unique default public.gerar_codigo_convite(),
  created_at   timestamptz not null default now()
);

create index if not exists mesas_owner_idx on public.mesas (owner_id);

create table if not exists public.mesa_fichas (
  mesa_id       uuid not null references public.mesas (id) on delete cascade,
  character_id  text not null references public.characters (id) on delete cascade,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  joined_at     timestamptz not null default now(),
  primary key (mesa_id, character_id)
);

create index if not exists mesa_fichas_owner_idx on public.mesa_fichas (owner_id);
create index if not exists mesa_fichas_character_idx on public.mesa_fichas (character_id);

alter table public.mesas enable row level security;
alter table public.mesa_fichas enable row level security;

-- Funções auxiliares (security definer evita recursão entre as políticas).
create or replace function public.sou_mestre_da_mesa(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mesas where id = m and owner_id = auth.uid())
$$;

create or replace function public.jogo_na_mesa(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mesa_fichas where mesa_id = m and owner_id = auth.uid())
$$;

create or replace function public.posso_ver_ficha(ficha text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from mesa_fichas f
    join mesas t on t.id = f.mesa_id
    where f.character_id = ficha
      and (t.owner_id = auth.uid()
           or exists (select 1 from mesa_fichas g where g.mesa_id = f.mesa_id and g.owner_id = auth.uid()))
  )
$$;

-- Mesas: o mestre faz tudo; quem joga na mesa só lê.
drop policy if exists "mesas: ver" on public.mesas;
create policy "mesas: ver" on public.mesas
  for select using (owner_id = auth.uid() or public.jogo_na_mesa(id));

drop policy if exists "mesas: criar" on public.mesas;
create policy "mesas: criar" on public.mesas
  for insert with check (owner_id = auth.uid());

drop policy if exists "mesas: editar" on public.mesas;
create policy "mesas: editar" on public.mesas
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "mesas: apagar" on public.mesas;
create policy "mesas: apagar" on public.mesas
  for delete using (owner_id = auth.uid());

-- Vínculos ficha↔mesa: entrar só pelo convite (função abaixo);
-- o jogador pode sair e o mestre pode remover.
drop policy if exists "vinculos: ver" on public.mesa_fichas;
create policy "vinculos: ver" on public.mesa_fichas
  for select using (public.sou_mestre_da_mesa(mesa_id) or public.jogo_na_mesa(mesa_id));

drop policy if exists "vinculos: sair ou remover" on public.mesa_fichas;
create policy "vinculos: sair ou remover" on public.mesa_fichas
  for delete using (owner_id = auth.uid() or public.sou_mestre_da_mesa(mesa_id));

-- Fichas: além das próprias, cada um enxerga as fichas das mesas em que está.
drop policy if exists "fichas: ver as da minha mesa" on public.characters;
create policy "fichas: ver as da minha mesa" on public.characters
  for select using (public.posso_ver_ficha(id));

-- Ver os dados públicos de uma mesa a partir do código (tela de convite).
create or replace function public.mesa_por_convite(codigo text)
returns table (id uuid, name text, gm_name text, description text, jogadores int, sou_mestre boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.gm_name, t.description,
         (select count(*)::int from mesa_fichas f where f.mesa_id = t.id),
         t.owner_id = auth.uid()
  from mesas t
  where t.invite_code = upper(trim(codigo)) and auth.uid() is not null
$$;

-- Vincular uma ficha própria a uma mesa usando o código de convite.
create or replace function public.entrar_na_mesa(codigo text, ficha text) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  m uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso entrar na conta.';
  end if;
  select t.id into m from mesas t where t.invite_code = upper(trim(codigo));
  if m is null then
    raise exception 'Convite inválido ou expirado.';
  end if;
  if not exists (select 1 from characters c where c.id = ficha and c.owner_id = auth.uid()) then
    raise exception 'Essa ficha não é sua.';
  end if;
  insert into mesa_fichas (mesa_id, character_id, owner_id)
  values (m, ficha, auth.uid())
  on conflict (mesa_id, character_id) do nothing;
  return m;
end
$$;

-- Trocar o código (o link antigo para de funcionar).
create or replace function public.renovar_convite(m uuid) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  novo text;
begin
  update mesas set invite_code = gerar_codigo_convite()
  where id = m and owner_id = auth.uid()
  returning invite_code into novo;
  if novo is null then
    raise exception 'Só o mestre pode trocar o convite.';
  end if;
  return novo;
end
$$;

revoke execute on function public.mesa_por_convite(text) from public, anon;
revoke execute on function public.entrar_na_mesa(text, text) from public, anon;
revoke execute on function public.renovar_convite(uuid) from public, anon;
grant execute on function public.mesa_por_convite(text) to authenticated;
grant execute on function public.entrar_na_mesa(text, text) to authenticated;
grant execute on function public.renovar_convite(uuid) to authenticated;

-- Atualização ao vivo na tela do mestre (PV, PM, condições…).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'characters') then
    alter publication supabase_realtime add table public.characters;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mesa_fichas') then
    alter publication supabase_realtime add table public.mesa_fichas;
  end if;
end
$$;
