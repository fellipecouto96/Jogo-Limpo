# Jogo Limpo 🎱

A infraestrutura oficial da sinuca amadora.

⸻

🎯 Visão

O Jogo Limpo é a plataforma oficial para organização, gestão e profissionalização de torneios de sinuca amadora no Brasil.

Começamos resolvendo um problema simples e crítico:
sorteios transparentes.

Evoluímos para nos tornar a camada digital que sustenta:
- Inscrições com pagamento confirmado
- Gestão financeira automatizada
- Estrutura completa de torneios
- Histórico permanente
- Ranking regional e nacional
- Selo oficial de circuito

Se não está no Jogo Limpo, não é oficial.

⸻

🧩 Problema

A sinuca amadora brasileira sofre com:
- Sorteios manuais e desconfiança
- Inscrições informais
- No-show elevado
- Falta de histórico permanente
- Premiação indefinida
- Ausência de ranking nacional

O resultado:
Desorganização, estresse e perda de credibilidade.

⸻

🚀 Solução

O Jogo Limpo oferece:

- ✔ Sorteio transparente com log imutável

- ✔ Cadastro digital de jogadores

- ✔ Eliminação automática

- ✔ Tela pública modo TV

- ✔ Cálculo automático de premiação

- ✔ Histórico permanente de torneios

E em evolução:

- 💳 Pagamento integrado (Pix / cartão)
- 📊 Relatórios financeiros automáticos
- 🏆 Ranking regional e nacional
- 🛡 Selo Oficial Jogo Limpo

## Integração com Supabase

- `DATABASE_URL`: aponte para o **Connection Pooler** (porta 6543) para todas as conexões HTTP do backend. Isso segue as recomendações de pooling da Supabase para garantir reutilização de conexões e operar bem sob carga.
- `DIRECT_DATABASE_URL`: use a URL padrão (porta 5432) apenas para migrações/Prisma (flag `directUrl`). Assim o Prisma e operações administrativas contornam o pooler quando precisam de transações longas.
- Configure limites como `idle_in_transaction_session_timeout` (30 s) e `idle_session_timeout` (10 min) no banco ou PgBouncer para evitar sessões presas.

Preencha `.env` com as URLs reais fornecidas pelo projeto Supabase e execute `pnpm prisma generate && pnpm prisma db push` para sincronizar o schema.
