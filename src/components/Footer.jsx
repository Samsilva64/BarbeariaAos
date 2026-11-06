import { P, formatPhone, waLink } from '../utils';
import { listSalons, notaHorarios } from '../salons';

export function Cta({ cfg }) {
  return (
    <section className="cta" id="contacto">
      <div className="wrap">
        <h2>Visita-nos!</h2>
        <p>Esperamos por ti, todos os dias das {P(cfg.open)}h às {P(cfg.close)}h. {notaHorarios(cfg)}</p>
        <div className="btns">
          <a className="btn" href={`tel:+${cfg.phone}`}>Ligar {formatPhone(cfg.phone)}</a>
          <a className="btn alt" href={waLink(cfg.phone)}>WhatsApp</a>
          <a className="btn alt" href={cfg.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
      </div>
    </section>
  );
}

export function Footer({ cfg }) {
  const salons = listSalons(cfg);
  return (
    <>
      <div className="stripe" />
      <section className="loc" id="onde">
        <div className="wrap">
          <h2>📍 Onde estamos</h2>
          <div className="locs">
            {cfg.locations.map((l, i) => (
              <div className="locbox" key={l.name}>
                <h3>{l.name}</h3>
                <p>{l.where}</p>
                {((salons[i] && salons[i].horario) || []).map((h) => (
                  <p className="lochr" key={h.dias}>⏰ {h.dias}: {h.horas}</p>
                ))}
                <a className="btn alt" href={l.map} target="_blank" rel="noopener noreferrer">Ver no mapa</a>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer>
        <a href={cfg.social.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>
        <a href={cfg.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href={cfg.social.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
        <a href={`${import.meta.env.BASE_URL}termos/`}>Termos de Serviço</a>
        <a href={`${import.meta.env.BASE_URL}privacidade/`}>Política de Privacidade</a>
        <p>© {cfg.name}, Bissau, Guiné-Bissau</p>
      </footer>
    </>
  );
}
