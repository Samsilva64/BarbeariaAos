-- Desliga a integração com o TikTok e o Instagram. Corre UMA vez no Supabase > SQL Editor (Run).
-- Pode ser corrido outra vez sem estragar nada.

-- 1) para a atualização automática de 30 em 30 minutos (se ela existir)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'sync-social';
  end if;
end $$;

-- 2) apaga os tokens de acesso ao TikTok e ao Instagram guardados na base de dados
drop table if exists public.social_tokens;

-- 3) limpa os números, posts e vídeos que a integração tinha guardado (o site já não os lê)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'settings' and column_name = 'social_stats') then
    update public.settings set social_stats = '{}'::jsonb, social_images = '[]'::jsonb where id = 1;
  end if;
end $$;
