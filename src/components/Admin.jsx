import { useCallback, useEffect, useState } from 'react';
import { online } from '../supabase';
import {
  getSession, onAuth, signIn, signOut, listBookings, setStatus,
  blockSlot, removeBooking, saveSettings, uploadImage, removeFile,
} from '../api';
import { iso, waLink, fmtDay, fmtDur, fmtMoney, hm, toMin, normPhone } from '../utils';
import { listSalons, salonName, salonHours } from '../salons';
import { CATEGORIAS } from '../servicos';

// Painel de administração  ->  abre em  /#/admin
// Entrada com email e senha (Supabase Auth). Só os emails da tabela "admins" têm acesso.
export default function Admin({ cfg, reload }) {
  const [session, setSession] = useState(undefined); // undefined = a carregar

  useEffect(() => {
    getSession().then(setSession);
    return onAuth(setSession);
  }, []);

  const voltar = () => { window.location.hash = ''; };

  if (!online) {
    return (
      <section style={{ minHeight: '100vh' }}>
        <div className="wrap">
          <h2>Administração</h2>
          <p className="lead">
            O servidor ainda não está ligado. Segue o passo a passo do README (secção Supabase) e preenche o ficheiro .env.
          </p>
          <button type="button" className="btn alt" onClick={voltar}>Voltar ao site</button>
        </div>
      </section>
    );
  }
  if (session === undefined) return <section style={{ minHeight: '100vh' }}><div className="wrap"><p>A carregar...</p></div></section>;
  if (!session) return <Login onBack={voltar} />;
  return <Painel cfg={cfg} reload={reload} onBack={voltar} />;
}

// Mensagens do Supabase explicadas em português, para saber o que corrigir
const MENSAGENS = [
  ['Invalid login credentials', 'Email ou senha errados.'],
  ['Email not confirmed', 'O email ainda não foi confirmado. No Supabase, em Authentication > Users, confirma este usuário.'],
  ['Invalid API key', 'A chave do Supabase no .env está errada.'],
  ['Failed to fetch', 'Sem ligação ao Supabase. Confere o VITE_SUPABASE_URL no .env.'],
];

function Login({ onBack }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  const entrar = async (e) => {
    e.preventDefault();
    const { error } = await signIn(email.trim(), pw);
    if (!error) { setMsg(''); return; }
    const m = String(error.message || '');
    const conhecida = MENSAGENS.find(([k]) => m.includes(k));
    setMsg(conhecida ? conhecida[1] : `Erro: ${m || error.code}`);
  };

  return (
    <section style={{ minHeight: '100vh' }}>
      <div className="wrap">
        <h2>Administração</h2>
        <form className="book" onSubmit={entrar}>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
          <label>Senha<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
          <button type="submit" className="btn">Entrar</button>
          <small style={{ color: 'var(--gold)' }}>{msg}</small>
          <button type="button" className="btn alt" onClick={onBack}>Voltar ao site</button>
        </form>
      </div>
    </section>
  );
}

const DURACOES = [15, 30, 45, 60, 90, 120];

function Painel({ cfg, reload, onBack }) {
  const team = cfg.team || [];
  const recursos = team.length ? team : [{ id: 'geral', name: 'Geral' }];
  const nomeDe = (id) => recursos.find((t) => t.id === id)?.name || id;

  const [rows, setRows] = useState([]);
  const [day, setDay] = useState(iso(new Date()));
  const [pid, setPid] = useState(recursos[0].id);
  const [msg, setMsg] = useState('');
  const [fotoMsg, setFotoMsg] = useState({});
  const [fotoBusy, setFotoBusy] = useState(false);
  const [galKind, setGalKind] = useState('corte');
  const [draft, setDraft] = useState(() => ({
    phone: cfg.phone, open: cfg.open, close: cfg.close, currency: cfg.currency,
    salon_phones: { ...(cfg.salon_phones || {}) },
    team: team.map((t) => ({ ...t })),
    services: cfg.services.map((s) => ({ ...s })),
  }));

  const load = useCallback(async () => {
    const { data } = await listBookings();
    setRows(data || []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const agir = async (promessa) => { await promessa; await load(); };

  const marcacoes = rows.filter((r) => r.status !== 'bloqueado');
  const doDia = rows.filter((r) => r.professional === pid && r.status !== 'cancelada' && r.starts_at.slice(0, 10) === day);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setService = (i, patch) => set({ services: draft.services.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setMember = (i, patch) => set({ team: draft.team.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const guardar = async () => {
    const phone = String(draft.phone).replace(/\D/g, '');
    const open = Number(draft.open);
    const close = Number(draft.close);
    if (phone.length < 8 || !(open >= 0 && close > open && close <= 24)) {
      setMsg('Confere o número e as horas.');
      return;
    }
    const services = draft.services
      .filter((s) => s.n.trim())
      .map((s) => ({
        n: s.n.trim(), p: s.p === '' || s.p === null ? null : Number(s.p), d: Number(s.d) || 30, img: s.img || '',
        // categoria, grupo, "ou mais" e domicílio têm de ficar guardados com o serviço
        ...(s.c ? { c: s.c } : {}), ...(s.g ? { g: s.g } : {}), ...(s.mais ? { mais: true } : {}), ...(s.dom ? { dom: true } : {}),
      }));
    const equipa = draft.team.filter((t) => t.name.trim()).map((t) => ({
      id: t.id, name: t.name.trim(), phone: normPhone(t.phone), photo: t.photo || '', salon: t.salon || '',
    }));
    const gerentes = {};
    for (const s of listSalons(cfg)) {
      const n = normPhone(draft.salon_phones[s.id] || '');
      if (n && String(n).replace(/\D/g, '').length < 8) { setMsg(`Confere o número do gerente: ${s.name}.`); return; }
      if (n) gerentes[s.id] = n;
    }
    const { error } = await saveSettings({
      phone, open_hour: open, close_hour: close, currency: draft.currency.trim() || 'FCFA', team: equipa, services, salon_phones: gerentes,
    });
    if (error) { setMsg('Não guardou. Confere se o teu email está na tabela admins.'); return; }
    await reload();
    setMsg('Guardado. O site já mostra as alterações a todos.');
  };

  const setMsgFoto = (campo, texto) => setFotoMsg((m) => ({ ...m, [campo]: texto }));

  // Envia várias fotos e guarda a lista em settings[campo]  (campo = hero_images ou gallery_images)
  const adicionarFotos = async (campo, e, criar) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const atuais = cfg[campo] || [];
    setFotoBusy(true);
    setMsgFoto(campo, `A enviar ${files.length} foto${files.length > 1 ? 's' : ''}...`);
    const novas = [];
    let falhou = '';
    for (const f of files) {
      const r = await uploadImage(f, campo === 'hero_images' ? 'slide' : 'galeria');
      if (r.url) novas.push(criar(r.url)); else falhou = r.error?.message || 'erro';
    }
    if (novas.length) {
      const { error } = await saveSettings({ [campo]: [...atuais, ...novas] });
      if (error) falhou = falhou || 'não guardou a lista';
      else await reload();
    }
    setFotoBusy(false);
    setMsgFoto(campo, falhou
      ? `Algumas fotos não subiram (${falhou}). Confere se o SQL "update-slide.sql" já foi corrido.`
      : 'Pronto. O site já mostra as fotos novas.');
  };

  const removerFoto = async (campo, item) => {
    if (!window.confirm('Remover esta foto?')) return;
    const url = typeof item === 'string' ? item : item.url;
    setFotoBusy(true);
    const resto = (cfg[campo] || []).filter((x) => (typeof x === 'string' ? x : x.url) !== url);
    const { error } = await saveSettings({ [campo]: resto });
    if (!error) { await removeFile(url); await reload(); setMsgFoto(campo, 'Foto removida.'); }
    else setMsgFoto(campo, 'Não removeu. Tenta de novo.');
    setFotoBusy(false);
  };

  const fotoBarbeiro = async (i, e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFotoBusy(true);
    setMsg('A enviar a foto...');
    const r = await uploadImage(f, 'barbeiro', { max: 600, square: true });
    setFotoBusy(false);
    if (r.url) {
      set({ team: draft.team.map((t, j) => (j === i ? { ...t, photo: r.url } : t)) });
      setMsg('Foto carregada. Toca em "Guardar definições" para publicar.');
    } else setMsg('A foto não subiu. Confere se o SQL "update-slide.sql" já foi corrido.');
  };

  const fotoServico = async (i, e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFotoBusy(true);
    setMsg('A enviar a foto do serviço...');
    const r = await uploadImage(f, 'servico', { max: 600, square: true });
    setFotoBusy(false);
    if (r.url) {
      setService(i, { img: r.url });
      setMsg('Foto carregada. Toca em \"Guardar definições\" para publicar.');
    } else setMsg('A foto não subiu. Confere se o SQL \"update-slide.sql\" já foi corrido.');
  };

  const hero = cfg.hero_images || [];
  const gal = (cfg.gallery_images || []).filter((g) => g && g.url);

  const horas = [];
  // até à hora de fecho mais tardia dos salões nesse dia (o Salão de Feira de Praça fecha às 22h às quartas, sextas e sábados)
  const fechoDia = Math.max(...listSalons(cfg).map((x) => salonHours(cfg, x.id, day).close));
  for (let m = Number(cfg.open) * 60; m + 30 <= fechoDia * 60; m += 30) horas.push(m);

  return (
    <section style={{ minHeight: '100vh' }}>
      <div className="wrap" id="ab">
        <h2>Painel de administração</h2>

        <h3>Marcações a partir de hoje</h3>
        {marcacoes.length === 0 && <p className="lead">Ainda não há marcações.</p>}
        {marcacoes.map((r) => (
          <div className="bk" key={r.id}>
            <div>
              <b>{fmtDay(r.starts_at.slice(0, 10))} · {hm(toMin(r.starts_at))}–{hm(toMin(r.ends_at))}</b>{' '}
              <span className={`tag ${r.status}`}>{r.status}</span>
              <small>
                {r.name} · {r.phone} · {r.service}
                {r.salon ? ` · ${salonName(cfg, r.salon)}` : ''}
                {team.length > 1 ? ` · ${nomeDe(r.professional)}` : ''}
                {r.price !== null && r.price !== undefined ? ` · ${fmtMoney(r.price, cfg.currency)}` : ''}
                {r.payment ? ` · ${r.payment}` : ''}
              </small>
            </div>
            <div className="acts">
              <a className="btn alt" href={waLink(String(r.phone).replace(/\D/g, ''))} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              {r.status === 'pendente' && (
                <button type="button" className="btn" onClick={() => agir(setStatus(r.id, 'confirmada'))}>Confirmar</button>
              )}
              {r.status !== 'cancelada' && (
                <button type="button" className="btn alt" onClick={() => agir(setStatus(r.id, 'cancelada'))}>Cancelar</button>
              )}
            </div>
          </div>
        ))}

        <h3>Bloquear horários</h3>
        <p className="lead">Para folgas ou clientes que marcaram na loja. Toca numa hora livre para a bloquear, e outra vez para libertar.</p>
        <div className="row">
          <label>Dia
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </label>
          {recursos.length > 1 && (
            <label>Profissional
              <select value={pid} onChange={(e) => setPid(e.target.value)}>
                {recursos.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="slots">
          {horas.map((m) => {
            const b = doDia.find((r) => toMin(r.starts_at) <= m && m < toMin(r.ends_at));
            const bloqueio = b && b.status === 'bloqueado' && toMin(b.starts_at) === m && toMin(b.ends_at) === m + 30;
            return (
              <button
                key={m}
                type="button"
                className={b ? 'on' : ''}
                disabled={Boolean(b) && !bloqueio}
                title={b && !bloqueio ? `Marcada: ${b.name}` : ''}
                onClick={() => agir(bloqueio
                  ? removeBooking(b.id)
                  : blockSlot(pid, `${day}T${hm(m)}:00`, `${day}T${hm(m + 30)}:00`))}
              >
                {hm(m)}
              </button>
            );
          })}
        </div>

        <h3>Fotos do slide da página inicial</h3>
        <p className="lead">
          {hero.length
            ? 'O fundo da página inicial mostra estas fotos, uma a uma.'
            : 'Adiciona aqui as fotos do slide da página inicial. Sem fotos, o site usa as fotos da galeria.'}
        </p>
        {hero.length > 0 && (
          <div className="thumbs">
            {hero.map((u) => (
              <div className="thumb" key={u}>
                <img src={u} alt="" />
                <button type="button" aria-label="Remover foto" disabled={fotoBusy} onClick={() => removerFoto('hero_images', u)}>×</button>
              </div>
            ))}
          </div>
        )}
        <p style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="btn" style={{ cursor: fotoBusy ? 'wait' : 'pointer', opacity: fotoBusy ? 0.6 : 1 }}>
            + Adicionar fotos
            <input type="file" accept="image/*" multiple hidden disabled={fotoBusy} onChange={(e) => adicionarFotos('hero_images', e, (u) => u)} />
          </label>
          <small style={{ color: 'var(--gold)' }}>{fotoMsg.hero_images}</small>
        </p>

        <h3>Fotos da galeria</h3>
        <p className="lead">
          {gal.length
            ? 'A galeria mostra estas fotos (e a foto de perfil de cada barbeiro).'
            : 'Ainda não adicionaste fotos: a galeria usa as fotos de origem. Ao adicionar a primeira, passa a mostrar só as tuas.'}
        </p>
        {gal.length > 0 && (
          <div className="thumbs">
            {gal.map((g) => (
              <div className="thumb" key={g.url}>
                <img src={g.url} alt="" />
                <i>{g.kind === 'barbeiro' ? 'Barbeiro' : 'Corte'}</i>
                <button type="button" aria-label="Remover foto" disabled={fotoBusy} onClick={() => removerFoto('gallery_images', g)}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="row">
          <label>Tipo das fotos a adicionar
            <select value={galKind} onChange={(e) => setGalKind(e.target.value)}>
              <option value="corte">Cortes</option>
              <option value="barbeiro">Barbeiros</option>
            </select>
          </label>
        </div>
        <p style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="btn" style={{ cursor: fotoBusy ? 'wait' : 'pointer', opacity: fotoBusy ? 0.6 : 1 }}>
            + Adicionar à galeria
            <input type="file" accept="image/*" multiple hidden disabled={fotoBusy} onChange={(e) => adicionarFotos('gallery_images', e, (u) => ({ url: u, kind: galKind }))} />
          </label>
          <small style={{ color: 'var(--gold)' }}>{fotoMsg.gallery_images}</small>
        </p>

        <h3>Definições</h3>
        <div className="row">
          <label>WhatsApp (com 245)
            <input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
          </label>
          <label>Abre às (h)
            <input type="number" min="0" max="23" value={draft.open} onChange={(e) => set({ open: e.target.value })} />
          </label>
          <label>Fecha às (h)
            <input type="number" min="1" max="24" value={draft.close} onChange={(e) => set({ close: e.target.value })} />
          </label>
          <label>Moeda
            <input value={draft.currency} onChange={(e) => set({ currency: e.target.value })} />
          </label>
        </div>
        <p className="lead">
          Estas são as horas normais dos dois salões. O Salão de Feira de Praça fecha mais tarde, às 22h, às quartas, sextas e sábados
          (isso está definido no código, em src/salons.js).
        </p>

        <h3>Gerentes dos salões</h3>
        <p className="lead">O aviso de cada marcação vai para o WhatsApp do gerente do salão que o cliente escolheu (com 245). Se um número ficar vazio, o aviso vai para o WhatsApp da barbearia acima.</p>
        <div className="row">
          {listSalons(cfg).map((s) => (
            <label key={s.id}>Gerente · {s.name}
              <input type="tel" inputMode="tel" placeholder="245 955 115 048" value={draft.salon_phones[s.id] || ''} onChange={(e) => set({ salon_phones: { ...draft.salon_phones, [s.id]: e.target.value } })} />
            </label>
          ))}
        </div>

        <h3>Barbeiros</h3>
        <p className="lead">Escolhe o salão de cada barbeiro: o cliente só vê os barbeiros do salão que escolher. Com 2 ou mais barbeiros no salão, ele passa a escolher o profissional.</p>
        {draft.team.map((t, i) => (
          <div className="pfedit" key={t.id}>
            <span className="avatar">
              {t.photo ? <img src={t.photo} alt="" /> : (t.name || '?').trim().charAt(0).toUpperCase()}
            </span>
            <label>Nome
              <input value={t.name} onChange={(e) => setMember(i, { name: e.target.value })} />
            </label>
            <label>Telemóvel
              <input type="tel" inputMode="tel" placeholder="955 115 048" value={t.phone || ''} onChange={(e) => setMember(i, { phone: e.target.value })} />
            </label>
            <label>Salão
              <select value={t.salon || ''} onChange={(e) => setMember(i, { salon: e.target.value })}>
                <option value="">Os dois (por escolher)</option>
                {listSalons(cfg).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label className="btn alt" style={{ cursor: fotoBusy ? 'wait' : 'pointer', display: 'inline-block' }}>
                {t.photo ? 'Trocar foto' : 'Foto de perfil'}
                <input type="file" accept="image/*" hidden disabled={fotoBusy} onChange={(e) => fotoBarbeiro(i, e)} />
              </label>
              <button type="button" className="btn alt" onClick={() => set({ team: draft.team.filter((_, j) => j !== i) })}>Remover</button>
            </span>
          </div>
        ))}
        <button type="button" className="btn alt" onClick={() => set({ team: [...draft.team, { id: `p${Date.now().toString(36)}`, name: '', phone: '', photo: '', salon: 'lago' }] })}>
          + Barbeiro
        </button>

        <h3>Serviços e preços</h3>
        {draft.services.map((s, i) => (
          <div className="row svedit" key={i}>
            <span className="simg">{s.img ? <img src={s.img} alt="" /> : <span aria-hidden="true">✂</span>}</span>
            <label>Serviço
              <input value={s.n} onChange={(e) => setService(i, { n: e.target.value })} />
            </label>
            <label>Preço ({draft.currency})
              <input type="number" min="0" value={s.p ?? ''} onChange={(e) => setService(i, { p: e.target.value })} />
            </label>
            <label>Categoria
              <select value={s.c || ''} onChange={(e) => setService(i, { c: e.target.value, dom: e.target.value === 'Domicílio' })}>
                <option value="">Outros</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={Boolean(s.mais)} onChange={(e) => setService(i, { mais: e.target.checked })} />
              “ou mais”
            </label>
            <label>Duração
              <select value={s.d || 30} onChange={(e) => setService(i, { d: Number(e.target.value) })}>
                {DURACOES.map((d) => <option key={d} value={d}>{fmtDur(d)}</option>)}
              </select>
            </label>
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label className="btn alt" style={{ cursor: fotoBusy ? 'wait' : 'pointer', display: 'inline-block' }}>
                {s.img ? 'Trocar foto' : 'Foto do serviço'}
                <input type="file" accept="image/*" hidden disabled={fotoBusy} onChange={(e) => fotoServico(i, e)} />
              </label>
              {s.img && <button type="button" className="btn alt" onClick={() => setService(i, { img: '' })}>Tirar foto</button>}
              <button type="button" className="btn alt" onClick={() => set({ services: draft.services.filter((_, j) => j !== i) })}>Remover</button>
            </span>
          </div>
        ))}
        <p style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn alt" onClick={() => set({ services: [...draft.services, { n: 'Novo serviço', p: null, d: 30, img: '', c: 'Cabelo' }] })}>+ Serviço</button>
          <button type="button" className="btn" onClick={guardar}>Guardar definições</button>
          <small style={{ color: 'var(--gold)' }}>{msg}</small>
        </p>

        <p style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 28 }}>
          <button type="button" className="btn alt" onClick={onBack}>Voltar ao site</button>
          <button type="button" className="btn alt" onClick={() => signOut()}>Sair</button>
        </p>
      </div>
    </section>
  );
}
