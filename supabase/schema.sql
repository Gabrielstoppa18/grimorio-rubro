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
