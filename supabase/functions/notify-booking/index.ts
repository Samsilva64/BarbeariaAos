// @ts-nocheck
// Avisa por WhatsApp, sozinha, assim que um cliente conclui a marcação.
// A mensagem vai para o GERENTE do salão que o cliente escolheu (número definido no painel, em "Gerentes dos salões");
// se esse número não estiver preenchido, vai para o número da barbearia. O gerente avisa depois o barbeiro:
// o salão e o nome do barbeiro escolhido vêm escritos na mensagem.
// O site só envia o "id" da marcação; tudo o resto (barbeiro, número, mensagem) vem da base de dados,
// por isso ninguém consegue usar esta função para mandar mensagens à vontade.
//
// Segredos (Edge Functions > Secrets) — escolhe UM dos dois modos:
//
//  A) CallMeBot (grátis, mais simples; quem gere o WhatsApp da barbearia ativa o número uma vez em callmebot.com):
//       CALLMEBOT_KEYS = {"245955115048":"APIKEY_DA_BARBEARIA"}
//
//  B) WhatsApp Cloud API da Meta (oficial; precisa de conta Business e de um modelo de mensagem aprovado):
//       WHATSAPP_PROVIDER = cloud
//       WA_TOKEN, WA_PHONE_ID, WA_TEMPLATE (modelo com UMA variável {{1}}), WA_LANG (por defeito pt_PT)
//
// Opcional: SHOP_NAME (por defeito "BarberShop AOS")
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem sozinhos dentro da função.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
// .trim() tira espaços e quebras de linha que às vezes vêm colados junto com o segredo
const env = (k, d = '') => String((typeof Deno !== 'undefined' && Deno.env.get(k)) || d).trim();
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SB = () => env('SUPABASE_URL').replace(/\/+$/, '');
const KEY = () => env('SUPABASE_SERVICE_ROLE_KEY');
const sbHeaders = (extra = {}) => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, ...extra });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// número só com dígitos e indicativo da Guiné-Bissau (245) se faltar
export const destino = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d && d.length <= 9) d = `245${d}`;
  return d;
};

// "2026-10-20T14:30:00" -> { dia: "20/10/2026", hora: "14:30" }
export const quando = (iso) => {
  const [d, t] = String(iso).split('T');
  const [y, m, dd] = d.split('-');
  return { dia: `${dd}/${m}/${y}`, hora: (t || '').slice(0, 5) };
};

const SALOES = { lago: 'Salão de Mbatonha', mercado: 'Salão de Feira de Praça' };

export function texto(b, nomePro) {
  const q = quando(b.starts_at);
  return [
    `✂️ Nova marcação — ${env('SHOP_NAME', 'BarberShop AOS')}`,
    b.salon ? `Salão: ${SALOES[b.salon] || b.salon}` : null,
    `Serviço: ${b.service}`,
    nomePro ? `Profissional: ${nomePro}` : null,
    `Dia: ${q.dia}`,
    `Hora: ${q.hora}`,
    `Cliente: ${b.name}`,
    `Telefone: ${b.phone}`,
    b.payment ? `Pagamento: ${b.payment}` : null,
  ].filter(Boolean).join('\n');
}

async function enviar(to, msg) {
  if (env('WHATSAPP_PROVIDER', 'callmebot').toLowerCase() === 'cloud') {
    if (!env('WA_TOKEN') || !env('WA_PHONE_ID')) {
      throw new Error('WhatsApp Cloud: configura WA_TOKEN e WA_PHONE_ID nos Secrets do Supabase.');
    }
    const modelo = env('WA_TEMPLATE');
    if (!modelo) {
      throw new Error('WhatsApp Cloud: configura WA_TEMPLATE com o nome do modelo aprovado pela Meta.');
    }
    const corpo = {
      messaging_product: 'whatsapp', to, type: 'template',
      template: {
        name: modelo, language: { code: env('WA_LANG', 'pt_PT') },
        components: [{ type: 'body', parameters: [{ type: 'text', text: msg.replace(/\s*\n\s*/g, ' | ') }] }],
      },
    };
    console.log(`notify-booking: a enviar por WhatsApp Cloud para ${to} | modelo=${modelo} | idioma=${env('WA_LANG', 'pt_PT')} | token com ${env('WA_TOKEN').length} caracteres`);
    const r = await fetch(`https://graph.facebook.com/v21.0/${env('WA_PHONE_ID')}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('WA_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    if (!r.ok) {
      let detalhe = '';
      try {
        const resposta = await r.json();
        const erro = resposta.error;
        if (erro) {
          detalhe = erro.code ? `Meta ${erro.code}: ` : '';
          detalhe += erro.error_user_msg || erro.message || '';
        }
      } catch {
        // A resposta da Meta pode não estar em JSON.
      }
      throw new Error(`WhatsApp Cloud HTTP ${r.status}${detalhe ? ` — ${detalhe}` : ''}`);
    }
    return;
  }
  // CallMeBot
  let chaves = {};
  try { chaves = JSON.parse(env('CALLMEBOT_KEYS', '{}')); } catch (_) { /* segredo mal escrito */ }
  const apikey = chaves[to];
  if (!apikey) throw new Error('CallMeBot: este número ainda não tem apikey em CALLMEBOT_KEYS');
  const r = await fetch(
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(`+${to}`)}&text=${encodeURIComponent(msg)}&apikey=${encodeURIComponent(apikey)}`,
  );
  const t = await r.text();
  if (!r.ok || /error/i.test(t)) throw new Error(`CallMeBot: ${t.replace(/<[^>]+>/g, ' ').trim().slice(0, 120) || `HTTP ${r.status}`}`);
}

export async function notificar(id) {
  if (!UUID.test(String(id))) return { ok: false, motivo: 'id inválido' };
  const g = await fetch(`${SB()}/rest/v1/bookings?id=eq.${id}&select=*`, { headers: sbHeaders() });
  const b = (g.ok && (await g.json())[0]) || null;
  if (!b) return { ok: false, motivo: 'marcação não encontrada' };
  if (b.notified_at) return { ok: true, jaEnviada: true };
  if (b.status !== 'pendente' || Date.now() - new Date(b.created_at).getTime() > 15 * 60e3) {
    return { ok: false, motivo: 'marcação antiga ou já tratada' };
  }

  // reserva a marcação (só um envio por marcação, mesmo que a função seja chamada duas vezes)
  const claim = await fetch(`${SB()}/rest/v1/bookings?id=eq.${id}&notified_at=is.null`, {
    method: 'PATCH',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({ notified_at: new Date().toISOString() }),
  });
  if (!claim.ok) return { ok: false, motivo: 'falta correr o notify-booking.sql (coluna notified_at)' };
  const reservada = await claim.json();
  if (!reservada.length) return { ok: true, jaEnviada: true };

  try {
    const s = await fetch(`${SB()}/rest/v1/settings?select=phone,team,salon_phones&id=eq.1`, { headers: sbHeaders() });
    const cfg = (s.ok && (await s.json())[0]) || {};
    const barbeiro = (cfg.team || []).find((t) => t.id === b.professional);
    // gerente do salão escolhido; se faltar, o número da barbearia (nunca o do barbeiro)
    const to = destino((cfg.salon_phones && cfg.salon_phones[b.salon]) || cfg.phone);
    if (!to) throw new Error('sem número de destino');
    await enviar(to, texto(b, barbeiro && barbeiro.name));
    return { ok: true };
  } catch (e) {
    // não conseguiu enviar: devolve a marcação ao estado "por avisar"
    console.log(`notify-booking FALHOU (marcação ${id}): ${String(e && e.message)}`);
    await fetch(`${SB()}/rest/v1/bookings?id=eq.${id}`, {
      method: 'PATCH',
      headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({ notified_at: null }),
    });
    return { ok: false, motivo: String(e && e.message) };
  }
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    try {
      const { id } = await req.json();
      const r = await notificar(id);
      return json(r, r.ok ? 200 : 502);
    } catch (e) {
      return json({ ok: false, motivo: String(e && e.message) }, 500);
    }
  });
}
