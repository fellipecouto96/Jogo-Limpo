import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display text-xl tracking-tight">
            Jogo Limpo
          </span>
          <Link
            to="/app"
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16 overflow-hidden">
        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse, rgba(16,185,129,0.3) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative text-center max-w-3xl mx-auto">
          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl leading-tight tracking-tight animate-fade-in-up"
          >
            A infraestrutura oficial de sorteios para{' '}
            <span className="text-emerald-400">sinuca amadora</span>
          </h1>

          <p
            className="mt-6 text-lg sm:text-xl text-gray-400 max-w-xl mx-auto leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '150ms' }}
          >
            Sorteios transparentes, chaves automaticas e modo TV para seu
            torneio. Sem papel, sem desconfianca.
          </p>

          <div
            className="mt-10 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              to="/app"
              className="inline-block bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-lg px-8 py-4 rounded-xl transition-colors"
            >
              Criar meu primeiro torneio
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-center mb-16 tracking-tight">
            O problema que todo organizador conhece
          </h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: '\u2753',
                title: 'Desconfianca no sorteio',
                text: 'Sorteios manuais geram duvidas. Jogadores questionam a imparcialidade.',
              },
              {
                icon: '\u{1F6AB}',
                title: 'No-show alto',
                text: 'Sem compromisso formal, jogadores desistem na ultima hora.',
              },
              {
                icon: '\u{1F4AD}',
                title: 'Zero historico',
                text: 'Resultados se perdem. Ninguem sabe quem jogou contra quem.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6"
              >
                <div className="text-3xl mb-3" aria-hidden="true">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl text-center mb-16 tracking-tight">
            Como funciona
          </h2>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Crie o torneio',
                text: 'De um nome e registre quem organiza.',
              },
              {
                step: '02',
                title: 'Adicione jogadores',
                text: 'Cadastre os participantes confirmados.',
              },
              {
                step: '03',
                title: 'Sorteie com transparencia',
                text: 'Algoritmo deterministico. Seed publica. Auditavel.',
              },
              {
                step: '04',
                title: 'Exiba no modo TV',
                text: 'Chaves ao vivo na tela do bar. Profissional.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-emerald-500 font-bold text-sm tracking-widest mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight mb-4">
            Pronto para organizar{' '}
            <span className="text-emerald-400">do jeito certo</span>?
          </h2>
          <p className="text-gray-400 mb-10">
            Comece agora. E gratuito para seu primeiro torneio.
          </p>
          <Link
            to="/app"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-lg px-8 py-4 rounded-xl transition-colors"
          >
            Criar meu primeiro torneio
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/5 text-center text-gray-600 text-sm">
        Jogo Limpo &mdash; Se nao esta no Jogo Limpo, nao e oficial.
      </footer>
    </div>
  );
}
