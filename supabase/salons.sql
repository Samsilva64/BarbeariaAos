-- Dois salões, cada um com o seu gerente e os seus barbeiros.
-- Corre isto UMA vez no Supabase > SQL Editor (Run). Pode ser corrido outra vez sem estragar nada.

-- números de WhatsApp dos gerentes: {"lago":"245955115048","mercado":"245966000000"} (preenche-se no painel admin)
alter table public.settings add column if not exists salon_phones jsonb not null default '{}';

-- em que salão foi feita cada marcação
alter table public.bookings add column if not exists salon text check (salon in ('lago','mercado'));
