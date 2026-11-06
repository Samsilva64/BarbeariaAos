import { useEffect, useState } from 'react';
import { P, formatPhone, img, waLink } from '../utils';
import { FOTOS, fotosDePerfil } from './Gallery.jsx';
import { notaHorarios } from '../salons';

// Fundo da página inicial: as fotos passam sozinhas, uma a uma.
// Se o administrador não tiver adicionado fotos, usa as da galeria.
function Slides({ images }) {
  const [i, setI] = useState(0);
  const n = images.length;

  useEffect(() => {
    if (n < 2) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setI((k) => (k + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, i]);

  const atual = i < n ? i : 0;

  return (
    <>
      <div className="hero-bg" aria-hidden="true">
        {images.map((src, k) => (
          <img key={`${src}-${k}`} src={src} alt="" className={k === atual ? 'on' : ''} />
        ))}
      </div>
    </>
  );
}

export function Hero({ cfg }) {
  // Fotos do slide, as que o administrador adiciona no painel, sem reutilizar as fotos de perfil da equipa.
  const perfis = fotosDePerfil(cfg);
  const custom = (cfg.hero_images || []).filter((src) => !perfis.has(src));
  const images = custom.length ? custom : FOTOS.map((f) => img(f.file));
  return (
    <header className="hero">
      <Slides images={images} />
      <div className="wrap">
        <div className="pole" aria-hidden="true" />
        <div className="ht">
          <div className="suits">
            <span>♠ Qualidade</span>
            <span>♦ Classe</span>
            <span>♣ Conforto</span>
            <span>♥ Satisfação</span>
          </div>
          <h1>Tudo na régua.</h1>
          <p>
            {cfg.name}, salão de beleza masculino em Bissau. Abrimos todos os dias, das {P(cfg.open)}h às{' '}
            {P(cfg.close)}h. {notaHorarios(cfg)} Visita-nos, esperamos por ti.
          </p>
        </div>
        <img className="logo" src={img('logo.jpg')} alt="Logo BarberShop AOS" />
      </div>
      {/* Botões no fundo do ecrã, 2 por linha: Ligar | WhatsApp  /  TikTok | Instagram */}
      <div className="hbtns">
        <a className="btn" href={`tel:+${cfg.phone}`}>Ligar {formatPhone(cfg.phone)}</a>
        {/* Lugar do botão verde: o próprio botão flutuante (WhatsAppButton) fica por cima deste espaço e é ele que depois pula para o canto */}
        <a id="wa-slot" className="btn wa2 slot" href={waLink(cfg.phone)} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">WhatsApp</a>
        <a className="btn alt" href={cfg.social.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>
        <a className="btn alt" href={cfg.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
      </div>
    </header>
  );
}

export function Stats({ cfg }) {
  const s = cfg.stats;
  return (
    <div className="band">
      <div className="wrap">
        <div><span className="num">+{s.tiktokFollowers}</span><small>seguidores no TikTok</small></div>
        <div><span className="num">+{s.tiktokLikes}</span><small>curtidas no TikTok</small></div>
        <div><span className="num">+{s.instagramFollowers}</span><small>seguidores no Instagram</small></div>
        <div><span className="num">{P(cfg.open)}h às {P(cfg.close)}h</span><small>aberto todos os dias</small></div>
      </div>
    </div>
  );
}
