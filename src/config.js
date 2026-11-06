import { useCallback, useEffect, useState } from 'react';
import base from './data/site.json';
import { fetchSettings } from './api';

// Textos fixos e números das redes (stats) vêm de src/data/site.json.
// Telefone, horário, equipa, serviços e preços vêm da base de dados (Supabase) e mudam para todos.
export function useConfig() {
  const [cfg, setCfg] = useState(base);

  const reload = useCallback(async () => {
    const s = await fetchSettings();
    if (s) {
      // os números do TikTok/Instagram e os vídeos são fixos (src/data/site.json e src/data/videos.json), sem integração
      setCfg({
        ...base,
        phone: s.phone,
        open: s.open_hour,
        close: s.close_hour,
        currency: s.currency || base.currency,
        salon_phones: s.salon_phones || {},
        team: s.team || [],
        services: s.services,
        hero_images: s.hero_images || [],
        gallery_images: s.gallery_images || [],
      });
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return [cfg, reload];
}
