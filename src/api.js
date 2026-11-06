import { supabase } from './supabase';
import { addDays, iso, shrinkImage } from './utils';

const off = { data: null, error: { code: 'offline' } };

// ---------- público ----------
export async function fetchSettings() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  return error ? null : data;
}

// Intervalos ocupados de um dia (todos os profissionais), sem dados pessoais
export async function fetchBusy(day) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('busy_slots')
    .select('professional,starts_at,ends_at')
    .gte('starts_at', `${day}T00:00:00`)
    .lt('starts_at', `${addDays(day, 1)}T00:00:00`);
  return error ? [] : data;
}

export async function createBooking(b) {
  if (!supabase) return off;
  const { error } = await supabase.from('bookings').insert(b);
  return { error };
}

// Pede à função "notify-booking" para avisar o barbeiro por WhatsApp.
export async function notifyBooking(id) {
  if (!supabase) return { ok: false, motivo: 'Supabase não está configurado neste site.' };
  try {
    const r = await Promise.race([
      supabase.functions.invoke('notify-booking', { body: { id } }),
      new Promise((res) => setTimeout(() => res({ error: { message: 'A função notify-booking demorou mais de 15 segundos.' } }), 15000)),
    ]);
    if (r.error) {
      let motivo = r.error.message || 'Não foi possível contactar a função notify-booking.';
      if (r.error.context && typeof r.error.context.json === 'function') {
        try {
          const detalhe = await r.error.context.json();
          motivo = detalhe.motivo || motivo;
        } catch {
          // A resposta pode não ter um corpo JSON.
        }
      }
      return { ok: false, motivo };
    }
    return { ok: Boolean(r.data && r.data.ok), motivo: r.data && r.data.motivo };
  } catch (e) {
    return { ok: false, motivo: e.message || 'Falha de rede ao contactar notify-booking.' };
  }
}

// ---------- administrador ----------
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuth(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export const signIn = (email, password) =>
  supabase ? supabase.auth.signInWithPassword({ email, password }) : Promise.resolve(off);

export const signOut = () => (supabase ? supabase.auth.signOut() : Promise.resolve());

export async function listBookings() {
  if (!supabase) return off;
  return supabase
    .from('bookings')
    .select('*')
    .gte('ends_at', `${iso(new Date())}T00:00:00`)
    .order('starts_at');
}

export const setStatus = (id, status) =>
  supabase ? supabase.from('bookings').update({ status }).eq('id', id) : Promise.resolve(off);

export const blockSlot = (professional, starts_at, ends_at) =>
  supabase
    ? supabase.from('bookings').insert({
        service: 'Bloqueado', professional, starts_at, ends_at, name: 'Bloqueado', phone: '-', status: 'bloqueado',
      })
    : Promise.resolve(off);

export const removeBooking = (id) =>
  supabase ? supabase.from('bookings').delete().eq('id', id) : Promise.resolve(off);

export const saveSettings = (s) =>
  supabase ? supabase.from('settings').update(s).eq('id', 1) : Promise.resolve(off);

// ---------- fotos (Supabase Storage, pasta "hero": slide, galeria e barbeiros) ----------
export async function uploadImage(file, prefix = 'slide', opts = {}) {
  if (!supabase) return { error: { message: 'offline' } };
  try {
    const blob = await shrinkImage(file, opts.max || 1600, Boolean(opts.square));
    const path = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await supabase.storage.from('hero').upload(path, blob, {
      contentType: 'image/jpeg', cacheControl: '31536000',
    });
    if (error) return { error };
    return { url: supabase.storage.from('hero').getPublicUrl(path).data.publicUrl };
  } catch (e) {
    return { error: { message: e.message } };
  }
}

export function removeFile(url) {
  const path = String(url).split('/hero/')[1];
  return supabase && path ? supabase.storage.from('hero').remove([decodeURIComponent(path)]) : Promise.resolve();
}
