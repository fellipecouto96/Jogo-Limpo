import { type Page, expect } from '@playwright/test';

/** Generate a unique email for test isolation */
export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@jogo-limpo.test`;
}

/** Register a new organizer account and return token */
export async function registerAndLogin(page: Page, name = 'Teste E2E') {
  const email = uniqueEmail();
  const password = 'Teste123!';

  await page.goto('/register');
  await page.locator('#name').fill(name);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /criar conta/i }).click();

  // Should redirect to app shell/dashboard
  await page.waitForURL('**/app**', { timeout: 15_000 });

  return { email, password };
}

/** Create a quick tournament with N players */
export async function createTournament(
  page: Page,
  opts: { name?: string; players?: string[]; entryFee?: string } = {}
) {
  const {
    name = 'Torneio E2E',
    players = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'],
    entryFee = '25',
  } = opts;

  await page.goto('/app/new');

  // Step 0: Fill tournament info
  await page.getByPlaceholder('Ex: Copa de Domingo').fill(name);
  await page.locator('#entry-fee').fill(entryFee);
  await page.getByRole('button', { name: /continuar/i }).click();

  // Step 1: Add players
  for (const player of players) {
    await page.getByPlaceholder('Nome do jogador').fill(player);
    await page.getByRole('button', { name: /adicionar/i }).click();
  }

  // Draw
  await page.getByRole('button', { name: /sortear/i }).click();

  // Should navigate to tournament management
  await page.waitForURL('**/app/tournament/*', { timeout: 15_000 });
}

/** Advance all matches by clicking first available player (winner) */
export async function advanceAllMatches(page: Page) {
  // Keep clicking winners until tournament finishes
  let safety = 0;
  while (safety < 50) {
    safety++;

    // Check if tournament is finished
    const finishedBanner = page.locator('text=Torneio finalizado');
    if (await finishedBanner.isVisible().catch(() => false)) break;

    // Look for a match card with clickable winner buttons
    const winnerButtons = page.locator('[data-testid="winner-button"]');
    const count = await winnerButtons.count().catch(() => 0);

    if (count === 0) {
      // No winner buttons visible, might need to wait for next round
      await page.waitForTimeout(500);

      // Try looking for any button that could advance the match
      const matchButtons = page.locator('button:has-text("Venceu")');
      const matchCount = await matchButtons.count().catch(() => 0);
      if (matchCount === 0) break;

      await matchButtons.first().click();
      await page.waitForTimeout(300);
      continue;
    }

    await winnerButtons.first().click();
    await page.waitForTimeout(300);
  }
}

/** Check there are no console errors */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/** Assert no horizontal scroll at given viewport width */
export async function assertNoHorizontalScroll(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}
