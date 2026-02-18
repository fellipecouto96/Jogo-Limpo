import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const organizationPoints = [
  'Sorteio transparente',
  'Chave visível para todos',
  'Histórico permanente',
  'Registro de campeões',
  'Gestão financeira organizada',
  'Controle de múltiplos torneios',
];

const growthSignals = [
  'Mais torneios em diferentes regiões',
  'Mais jogadores disputando com frequência',
  'Mais necessidade de padrão e organização',
];

export function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Jogo Limpo | O novo padrão dos torneios de sinuca';
    const previousDescription = upsertMetaTag(
      'name',
      'description',
      'A nova fase dos torneios de sinuca começa agora. Organize com padrão profissional, sorteio transparente e gestão clara pelo celular.'
    );

    return () => {
      document.title = previousTitle;
      if (previousDescription === null) {
        const created = document.querySelector('meta[name="description"]');
        if (created) created.remove();
      } else {
        upsertMetaTag('name', 'description', previousDescription);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1411] text-white">
      <nav className="border-b border-white/10 bg-[#0d1411]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="font-display text-2xl tracking-tight text-white">Jogo Limpo</span>
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-semibold text-gray-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50"
          >
            Entrar
          </Link>
        </div>
      </nav>

      <main>
        <section className="px-4 pb-12 pt-9 sm:px-6 sm:pt-12">
          <div className="mx-auto grid w-full max-w-6xl gap-9 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-white [text-wrap:balance] sm:text-6xl">
                A nova fase dos torneios de sinuca começa agora.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-snug text-gray-200 sm:text-xl">
                Organize seu torneio com padrão profissional.
                <br className="hidden sm:block" />
                Sorteio transparente, chave pública e gestão clara pelo celular.
              </p>

              <div className="mt-7 sm:max-w-sm">
                <Link
                  to="/register"
                  className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-6 text-lg font-bold text-[#08120d] transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60 [touch-action:manipulation]"
                >
                  Criar meu torneio grátis
                </Link>
              </div>
            </div>

            <InstitutionalPanel />
          </div>
        </section>

        <section className="border-y border-white/10 px-4 py-12 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="font-display text-4xl tracking-tight text-white [text-wrap:balance] sm:text-5xl">
              Seus torneios merecem organização.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {growthSignals.map((signal) => (
                <p
                  key={signal}
                  className="rounded-xl border border-white/10 bg-[#111a16] px-4 py-4 text-base text-gray-100"
                >
                  {signal}
                </p>
              ))}
            </div>
            <p className="mt-6 text-2xl font-semibold text-emerald-300 sm:text-3xl">
              A modalidade merece organização.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="font-display text-4xl tracking-tight text-white [text-wrap:balance] sm:text-5xl">
              Organização profissional para torneios reais.
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {organizationPoints.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111a16] px-4 py-4"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-[#07110c]">
                    ✓
                  </span>
                  <span className="text-base text-gray-100">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-4xl text-lg text-gray-200">
              Não é apenas sobre facilitar o dia. É sobre elevar o padrão de quem organiza torneios com seriedade.
            </p>
          </div>
        </section>

        <section className="border-y border-white/10 px-4 py-12 sm:px-6">
          <div className="mx-auto w-full max-w-6xl rounded-2xl border border-emerald-400/30 bg-[#101b16] px-5 py-7 sm:px-7 sm:py-9">
            <h2 className="font-display text-4xl tracking-tight text-white [text-wrap:balance] sm:text-5xl">
              Seu torneio faz parte de algo maior.
            </h2>
            <p className="mt-5 max-w-4xl text-lg text-gray-100">
              Estamos construindo a base para um circuito nacional mais organizado.
            </p>
            <p className="mt-3 max-w-4xl text-lg text-gray-200">
              Hoje, mais clareza e controle no seu torneio. Amanhã, crescimento regional, histórico confiável e ranking estruturado.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="font-display text-4xl tracking-tight text-white [text-wrap:balance] sm:text-5xl">
              Eleve o nível do seu próximo torneio.
            </h2>
            <Link
              to="/register"
              className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-500 px-6 text-lg font-bold text-[#08120d] transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60 [touch-action:manipulation] sm:w-auto"
            >
              Criar torneio agora
            </Link>
          </div>
        </section>

        <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-gray-400 sm:px-6">
          Jogo Limpo
        </footer>
      </main>
    </div>
  );
}

function upsertMetaTag(
  attribute: 'name' | 'property',
  key: string,
  content: string
): string | null {
  const selector = `meta[${attribute}="${key}"]`;
  const existing = document.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    const previous = existing.getAttribute('content');
    existing.setAttribute('content', content);
    return previous;
  }

  const created = document.createElement('meta');
  created.setAttribute(attribute, key);
  created.setAttribute('content', content);
  document.head.appendChild(created);
  return null;
}

function InstitutionalPanel() {
  return (
    <div className="rounded-2xl border border-white/15 bg-[#121b17] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
        Padrão de organização
      </p>

      <div className="mt-4 rounded-xl border border-white/10 bg-[#0c120f] p-4">
        <p className="text-sm font-semibold text-white">Painel da rodada</p>
        <div className="mt-3 space-y-2">
          <MiniMatch left="Mesa 1 - Rafa" right="Buiu" done />
          <MiniMatch left="Mesa 2 - Carla" right="Lima" />
          <MiniMatch left="Mesa 3 - Jonas" right="Neto" />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-[#0c120f] p-4">
        <p className="text-sm font-semibold text-white">Resumo financeiro</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Arrecadação" value="R$ 640" />
          <Stat label="Organizador" value="R$ 64" />
          <Stat label="Premiação" value="R$ 576" />
        </div>
      </div>
    </div>
  );
}

function MiniMatch({
  left,
  right,
  done = false,
}: {
  left: string;
  right: string;
  done?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#121914] px-3 py-2">
      <p className={done ? 'text-emerald-200' : 'text-gray-100'}>{left}</p>
      <p className={done ? 'text-gray-500' : 'text-gray-300'}>{right}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#121914] p-2">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-emerald-100">{value}</p>
    </div>
  );
}
