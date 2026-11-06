import { useState } from 'react';

export default function Nav({ cfg }) {
  const [open, setOpen] = useState(false);

  return (
    <nav>
      <div className="wrap">
        <b>{cfg.name.toUpperCase()}</b>
        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((visible) => !visible)}
        >
          <span />
          <span />
          <span />
        </button>
        <div id="nav-links" className={`nav-links${open ? ' open' : ''}`}>
          <a href="#servicos" onClick={() => setOpen(false)}>Preçário</a>
          <a href="#marcar" onClick={() => setOpen(false)}>Agendar</a>
          <a href="#galeria" onClick={() => setOpen(false)}>Fotos</a>
          <a href="#sobre" onClick={() => setOpen(false)}>Sobre</a>
          <a href="#contacto" onClick={() => setOpen(false)}>Contacto</a>
        </div>
      </div>
      <div className="stripe" />
    </nav>
  );
}
