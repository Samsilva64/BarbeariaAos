import { useEffect, useState } from 'react';
import { useConfig } from './config';
import Nav from './components/Nav.jsx';
import { Hero, Stats } from './components/Hero.jsx';
import Gallery from './components/Gallery.jsx';
import Services from './components/Services.jsx';
import Booking from './components/Booking.jsx';
import Lema from './components/Lema.jsx';
import Videos from './components/Videos.jsx';
import About from './components/About.jsx';
import { Cta, Footer } from './components/Footer.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import Admin from './components/Admin.jsx';

export default function App() {
  const [cfg, reload] = useConfig();
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // O painel de administração fica em  /#/admin
  if (route === '#/admin') return <Admin cfg={cfg} reload={reload} />;

  return (
    <>
      <Nav cfg={cfg} />
      <Hero cfg={cfg} />
      <Stats cfg={cfg} />
      <Gallery cfg={cfg} />
      <Services cfg={cfg} />
      <Booking cfg={cfg} />
      <Lema />
      <Videos />
      <About />
      <Cta cfg={cfg} />
      <Footer cfg={cfg} />
      <WhatsAppButton cfg={cfg} />
    </>
  );
}
