-- Aviso automático ao barbeiro: corre isto UMA vez no Supabase > SQL Editor (Run).
-- (Depois cria a função "notify-booking" em Edge Functions: ver README.)
alter table public.bookings add column if not exists notified_at timestamptz;
