# BarberShop AOS — site em React + Vite com servidor (Supabase)

Site da barbearia **BarberShop AOS** (Bissau, Guiné-Bissau), com a identidade do TikTok e do Instagram @barbershopaos.

## O que o site faz

- Página inicial, serviços e preços, galeria de cortes, vídeos do TikTok, sobre nós
- Botão de WhatsApp fixo no ecrã
- **Marcação em etapas** (Serviço, Profissional, Horário, Dados, Confirmar, Pagamento): o cliente escolhe um ou mais serviços, o barbeiro, o dia e a hora livre. A marcação fica gravada na base de dados e o servidor não deixa duas marcações sobrepostas para o mesmo barbeiro, mesmo com serviços de durações diferentes
- **Painel de administração** em `/#/admin`, com email e senha: vê as marcações, confirma ou cancela, bloqueia horas e muda barbeiros, serviços (preço e duração), moeda, telefone e horário. As mudanças aparecem logo para todos, sem exportar nem publicar de novo
- Design adaptado ao telemóvel

## Tecnologias

| Tecnologia | Para quê |
|---|---|
| **React 18** | Interface em componentes |
| **Vite 5** + **@vitejs/plugin-react** | Servidor de desenvolvimento e build |
| **Supabase** (Postgres + Auth + Row Level Security) | Base de dados, login do administrador e regras de acesso. Plano gratuito chega |
| **@supabase/supabase-js** | Liga o site ao Supabase |
| **CSS puro** (`src/styles.css`) | Estilos |
| **Google Fonts** (Anton e Work Sans) | Letras |
| **WhatsApp (wa.me)** | Botão flutuante e aviso da marcação à barbearia |

## Ligar o servidor (Supabase), passo a passo

Tudo isto dá para fazer pelo navegador do telemóvel.

1. Cria uma conta grátis em **supabase.com** e toca em **New project**. Guarda a senha da base de dados.
2. Abre **SQL Editor**, cola o conteúdo de `supabase/schema.sql` (se já tinhas corrido uma versão anterior, apaga primeiro as tabelas antigas, como explica o topo do ficheiro), **troca `EMAIL_DO_ADMIN@exemplo.com` pelo teu email** e toca em **Run**.
3. Em **Authentication > Users**, toca em **Add user > Create new user**, usa o **mesmo email** e escolhe uma senha forte. Marca para confirmar o email automaticamente.
4. Em **Authentication > Sign In / Providers**, **desliga** a opção que permite novas pessoas criarem conta (*Allow new users to sign up*). Assim só tu entras.
5. Em **Project Settings > API Keys**, copia a **Publishable key** (começa com `sb_publishable_`) e, em **Project Settings > Data API**, o endereço do projeto. Copia só até `.supabase.co`, **sem** o `/rest/v1/` que aparece no fim (o site também remove isto sozinho). Em projetos antigos, a chave pública chama-se `anon`.
6. Copia `.env.example` para `.env` e cola os dois valores. Nunca uses a chave `secret` nem a `service_role` no site. A variável chama-se `VITE_SUPABASE_ANON_KEY`, mas aceita a Publishable key.
7. Ao publicar (Netlify...), adiciona as mesmas duas variáveis em **Environment variables**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. As variáveis só entram no site durante o build, por isso faz **novo deploy** depois de as criar.

Sem o `.env`, o site funciona em **modo simples**: a marcação só abre o WhatsApp e o painel avisa que o servidor não está ligado.

## Como correr

1. Instala o **Node.js** (versão LTS) em https://nodejs.org
2. Na pasta do projeto:

```bash
npm install
npm run dev
```

3. Abre o endereço que aparece (normalmente http://localhost:5173).

Sem computador? Abre a pasta no **StackBlitz** (stackblitz.com) ou no **GitHub Codespaces**, que correm tudo no navegador.

## Como publicar

```bash
npm run build
```

Isto cria a pasta `dist`. Envia-a para o **Netlify** (app.netlify.com/drop) ou liga o repositório ao **Vercel** ou **GitHub Pages**. Lembra-te das variáveis do passo 7.

## Como funciona a marcação

1. **Serviço:** o cliente escolhe um ou mais serviços (cada um com duração e preço). A duração total define quanto tempo a hora fica ocupada.
2. **Profissional:** só aparece se houver 2 ou mais barbeiros no painel. Há também "Sem preferência" (fica com o primeiro barbeiro livre).
3. **Horário:** escolhe o dia (21 dias à frente) e uma hora livre, de 30 em 30 minutos. Só aparecem livres as horas em que o serviço cabe inteiro.
4. **Dados:** nome, telemóvel (+245) e e-mail opcional. Sem registo.
5. **Confirmar:** resumo da marcação, com o valor total.
6. **Pagamento:** escolhe como paga. Por defeito, "Pagar na barbearia". Para acrescentar mais formas (por exemplo Orange Money), edita `payments` em `src/data/site.json`.

No fim, o site grava na tabela `bookings` e tenta avisar a barbearia automaticamente por WhatsApp. Se alguém ocupar a hora entretanto, o servidor recusa e o cliente volta à etapa do horário. Depois aparece a confirmação com o botão "Nova marcação". Se o aviso automático falhar, o cliente é informado e deve contactar a barbearia para confirmar.

No painel, a barbearia vê a marcação (a lista atualiza a cada 20 segundos), confirma ou cancela. Cancelar liberta a hora.

Os clientes só veem **quais horas estão ocupadas**, nunca nomes nem telefones. Quem lê as marcações é só o administrador.

## Onde mudar as coisas

| O quê | Onde |
|---|---|
| Telefone, horário, moeda, barbeiros, serviços (preço e duração) | Painel `/#/admin` (ficam na base de dados) |
| Formas de pagamento | `payments` em `src/data/site.json` |
| Textos fixos, redes sociais, números do TikTok, salões e links do mapa (`locations`) | `src/data/site.json` |
| Vídeos mais vistos | `src/data/videos.json` |
| Logo e fotos da galeria | `public/img/` (nomes: `logo.jpg`, `corte-1.jpg`, `corte-2.jpg`, `corte-3.jpg`) |
| Cores e estilos | `src/styles.css` (variáveis em `:root`) |
| Textos das seções | `src/components/` |
| Termos de Serviço e Política de Privacidade | `public/termos/index.html` e `public/privacidade/index.html` |

> Os preços que vêm no projeto (3000, 1500, 2000 e 5000 FCFA) são **fictícios**, só para demonstração. Troca pelos preços reais no painel `/#/admin`.

Antes de usar os links legais numa revisão de plataforma, confirma que o nome, contacto, práticas de dados e prazos de conservação refletem a operação real da barbearia. As páginas públicas ficam em `/termos/` e `/privacidade/` depois do deploy.

As fotos de perfil dos barbeiros são usadas na escolha do profissional e não aparecem na galeria nem no slide da página inicial. Para mostrar fotos nesses espaços, adiciona-as separadamente nas secções de galeria e slide do painel.

## Limites a ter em conta

- O aviso automático por WhatsApp depende da configuração da função `notify-booking` e do serviço de envio escolhido. Se o aviso falhar, a marcação continua registada no painel, mas o cliente recebe uma mensagem para contactar a barbearia.
- No plano gratuito, o Supabase pode pausar o projeto se ficar muito tempo sem uso. Basta reativar no painel do Supabase.
- Não há código de confirmação por SMS (como no RadarBarber): isso precisa de um serviço pago de SMS. Por agora, a confirmação é pelo WhatsApp.
- Não há proteção contra marcações falsas em massa (captcha). Se for preciso, dá para acrescentar.

## Estrutura

```
barbershop-aos/
├── index.html
├── package.json
├── vite.config.js
├── .env.example           variáveis do Supabase
├── supabase/schema.sql    tabelas, regras de acesso e administrador
├── public/img/            logo e fotos
└── src/
    ├── main.jsx           entrada da aplicação
    ├── App.jsx            monta a página e a rota /#/admin
    ├── supabase.js        cliente Supabase (null sem .env)
    ├── api.js             todas as chamadas à base de dados
    ├── config.js          junta site.json com as definições da base de dados
    ├── utils.js           funções auxiliares
    ├── styles.css
    ├── data/              site.json e videos.json
    └── components/        Nav, Hero, Gallery, Services, Lema,
                           Booking, BookingSteps, Videos, About, Footer, WhatsAppButton, Admin
```


## Números das redes, vídeos e slide (sem integração)

O site **não** está ligado ao TikTok nem ao Instagram: é mais leve e não depende de nenhuma API.
- **Seguidores e curtidas** (faixa vermelha): estão em `src/data/site.json` > `stats` (`tiktokFollowers`, `tiktokLikes`,
  `instagramFollowers`) e aparecem com um `+` à frente ("mais de ..."). Para atualizar, muda o texto e volta a publicar.
- **Vídeos mais vistos:** lista fixa em `src/data/videos.json`.
- **Slide da página inicial:** as fotos que adicionares em `/#/admin` > *Fotos do slide da página inicial*.
- Se o Supabase ainda tem a integração antiga, corre `supabase/remover-integracao-redes.sql` e apaga no painel a função
  `sync-social` e os Secrets `SYNC_SECRET`, `TIKTOK_CLIENT_KEY` e `TIKTOK_CLIENT_SECRET`.

## Avisar a barbearia por WhatsApp, sozinho, quando o cliente conclui a marcação

Quando o cliente toca em **Concluir marcação**, o site regista a marcação e pede à função `notify-booking` para
mandar a mensagem ao **WhatsApp da barbearia** (o número em `/#/admin` > Telemóvel da barbearia). Quem gere esse
WhatsApp avisa depois o barbeiro; o nome do barbeiro escolhido vem escrito na mensagem. Depois de concluir, o cliente vê a confirmação e o botão "Nova marcação". Se o aviso automático falhar, o site informa que a marcação foi registada, mostra o erro devolvido pela função e recomenda contactar a barbearia para confirmar.

Importante: um site não consegue mandar mensagens pelo WhatsApp sozinho. É preciso um serviço que as envie.
Aqui há duas escolhas (escolhe uma):

**A) CallMeBot (grátis e simples; não oficial, pode atrasar até 1 minuto).** Quem gere o WhatsApp da barbearia ativa o
número uma vez: segue as instruções em callmebot.com (guardar o contacto do bot e mandar-lhe "I allow callmebot to send
me messages"). O bot responde com uma *apikey*.

**B) WhatsApp Cloud API da Meta (oficial).** Precisa de conta Business, de um número para o site e de um modelo de
mensagem aprovado com UMA variável. Mais trabalho, mais estável.

Passos:
1. SQL Editor: corre `supabase/notify-booking.sql`.
2. Edge Functions > *Deploy a new function* > nome `notify-booking` > cola `supabase/functions/notify-booking/index.ts`
   > Deploy > **desliga "Verify JWT"**.
3. Edge Functions > Secrets:
   - Modo A: `CALLMEBOT_KEYS` = `{"245955115048":"APIKEY_DA_BARBEARIA"}`
     (o número da barbearia com 245, sem + nem espaços, e a apikey que o bot enviou)
   - Modo B: `WHATSAPP_PROVIDER` = `cloud`, `WA_TOKEN`, `WA_PHONE_ID`, `WA_TEMPLATE` (e `WA_LANG`, por defeito `pt_PT`)
4. Faz uma marcação de teste no site e vê se a mensagem chega ao WhatsApp da barbearia.

## Dois salões, cada um com o seu gerente e os seus barbeiros

Na marcação, a primeira etapa passa a ser **Salão** (Salão de Mbatonha ou Salão de Feira de Praça). Depois de escolher,
o cliente só vê os barbeiros daquele salão, e o aviso da marcação vai para o WhatsApp do **gerente desse salão**.

1. Supabase > SQL Editor: corre `supabase/salons.sql` (acrescenta as colunas novas).
2. Em Edge Functions > `notify-booking`, cola o novo `supabase/functions/notify-booking/index.ts` e dá Deploy.
3. Em `/#/admin`:
   - **Gerentes dos salões**: preenche o WhatsApp do gerente de cada salão (com 245). Se um ficar vazio, o aviso vai
     para o WhatsApp da barbearia.
   - **Barbeiros**: em cada barbeiro, escolhe o **Salão** onde trabalha. Os barbeiros que ainda estão em
     "Os dois (por escolher)" aparecem nos dois salões até escolheres um.
   - Carrega em **Guardar definições**.
4. Se usas o modo CallMeBot, cada número de gerente precisa da sua apikey em `CALLMEBOT_KEYS`. Com a API da Meta
   (modo `cloud`) não é preciso nada de especial: o número de teste só envia para números que cadastraste como
   destinatários, por isso adiciona aí os dois gerentes.

Nota: sem barbeiros num salão, a marcação usa uma agenda própria desse salão ("geral"), por isso um salão não ocupa
as horas do outro.


## Preçário real, nomes dos salões e horários

- **Preçário:** os 24 serviços do papel da barbearia (Cabelo, Pintura e Domicílio) estão em `src/data/site.json` (para quando o site
  está sem base de dados) e em `supabase/update-servicos.sql`. Como os serviços do painel mandam sobre o `site.json`, **corre o
  `update-servicos.sql` UMA vez no Supabase > SQL Editor** para o site passar a mostrar o preçário novo. Cada serviço tem `c` (categoria),
  `g` (grupo), `mais` ("ou mais") e `dom` (domicílio: a marcação pede a morada). As **durações são estimativas**: ajusta-as no painel.
- **Salões:** "Salão de Mbatonha" e "Salão de Feira de Praça" (os ids `lago` e `mercado` não mudam, para não estragar marcações antigas).
  Se mudares os nomes, mexe em `src/data/site.json` (locations), em `src/salons.js` e em `supabase/functions/notify-booking/index.ts`.
- **Horários:** o horário normal (9h às 19h) vem do painel. O Salão de Feira de Praça fecha às 22h às quartas, sextas e sábados:
  está em `src/salons.js` (`fechoExtra`). A marcação, o site e o painel (bloqueio de horas) já respeitam isto.
- **Marcação e preçário (visual):** em cada etapa da marcação a página acompanha a caixa (centra-a se cabe no ecrã, ou põe o topo logo abaixo do menu),
  para não ficar para trás quando a caixa encolhe. No preçário, as categorias compridas (Pintura) começam fechadas com **Ver mais**; abertas,
  ocupam a largura toda com os grupos em colunas.
- **Aviso das marcações:** depois de mudar os nomes, publica de novo a função `notify-booking` (Edge Functions > Code > Deploy)
  para a mensagem trazer os nomes novos dos salões.
