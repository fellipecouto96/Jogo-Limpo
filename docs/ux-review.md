# Strategic UX / Copy / Mobile Stress Review — Jogo Limpo

**Target user:** Bar owner organizer, low technical literacy, managing tournaments under live pressure, one-hand mobile use, noisy environment.

---

## Flow 1: Landing Page (`LandingPage.tsx`)

### What works
- Strong headline: "A nova fase dos torneios de sinuca começa agora" — aspirational, clear.
- `InstitutionalPanel` with mock match/financial data gives instant credibility.
- Two CTAs to register — top and bottom of page.
- `[touch-action:manipulation]` on CTA buttons prevents double-tap zoom.

### Friction points
- **No mobile nav.** The nav is a simple bar with "Entrar" only. No hamburger, no way to jump to sections. On a tall scrolling page this matters less, but there's also no anchor nav.
- **No social proof.** Zero mentions of real tournaments, numbers, or testimonials. Bar owners trust other bar owners, not feature lists.
- **"Comece gratuitamente" is buried** under the CTA as a `<p>` in `text-sm text-gray-300` — nearly invisible on mobile dark background.
- **No WhatsApp/contact CTA.** This audience expects WhatsApp-first communication.

### Specific improvements
1. Add "Grátis para sempre" or "100% gratuito" badge next to or inside the main CTA button itself.
2. Add at least one social proof element: "Já organizamos X torneios" or a real testimonial quote.
3. Add WhatsApp floating button for support/questions.

### Tap reduction
- CTA is already `h-14 w-full` which is excellent for mobile. No change needed.

### Copy improvements
- "Criar torneio no novo padrão" → "Criar meu torneio grátis" (more direct, removes abstract "padrão")
- "Comece gratuitamente." → Remove this line and embed "Grátis" into the CTA.
- "A sinuca amadora está crescendo." → "Seus torneios merecem organização." (make it about THEM, not the market)

### Priority: **Medium** — First impression matters, but existing users bypass this.

---

## Flow 2: Auth — Login (`LoginPage.tsx`) + Register (`RegisterPage.tsx`)

### What works
- Clean, centered layout. Minimal fields. Clear toggle between login/register.
- Loading state on button ("Entrando..." / "Criando...").
- Specific network error message on `TypeError`.

### Friction points
- **Missing accents in copy**: "Nao tem conta?", "Ja tem conta?", "Nao foi possivel" — should be "Não", "Já", "Não". This signals low polish to Portuguese-speaking users.
- **No password visibility toggle.** Bar owners typing on mobile with autocorrect will struggle.
- **No "forgot password" link** on login page.
- **`autoFocus` on email field** — on mobile this immediately opens keyboard, which may shift the page before user sees the full form.
- **Error messages are generic.** "Erro desconhecido" gives zero guidance.
- Register placeholder "Ex: Bar do Chico" is excellent — shows understanding of the audience.

### Specific improvements
1. Add password visibility toggle (eye icon).
2. Add "Esqueceu a senha?" link on LoginPage.
3. Fix all missing accents across both pages.
4. Remove `autoFocus` on mobile — use it only on desktop via `matchMedia`.

### Copy improvements
- "Acesse sua conta de organizador" → "Entre na sua conta" (simpler)
- "Cadastre-se como organizador" → "Crie sua conta e organize seu primeiro torneio"
- "Minimo 6 caracteres" → "Mínimo 6 caracteres"

### Priority: **High** — Missing accents and no password recovery are trust-breakers for a financial product.

---

## Flow 3: Dashboard (`DashboardPage.tsx` + `AppLayout.tsx` + `Sidebar.tsx`)

### What works
- Clean metric cards (total collected, prizes paid) give immediate value.
- Tournament list with `StatusBadge` is clear.
- Mobile hamburger menu in `AppLayout` works correctly.
- Sidebar has logical nav order: Dashboard, Torneios, Criar torneio.

### Friction points
- **"Ola, {name}" without accent** — should be "Olá". Missing accent is recurring.
- **"Bem-vindo ao Jogo Limpo."** — Neutral. Doesn't drive action.
- **Tournament card action is "Ver detalhes"** → links to `/history`. For RUNNING tournaments, the user likely wants to go to the manage page, not history.
- **No "Criar torneio" CTA on the main area** when tournaments exist. It only appears in the empty state and sidebar.
- **"Total arrecadado no mes"** — missing accent: "mês". Also "premios" → "prêmios".
- **Sidebar has "Configuracoes"** link (`/app/settings`) — but there's no general settings page visible in the codebase. Dead link?

### Specific improvements
1. Tournament card should link to `/app/tournament/{id}` (manage) for RUNNING status, and `/app/tournament/{id}/history` for FINISHED.
2. Add floating "+" FAB or prominent "Criar torneio" button visible always, not just in sidebar.
3. Fix all missing accents: "Olá", "mês", "prêmios".

### Copy improvements
- "Bem-vindo ao Jogo Limpo." → "Seu painel de torneios." (action-oriented)
- "Ver detalhes" → "Gerenciar" for RUNNING, "Ver resultado" for FINISHED
- "Lista de torneios" → "Seus torneios"

### Priority: **High** — Dashboard is the hub. Wrong link targets for tournament cards is a critical UX failure.

---

## Flow 4: Create Tournament — Onboarding Step 1 (`OnboardingPage.tsx`, step 0)

### What works
- Two-step progress bar is clear and minimal.
- Default prize split (10% org, 70% champion, 30% runner-up) ships pre-filled — great for "just works" first experience.
- "Modo simples já vem pronto" banner manages expectations.
- Entry fee input uses `inputMode="decimal"` — correct for mobile numeric keyboard.
- `[touch-action:manipulation]` on all buttons.

### Friction points
- **Tournament name input has no label visible** — only `sr-only`. On mobile the placeholder disappears on focus, leaving user confused about what field they're filling.
- **"Configurar regras de premiação" uses emoji** (⚙️) — this renders inconsistently across Android versions and can look broken.
- **Advanced config has no "reset to defaults" button** — if user messes up percentages, they must manually figure out the original values.
- **Percentage sum validation message** ("A soma da premiação está em X%. Ela precisa fechar em 100%.") appears only after all fields are filled — user can get deep into confusion before seeing it.
- **"Continuar" button** doesn't scroll to error messages if they're above the fold.

### Specific improvements
1. Show visible labels above inputs (not just sr-only).
2. Replace emoji with SVG icon for the advanced config button.
3. Add a "Restaurar padrão" link inside the advanced panel.
4. Show real-time running total: "Soma atual: 95% (faltam 5%)" as user types.

### Copy improvements
- "Fluxo rápido para configurar premiação e iniciar pelo celular." → "Configure e inicie seu torneio em minutos."
- "Configurar regras de premiação" → "Ajustar percentuais"
- "Modo simples: organizador 10% | campeão 70% | vice 30%" → "Padrão: 10% organizador · 70% campeão · 30% vice"

### Priority: **High** — This is the first real interaction. Invisible labels and confusing percentage math kill onboarding.

---

## Flow 5: Prize Configuration (`TournamentSettingsPage.tsx`)

### What works
- Split layout with form + live preview is excellent for this audience.
- "Live" badge on preview reinforces real-time updates.
- Saved snapshot panel shows currently applied values — prevents confusion.
- 3rd/4th place toggle cascade (4th only available when 3rd is enabled) is correct.

### Friction points
- **"Finance Suite" header** — English title for a Portuguese-speaking bar owner audience. Feels misplaced.
- **`type="number"` inputs** on mobile Safari/Chrome show up/down spinner arrows that are tiny and useless. Also, number inputs accept 'e', '+', '-' characters.
- **No percentage sum indicator visible** — user must mentally add 1st + 2nd + 3rd + 4th and hope they equal 100%.
- **Missing accents everywhere**: "Configuracoes", "Parametros", "Simulacao", "inscricao", "Premiacao".
- **Preview column stacks below the form on mobile** — user can't see the impact of changes without scrolling down.
- **"Salvar configuracoes" button** is at the bottom of a potentially long form. On mobile this requires scrolling past the entire form.

### Specific improvements
1. Replace "Finance Suite" with "Premiação" or "Regras do torneio".
2. Add a live percentage sum bar at the top of the prize split section: "70 + 25 + 5 = 100%".
3. Use `type="text" inputMode="decimal"` instead of `type="number"` (consistent with OnboardingPage).
4. Add sticky "Salvar" button at bottom of viewport on mobile.
5. Fix all missing accents.

### Copy improvements
- "Finance Suite" → "Configuração de premiação"
- "Ajuste as regras de cobrança" → "Defina como dividir o prêmio"
- "Corte do organizador" → "Sua comissão"
- "Este valor e deduzido antes da distribuicao dos premios." → "Este valor é deduzido antes da distribuição dos prêmios."

### Priority: **High** — This is a money page. English header and no percentage sum indicator cause confusion and errors.

---

## Flow 6: Add Players (Onboarding Step 2)

### What works
- "Adicione um nome por vez e pressione Enter" — clear instruction.
- Duplicate detection is silent (just clears input) — no annoying error.
- Player count updates live.
- Financial preview card updates as players are added — immediate value feedback.
- Fixed bottom bar with draw button is excellent for mobile.
- "Remover" button per player is clear.

### Friction points
- **Player list max-height is `max-h-64`** (~256px). With 16 players and ~48px each, user can only see ~5 players. The list becomes a tiny scrolling window inside the page.
- **No batch add / paste support.** Bar owner who has a WhatsApp list of names must type each one individually.
- **No reorder capability.** If a player was added twice with slight variation (e.g., "Rafa" and "Rafael"), no way to merge them.
- **"+" button is `min-w-14`** — good tap target, but has no label text. For accessibility and clarity, it could say "Add" or at minimum have an `aria-label` (it has one: "Adicionar jogador" — good).
- **The "Voltar" button** goes back to step 0, but sits above the fixed bottom bar. On short screens, it can be partially hidden behind the fixed bar.

### Specific improvements
1. Increase `max-h-64` to `max-h-[50vh]` for player list.
2. Add a "Colar lista" button that accepts newline-separated names from clipboard.
3. Move "Voltar" into the fixed bottom bar (left side of the draw button, as a secondary action).

### Copy improvements
- "Adicione um nome por vez e pressione Enter." → "Digite o nome e toque + ou Enter."
- "Adicione pelo menos 2 jogadores com regras válidas para sortear." → "Mínimo 2 jogadores para iniciar o sorteio."

### Priority: **Medium-High** — Adding 16+ players one-by-one is tedious. Batch add would dramatically reduce time.

---

## Flow 7: Draw / Submit

### What works
- Draw button shows player count: "Sortear (16 jogadores)" — reassuring.
- `REQUIRE_DOUBLE_TAP_CONFIRM` flag exists (currently `false`) — good safety net available.
- Submit sends to `/onboarding/setup` and navigates directly to manage page — zero dead time.

### Friction points
- **No loading animation/feedback** between tap and navigation. `"Sorteando..."` text appears, but no visual indication of progress (spinner, skeleton, etc.).
- **No confirmation dialog.** User taps once and the tournament is created. For a financial commitment (entry fees), this feels too fast.
- **Error display after failed draw** appears at the top of the players section. If the user has scrolled down to add the last player, they may not see the error.

### Specific improvements
1. Enable `REQUIRE_DOUBLE_TAP_CONFIRM = true` for production. The 5-second armed window is reasonable.
2. Add a simple spinner/pulse animation to the draw button during submission.
3. Show errors in the fixed bottom bar area (near the draw button) rather than above the player list.

### Copy improvements
- "Sortear (16 jogadores)" → "Sortear chave com 16 jogadores" (more explicit about what happens)
- "Sorteando..." → "Gerando a chave..."

### Priority: **Medium** — Irreversible action without confirmation is risky.

---

## Flow 8: Live Match Management (`ManageTournamentPage.tsx` + `InteractiveMatchCard.tsx` + `ScoreInput.tsx`)

### What works
- Progress bar (X de Y partidas concluídas) is immediately visible and motivating.
- Auto-scroll to next match after recording a result — reduces hunting.
- Undo button (fixed bottom-right) provides safety net. Excellent under pressure.
- `InteractiveMatchCard` has large `min-h-[64px]` tap targets with `[touch-action:manipulation]`.
- Score input with +/- counters (`w-12 h-12 rounded-full`) is very mobile-friendly.
- "Confirmar sem placar" option — great for bar owners who don't track scores.
- Match cards show winner highlight (green bg) and loser (dimmed) — clear visual state.

### Friction points
- **Three buttons in the header** (TV Mode, Mobile, gear icon) compete for space on small screens. At 375px width, these may wrap or compress.
- **"Desfazer última ação" button** (`fixed bottom-6 right-4`) overlaps with any page content at the bottom. On 16-player tournaments with many matches, this could obscure the last match card.
- **Score input "Empate não é permitido"** message appears only after user creates a tie. No preemptive guidance. User could be confused about why they can't confirm.
- **Winner selection flow requires 2 extra steps now:** tap player → see score modal → choose "Confirmar sem placar" OR adjust scores. The old flow was likely: tap player → done. Extra step adds time under pressure.
- **"Editar Placar" / "Adicionar placar"** button in card footer is `text-xs text-gray-400` — very small and low contrast. Easy to miss.
- **Settings menu (gear icon)** opens a dropdown that can overflow off-screen on mobile.
- **No visual distinction between rounds** beyond the text header. All match cards look identical.

### Specific improvements
1. Collapse "TV Mode" + "Mobile" into a single "Compartilhar" dropdown or move to the gear menu.
2. Add `pb-20` to the match list to prevent undo button overlap.
3. Make the score step optional by adding a "Confirmar {nome} como vencedor" primary button FIRST, with "Adicionar placar" as secondary. Current flow inverts this.
4. Add round separators with more visual weight (colored borders or bg tints per round).
5. Make "Editar placar" button bigger: at least `text-sm` with some padding.

### Copy improvements
- "Partida 3" → "Jogo 3" (simpler Portuguese)
- "Aguardando adversario" → "Aguardando adversário" (missing accent)
- "Avançou automaticamente" — good, keep it.
- "Nenhuma partida pendente no momento." → "Todas as partidas da rodada foram decididas."

### Priority: **Critical** — This is the most-used screen under pressure. Every extra tap and every obscured element costs time in a live tournament.

---

## Flow 9: Ceremony / Championship Closure (`ChampionshipClosureScreen`)

### What works
- Celebration animation (confetti particles + glow) creates emotional payoff.
- Prize highlight cards with accent colors (emerald for champion, slate/amber for others) create hierarchy.
- "Compartilhar resultado" triggers Web Share API with fallback to clipboard — excellent.
- Share text includes 3rd/4th place prizes when applicable.
- Three clear CTAs: TV Mode, Share, Full Summary.

### Friction points
- **Celebration animation is only 2.2 seconds** and only triggers on RUNNING→FINISHED transition. If the organizer refreshes the page, they never see it again. This is a once-in-a-tournament moment.
- **"Resultado final indisponivel" text** shows briefly before details load — jarring.
- **Financial summary duplicates information** already shown in prize highlight cards above. Champion prize appears twice (card + summary line).
- **Three CTAs in a row** — "Abrir modo TV" is emerald/primary, but "Compartilhar resultado" is probably the most important action. Wrong visual hierarchy.
- **No champion name visual emphasis.** The champion name is `text-4xl text-emerald-200`, but the heading "Campeão do Torneio" is `text-2xl text-white` — the label is less prominent than the name, but there's no visual "crown" or podium metaphor.

### Specific improvements
1. Make "Compartilhar resultado" the primary (emerald) button. Move "Abrir modo TV" to secondary.
2. Remove duplicate prize amounts — keep only the highlight cards OR the summary, not both.
3. Add a "replay animation" button or trigger celebration on first view (not just transition).
4. Add loading skeleton that says "Calculando resultado oficial..." instead of "Resultado final indisponivel".

### Copy improvements
- "Encerramento oficial" → "Resultado oficial"
- "Valor do campeão" / "Valor do vice" → "Prêmio do campeão" / "Prêmio do vice" (more natural)
- "Definição pendente" (for missing runner-up) → "A definir"

### Priority: **Medium** — Emotional peak moment. Share button being secondary is a missed viral opportunity.

---

## Flow 10: History / Tournament Report (`TournamentHistoryPage.tsx`)

### What works
- Professional layout with section cards (Info, Results, Financial, Transparency).
- Full bracket displayed read-only.
- Draw seed shown for auditability — unique differentiator.
- `formatDateRange` handles edge cases well.

### Friction points
- **Missing accents everywhere**: "Relatorio oficial", "Informacoes basicas", "Visao geral", "inscricao", "Premiacao", "Distribuicao", "transparencia".
- **FinalMatchCard shows "Placar final: Indisponivel"** even when scores exist. The component doesn't receive score data from the bracket.
- **Financial section only shows 1st and 2nd place prizes** — no 3rd/4th place even though they exist in the data model.
- **Bracket horizontally scrolls** with `overflow-x-auto`, but there's no scroll indicator. User may not discover rounds beyond the viewport.
- **"Dashboard" back link** is a small left arrow + text. Could be missed on mobile.
- **No share button** on this page. User must go back to manage page to share.

### Specific improvements
1. Fix all missing accents across every text string.
2. Add 3rd/4th place prizes to the financial section (data already available in `details`).
3. Pass `player1Score`/`player2Score` to `FinalMatchCard` to show actual score.
4. Add a "Compartilhar" button on this page.
5. Add horizontal scroll hint (fade gradient on the right edge of bracket).

### Copy improvements
- "Relatorio oficial" → "Relatório oficial"
- "Informacoes basicas" → "Informações básicas"
- "Resultado nao registrado" → "Resultado não registrado"
- "Indisponivel" → "Não registrado" (less formal, more honest)

### Priority: **Medium** — This page is the permanent record. Missing accents undermine the "professional" positioning.

---

## TV + Mobile Public Views (`TvLayout.tsx`, `MobileLayout.tsx`, `ChampionBanner.tsx`)

### What works
- Clean separation between TV (8px padding, large text) and Mobile (4px padding, smaller).
- `ChampionBanner` shows final score when available — great for spectators.
- `WaitingState` with bouncing dots signals "check back later" effectively.
- Tournament stats (player count, matches, highest scorer) add engagement.

### Friction points
- **API URL is hardcoded in useEffect**: `import.meta.env.VITE_API_URL ?? (...)` — this should use the shared `getApiUrl()` utility.
- **No auto-refresh.** TV view should poll or use websockets to update live.
- **No QR code on TV view** for spectators to open the mobile version.
- **"Torneio em preparacao" / "Aguardando sorteio das chaves"** — missing accents.

### Specific improvements
1. Use `getApiUrl()` utility instead of inline URL logic.
2. Add auto-refresh (polling every 10-15 seconds) on TV layout.
3. Generate QR code on TV view pointing to the mobile URL.

### Priority: **Medium** — TV view without auto-refresh defeats its purpose.

---

# Top 5 Lists

## Top 5 Mobile Risks

1. **Live match flow requires too many taps to record a winner** — Score modal intercepts every winner selection. Under bar pressure with 16 players, this adds 30+ unnecessary taps per tournament.
2. **Settings page preview column stacks below form** — User adjusts percentages blind on mobile, must scroll to see impact. No sticky save button.
3. **Player list container is only 256px tall** — With 16+ players, the tiny scrollable list is hard to navigate and review on mobile.
4. **Three header buttons on manage page compress on small screens** — TV Mode + Mobile + Gear at 375px width creates cramped layout.
5. **"Desfazer última ação" button overlaps content** — Fixed bottom-right positioning blocks match cards on scroll.

## Top 5 UX Improvements

1. **Smart tournament card links on dashboard** — RUNNING tournaments should link to manage page, FINISHED to history. Currently all go to history.
2. **Live percentage sum indicator** — Both onboarding and settings pages should show running total of prize percentages with visual feedback (green = 100%, red = off).
3. **Batch player add** — "Colar lista" button to paste names from WhatsApp/notes. Would cut onboarding time by 60% for large tournaments.
4. **Auto-refresh on TV view** — Without polling, the TV mode is a static screenshot that someone must manually refresh.
5. **Make "Confirmar sem placar" the primary action** — Swap the hierarchy: quick confirmation first, score entry as optional expansion. Match the 80% use case.

## Top 5 Copy Refinements

1. **Fix ALL missing accents across the entire product** — "Nao", "Ja", "Ola", "mes", "premios", "Relatorio", "Informacoes", "Configuracoes", etc. This is pervasive and damages credibility in a Portuguese-language product handling money.
2. **"Finance Suite" → "Configuração de premiação"** — English title on a PT-BR product is disorienting.
3. **"Criar torneio no novo padrão" → "Criar meu torneio grátis"** — Direct, personal, emphasizes free.
4. **"Ver detalhes" on tournament cards → "Gerenciar" / "Ver resultado"** — Match action to context.
5. **"Corte do organizador" → "Sua comissão"** — "Corte" has negative connotation. "Comissão" is professional.

## Top 5 Quick Wins (< 1 hour each)

1. **Fix all missing accents** — Global find-replace for common patterns: "Nao" → "Não", "Ja" → "Já", etc. ~30 minutes.
2. **Add `pb-20` to match list** — Prevents undo button overlap. ~5 minutes.
3. **Change dashboard tournament card links** — Conditional `to=` based on `t.status`. ~15 minutes.
4. **Rename "Finance Suite" to "Configuração de premiação"** — Single string change. ~2 minutes.
5. **Add 3rd/4th place to history financial section** — Data already available in `details`, just add two more `<InfoStat>` blocks. ~15 minutes.

## Top 5 Structural Improvements

1. **Refactor score recording flow** — Make winner confirmation the primary single-tap action, with score entry as an expandable/optional section. This is the most impactful change for live tournament operation.
2. **Add real-time polling to TV/Mobile public views** — Either polling with `setInterval` or SSE. Without this, the TV mode fails its core purpose.
3. **Implement batch player import** — Clipboard paste + newline split. Would also enable future WhatsApp integration.
4. **Create sticky bottom action bar pattern** — Reuse across Settings (save button), Manage (undo), and Onboarding (draw). Currently each page implements its own fixed bar differently.
5. **Add password recovery flow** — A financial product without password recovery is a support burden. Even a simple "email reset link" would suffice.
