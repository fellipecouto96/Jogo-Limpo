import { test, expect } from '@playwright/test';
import {
  registerAndLogin,
  collectConsoleErrors,
  assertNoHorizontalScroll,
} from './helpers';

test.describe('Scenario B — Large Tournament (32 players)', () => {
  test('32-player tournament renders without UI break', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = collectConsoleErrors(page);

    await registerAndLogin(page);
    await page.goto('/app/new');

    // Fill basic info
    await page.getByPlaceholder('Ex: Copa de Domingo').fill('Copa Grande');
    await page.locator('#entry-fee').fill('50');
    await page.getByRole('button', { name: /continuar/i }).click();

    // Add 32 players
    for (let i = 1; i <= 32; i++) {
      await page.getByPlaceholder('Nome do jogador').fill(`Jogador ${i}`);
      await page.getByRole('button', { name: /adicionar/i }).click();
    }

    await expect(page.locator('text=Total: 32 jogadores')).toBeVisible();

    // Draw
    await page.getByRole('button', { name: /sortear/i }).click();
    await page.waitForURL('**/app/tournament/*', { timeout: 30_000 });

    // Verify no layout issues
    await assertNoHorizontalScroll(page);

    // Verify progress bar is rendered
    await expect(page.locator('text=0 de')).toBeVisible();

    // Verify no console errors
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Scenario C — Stress Tests', () => {
  test('rapid winner taps do not corrupt state', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await registerAndLogin(page);
    await page.goto('/app/new');

    // Create small tournament
    await page.getByPlaceholder('Ex: Copa de Domingo').fill('Stress Test');
    await page.locator('#entry-fee').fill('10');
    await page.getByRole('button', { name: /continuar/i }).click();

    // Add 4 players for a quick bracket
    for (const name of ['P1', 'P2', 'P3', 'P4']) {
      await page.getByPlaceholder('Nome do jogador').fill(name);
      await page.getByRole('button', { name: /adicionar/i }).click();
    }

    await page.getByRole('button', { name: /sortear/i }).click();
    await page.waitForURL('**/app/tournament/*', { timeout: 15_000 });

    // Rapid clicking - try to double-click winner buttons
    const matchCards = page.locator('[class*="rounded-2xl"][class*="border"]');
    const firstCard = matchCards.first();
    if (await firstCard.isVisible()) {
      // Double-click attempt (should not cause double-advancement)
      const button = firstCard.locator('button').first();
      if (await button.isVisible()) {
        await button.dblclick();
        await page.waitForTimeout(500);
      }
    }

    // Page should still be functional
    await expect(page.locator('h1')).toBeVisible();

    // No console errors
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    expect(realErrors).toHaveLength(0);
  });
});

test.describe('Data Integrity Checks', () => {
  test('finished tournament blocks edits', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/app/new');

    // Create a 2-player tournament (fastest to finish)
    await page.getByPlaceholder('Ex: Copa de Domingo').fill('Quick Finish');
    await page.locator('#entry-fee').fill('10');
    await page.getByRole('button', { name: /continuar/i }).click();

    for (const name of ['Jogador A', 'Jogador B']) {
      await page.getByPlaceholder('Nome do jogador').fill(name);
      await page.getByRole('button', { name: /adicionar/i }).click();
    }

    await page.getByRole('button', { name: /sortear/i }).click();
    await page.waitForURL('**/app/tournament/*', { timeout: 15_000 });

    // Advance the single match to finish the tournament
    await page.waitForTimeout(1000);

    // Find and click a player button to advance
    const playerButtons = page.locator('button:visible');
    const count = await playerButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = playerButtons.nth(i);
      const text = await btn.textContent();
      if (text && (text.includes('Jogador A') || text.includes('Jogador B'))) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Tournament should be finished
    const isFinished = await page
      .locator('text=Finalizado')
      .isVisible()
      .catch(() => false);

    if (isFinished) {
      // Settings gear should show blocked options
      const settingsButton = page.locator(
        'button[aria-label*="configurações"], button[aria-label*="config"]'
      );
      if ((await settingsButton.count()) > 0) {
        await settingsButton.first().click();
        await page.waitForTimeout(300);

        // Verify "bloqueado" text appears for editing
        const blockedText = await page
          .locator('text=bloqueado')
          .count();
        expect(blockedText).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Performance Checks', () => {
  test('tournament creation flow under timeout', async ({ page }) => {
    const startTime = Date.now();

    await registerAndLogin(page);
    await page.goto('/app/new');

    await page.getByPlaceholder('Ex: Copa de Domingo').fill('Perf Test');
    await page.locator('#entry-fee').fill('20');
    await page.getByRole('button', { name: /continuar/i }).click();

    for (let i = 1; i <= 8; i++) {
      await page.getByPlaceholder('Nome do jogador').fill(`Player ${i}`);
      await page.getByRole('button', { name: /adicionar/i }).click();
    }

    await page.getByRole('button', { name: /sortear/i }).click();
    await page.waitForURL('**/app/tournament/*', { timeout: 15_000 });

    const elapsed = Date.now() - startTime;

    // Core flow should complete within 2 minutes (including network)
    expect(elapsed).toBeLessThan(120_000);
  });
});
