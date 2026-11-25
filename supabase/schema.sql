-- =====================================================================
-- Bloc City : comptes, amis, classement et sauvegarde dans le cloud
-- À coller une fois dans Supabase > SQL Editor > New query > Run.
-- Le script peut être relancé sans risque (il ne supprime aucune donnée).
-- =====================================================================

-- Profil public d'un joueur (visible par lui-même et par ses amis)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (char_length(trim(pseudo)) between 2 and 20),
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  -- chiffres du classement, calculés par l'app : semaine, mois, objectif, série
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Amitiés, enregistrées dans les deux sens
create table if not exists public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- Sauvegarde complète (séances, réglages, ville) : privée
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Copie de la ville, pour que les amis puissent la visiter
create table if not exists public.cities (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  city jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.user_data enable row level security;
alter table public.cities enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select on public.friendships to authenticated;
grant select, insert, update, delete on public.user_data to authenticated;
grant select, insert, update on public.cities to authenticated;

-- Est-ce que « other » est un ami de l'utilisateur connecté ?
create or replace function public.is_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.friendships where user_id = auth.uid() and friend_id = other)
$$;

-- Règles d'accès ---------------------------------------------------------
drop policy if exists "profil : moi et mes amis" on public.profiles;
create policy "profil : moi et mes amis" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_friend(id));
drop policy if exists "profil : création" on public.profiles;
create policy "profil : création" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profil : modification" on public.profiles;
create policy "profil : modification" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "amis : les miens" on public.friendships;
create policy "amis : les miens" on public.friendships
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "sauvegarde : la mienne" on public.user_data;
create policy "sauvegarde : la mienne" on public.user_data
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ville : moi et mes amis" on public.cities;
create policy "ville : moi et mes amis" on public.cities
  for select to authenticated using (user_id = auth.uid() or public.is_friend(user_id));
drop policy if exists "ville : création" on public.cities;
create policy "ville : création" on public.cities
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "ville : modification" on public.cities;
create policy "ville : modification" on public.cities
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ajouter un ami avec son code (les deux deviennent amis) -----------------
create or replace function public.add_friend(code text)
returns table (id uuid, pseudo text)
language plpgsql
security definer
set search_path = public
as $$
declare
  other uuid;
  other_pseudo text;
begin
  if auth.uid() is null then
    raise exception 'non_connecte';
  end if;
  select p.id, p.pseudo into other, other_pseudo from public.profiles p where p.friend_code = upper(trim(code));
  if other is null then
    raise exception 'code_inconnu';
  end if;
  if other = auth.uid() then
    raise exception 'soi_meme';
  end if;
  insert into public.friendships (user_id, friend_id)
  values (auth.uid(), other), (other, auth.uid())
  on conflict do nothing;
  return query select other, other_pseudo;
end
$$;

-- Retirer un ami (dans les deux sens)
create or replace function public.remove_friend(other uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friendships
  where (user_id = auth.uid() and friend_id = other) or (user_id = other and friend_id = auth.uid())
$$;

revoke execute on function public.add_friend(text) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.is_friend(uuid) from public, anon;
grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.is_friend(uuid) to authenticated;

-- =====================================================================
-- Séances visibles par les amis (calendrier et statistiques)
-- Copie allégée envoyée par l'app : sans les notes personnelles.
-- =====================================================================
create table if not exists public.shared_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sessions jsonb not null default '[]'::jsonb,
  weekly_goal int not null default 3,
  updated_at timestamptz not null default now()
);

alter table public.shared_sessions enable row level security;
grant select, insert, update on public.shared_sessions to authenticated;

drop policy if exists "séances : moi et mes amis" on public.shared_sessions;
create policy "séances : moi et mes amis" on public.shared_sessions
  for select to authenticated using (user_id = auth.uid() or public.is_friend(user_id));
drop policy if exists "séances : création" on public.shared_sessions;
create policy "séances : création" on public.shared_sessions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "séances : modification" on public.shared_sessions;
create policy "séances : modification" on public.shared_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
