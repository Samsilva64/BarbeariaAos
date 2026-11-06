import { createClient } from '@supabase/supabase-js';

// Limpa o endereço: tira espaços, a barra final e o "/rest/v1" que aparece na página Data API do Supabase.
const url = (import.meta.env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Sem as variáveis no .env, o site funciona em "modo simples" (marcação só por WhatsApp).
export const supabase = url && key ? createClient(url, key) : null;
export const online = Boolean(supabase);
