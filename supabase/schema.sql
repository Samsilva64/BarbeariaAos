-- BarberShop AOS: base de dados das marcações e das definições.
-- Cola tudo no Supabase > SQL Editor e toca em Run.
-- ANTES de correr: troca 'EMAIL_DO_ADMIN@exemplo.com' pelo email do administrador.
--
-- Se já correste uma versão anterior deste ficheiro, apaga primeiro as tabelas antigas:
--   drop view if exists public.taken_slots, public.busy_slots;
--   drop table if exists public.bookings, public.settings, public.admins cascade;

create extension if not exists btree_gist;

-- 1) Definições do site (uma única linha)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  phone text not null default '245955115048',
  open_hour int not null default 9,
  close_hour int not null default 19,
  currency text not null default 'FCFA',
  hero_images jsonb not null default '[]',
  gallery_images jsonb not null default '[]',
  team jsonb not null default '[]',
  salon_phones jsonb not null default '{}',
  services jsonb not null default '[{"n":"Corte","p":2500,"d":30,"c":"Cabelo"},{"n":"Corte liso","p":3000,"d":45,"c":"Cabelo"},{"n":"Tratamento de Waves","p":3000,"d":30,"c":"Cabelo"},{"n":"Alinhar contornos (zona comum)","p":1500,"d":15,"c":"Cabelo"},{"n":"Barba","p":1500,"d":30,"c":"Cabelo"},{"n":"Caracóis","p":1500,"d":30,"c":"Cabelo"},{"n":"Afro","p":5000,"d":60,"c":"Cabelo"},{"n":"Contornos com aerógrafo","p":500,"d":15,"c":"Pintura","g":"Aerógrafo"},{"n":"Cabelo de barba em preto","p":1000,"d":30,"c":"Pintura","g":"Preto"},{"n":"Cabelo a Pente 1 em preto","p":1000,"d":30,"c":"Pintura","g":"Preto"},{"n":"Cabelo até Pente 4 em preto","p":2000,"d":45,"c":"Pintura","g":"Preto"},{"n":"Cabelo superior a Pente 4 em preto","p":3000,"d":60,"c":"Pintura","g":"Preto","mais":true},{"n":"Cabelo a Pente 1 em amarelo queimado","p":4000,"d":60,"c":"Pintura","g":"Amarelo queimado"},{"n":"Cabelo até Pente 4 em amarelo queimado","p":6000,"d":90,"c":"Pintura","g":"Amarelo queimado"},{"n":"Cabelo superior a Pente 4 em amarelo queimado","p":7500,"d":120,"c":"Pintura","g":"Amarelo queimado","mais":true},{"n":"Cabelo a Pente 1 a branco","p":5000,"d":60,"c":"Pintura","g":"Branco"},{"n":"Cabelo até Pente 4 a branco","p":7000,"d":90,"c":"Pintura","g":"Branco"},{"n":"Cabelo superior a Pente 4 a branco","p":10000,"d":120,"c":"Pintura","g":"Branco","mais":true},{"n":"Cabelo a Pente 1 em outras cores disponíveis","p":7500,"d":60,"c":"Pintura","g":"Outras cores"},{"n":"Cabelo até Pente 4 em outras cores disponíveis","p":10000,"d":90,"c":"Pintura","g":"Outras cores"},{"n":"Cabelo superior a Pente 4 em outras cores disponíveis","p":12000,"d":120,"c":"Pintura","g":"Outras cores","mais":true},{"n":"Em Bissau, até à zona antes do Aeroporto","p":7500,"d":60,"c":"Domicílio","dom":true},{"n":"Entre Quelelé e Gardete","p":10000,"d":60,"c":"Domicílio","dom":true},{"n":"Entre o Aeroporto e Safim/Bissalanca","p":10000,"d":60,"c":"Domicílio","mais":true,"dom":true}]'
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- 2) Marcações (hora local de Bissau, que é igual à hora UTC)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service text not null,
  professional text not null default 'geral',
  starts_at timestamp not null,
  ends_at timestamp not null,
  name text not null,
  phone text not null,
  email text,
  price numeric,
  payment text,
  notified_at timestamptz,
  salon text check (salon in ('lago','mercado')),
  status text not null default 'pendente'
    check (status in ('pendente','confirmada','cancelada','bloqueado')),
  check (ends_at > starts_at),
  -- Impede duas marcações sobrepostas para o mesmo profissional (as canceladas libertam a hora)
  constraint bookings_no_overlap
    exclude using gist (professional with =, tsrange(starts_at, ends_at) with &&)
    where (status <> 'cancelada')
);

-- 3) Quem é administrador
create table if not exists public.admins (email text primary key);
insert into public.admins (email) values ('EMAIL_DO_ADMIN@exemplo.com') on conflict do nothing;
alter table public.admins enable row level security; -- sem políticas: ninguém lê pela API

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;

-- 4) Horas ocupadas, sem mostrar nomes nem telefones
create or replace view public.busy_slots as
  select professional, starts_at, ends_at
  from public.bookings
  where status <> 'cancelada' and ends_at > (now() at time zone 'utc') - interval '1 day';
grant select on public.busy_slots to anon, authenticated;

-- 5) Regras de acesso (Row Level Security)
alter table public.settings enable row level security;
alter table public.bookings enable row level security;

create policy "settings: todos leem" on public.settings
  for select using (true);
create policy "settings: admin altera" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "bookings: clientes criam" on public.bookings
  for insert to anon, authenticated
  with check (
    status = 'pendente'
    and starts_at > (now() at time zone 'utc') - interval '5 minutes'
    and ends_at - starts_at <= interval '8 hours'
    and length(name) between 1 and 80
    and length(phone) between 5 and 30
    and length(service) <= 300
    and (email is null or length(email) <= 120)
  );
create policy "bookings: admin cria" on public.bookings
  for insert to authenticated with check (public.is_admin());
create policy "bookings: admin le" on public.bookings
  for select to authenticated using (public.is_admin());
create policy "bookings: admin altera" on public.bookings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "bookings: admin apaga" on public.bookings
  for delete to authenticated using (public.is_admin());

-- 6) Permissões da Data API (as regras acima, em Row Level Security, continuam a mandar)
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
grant insert on public.bookings to anon, authenticated;
grant select, update, delete on public.bookings to authenticated;

-- 7) Slide da página inicial (fotos): corre também o ficheiro update-slide.sql
