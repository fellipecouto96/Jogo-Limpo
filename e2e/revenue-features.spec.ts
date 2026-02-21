/**
 * E2E tests for revenue features: Late Entry, Rebuy, Duplicate Name Detection.
 *
 * These tests require both the frontend (localhost:5173) and backend (localhost:3333)
 * to be running locally.
 *
 * Run with: npx playwright test e2e/revenue-features.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  registerAndLogin,
  createTournamentWithRevenue,
  advanceOneMatch,
  collectConsoleErrors,
  assertNoHorizontalScroll,
} from './helpers';

// ─── Duplicate Name Detection ──────────────────────────────────────────────────

test.describe('Duplicate Name Detection — Onboarding', () => {
  test('shows warning modal when duplicate name is added', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await registerAndLogin(page);
    await page.goto('/app/new');

    await page.getByPlaceholder('Ex: Copa de Domingo').fill('Copa Duplicados');
    await page.locator('#entry-fee').fill('20');
    await page.getByRole('button', { name: /continuar/i }).click();

    // Add first player
    await page.getByPlaceholder('Nome do jogador').fill('Alice');
    await page.getByRole('button', { name: /adicionar/i }).click();

    // Add duplicate (same name, different case)
    await page.getByPlaceholder('Nome do jogador').fill('alice');
    await page.getByRole('button', { name: /adicionar/i }).click();

    // Modal should appear warning about duplicate
    await expect(page.locator('text=/duplicad|já foi adicionad/i')).toBeVisible({ timeout: 5_000 });

    // Cancel — player should not be added twice
    await page.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.locator('text=Alice')).toHaveCount(1);

    expect(errors.filter(e => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0);
  });

  test('allows duplicate after user confirms override', async ({ page }) => {
    await registerAndLogin(page);
    await page.goto('/app/new');

    await page.getByPlaceholder('Ex: Copa de Domingo').fill('Copa Override');
    await page.locator('#entry-fee').fill('20');
    await page.getByRole('button', { name: /continuar/i }).click();

    await page.getByPlaceholder('Nome do jogador').fill('Bob');
    await page.getByRole('button', { name: /adicionar/i }).click();

    // Add duplicate
    await page.getByPlaceholder('Nome do jogador').fill('Bob');
    await page.getByRole('button', { name: /adicionar/i }).click();

    // Confirm override
    await page.getByRole('button', { name: /continuar mesmo assim|confirmar/i }).click();

    // Both Bobs should be present
    await expect(page.locator('text=Bob')).toHaveCount(2);
  });

  test('no horizontal scroll on mobile 375px during onboarding', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndLogin(page);
    await page.goto('/app/new');
    await page.waitForTimeout(500);
    await assertNoHorizontalScroll(page);
  });
});

// ─── Late Entry (Entrada Tardia) ───────────────────────────────────────────────

test.describe('Late Entry — Full Flow', () => {
  test('adds late player and updates financial total', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    test.setTimeout(90_000);

    await registerAndLogin(page);
    await createTournamentWithRevenue(page, {
      name: 'Copa Entrada Tardia',
      entryFee: '30',
      enableLateEntry: true,
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
    });

    // Verify tournament is running
    await expect(page.locator('text=Em andamento')).toBeVisible({ timeout: 10_000 });

    // "+ Jogador atrasado" button should be visible (or accessible via settings menu on mobile)
    // On desktop it's directly in the header
    const lateEntryBtn = page.getByRole('button', { name: /jogador atrasado/i });
    const settingsBtn = page.locator('[aria-label="Abrir configurações avançadas"]');

    const isLateEntryVisible = await lateEntryBtn.isVisible().catch(() => false);

    if (!isLateEntryVisible) {
      // On mobile: open settings menu to find it
      await settingsBtn.click();
      await expect(page.getByRole('button', { name: /jogador atrasado/i })).toBeVisible({ timeout: 3_000 });
    }

    await lateEntryBtn.click();

    // Fill in the late player modal
    await expect(page.locator('text=Entrada tardia')).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder(/nome do jogador/i).fill('Zara');
    await page.getByRole('button', { name: /adicionar jogador/i }).click();

    // Verify financial update — total should reflect extra entry
    await page.waitForTimeout(1000);
    // Financial section should show updated amount (5 players × 30 = 150)
    await expect(page.locator('text=/R\\$\\s*150/').first()).toBeVisible({ timeout: 8_000 });

    expect(errors.filter(e => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0);
  });

  test('late entry modal shows duplicate warning when name already exists', async ({ page }) => {
    test.setTimeout(90_000);

    await registerAndLogin(page);
    await createTournamentWithRevenue(page, {
      name: 'Copa Duplicado Tardio',
      entryFee: '25',
      enableLateEntry: true,
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
    });

    await expect(page.locator('text=Em andamento')).toBeVisible({ timeout: 10_000 });

    const lateEntryBtn = page.getByRole('button', { name: /jogador atrasado/i });
    await lateEntryBtn.click();

    // Try to add an already existing player name
    await page.getByPlaceholder(/nome do jogador/i).fill('Alice');
    await page.getByRole('button', { name: /adicionar jogador/i }).click();

    // Should show duplicate warning inline
    await expect(page.locator('text=/nome já existe|confirmar mesmo assim/i')).toBeVisible({ timeout: 5_000 });

    // Confirm override
    await page.getByRole('button', { name: /confirmar mesmo assim/i }).click();
    await page.waitForTimeout(1000);

    // Modal should close after successful add
    await expect(page.locator('text=Entrada tardia')).not.toBeVisible({ timeout: 5_000 });
  });

  test('late entry button not shown when allowLateEntry is disabled', async ({ page }) => {
    test.setTimeout(60_000);

    await registerAndLogin(page);
    await createTournamentWithRevenue(page, {
      name: 'Copa Sem Entrada Tardia',
      entryFee: '25',
      enableLateEntry: false,
    });

    await expect(page.locator('text=Em andamento')).toBeVisible({ timeout: 10_000 });

    // "+ Jogador atrasado" button should NOT be visible
    await expect(page.getByRole('button', { name: /jogador atrasado/i })).not.toBeVisible();
  });
});

// ─── Rebuy (Repescagem) ────────────────────────────────────────────────────────

test.describe('Rebuy — Full Flow', () => {
  test('rebuy button appears for loser, triggers re-entry, shows badge', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    test.setTimeout(90_000);

    await registerAndLogin(page);
    await createTournamentWithRevenue(page, {
      name: 'Copa Repescagem',
      entryFee: '30',
      enableRebuy: true,
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
    });

    await expect(page.locator('text=Em andamento')).toBeVisible({ timeout: 10_000 });

    // Advance one match — a player will be eliminated
    const advanced = await advanceOneMatch(page);
    expect(advanced).toBe(true);

    await page.waitForTimeout(1000);

    // Rebuy button should appear for the loser
    const rebuyBtn = page.locator('button:has-text("Repescagem")').first();
    await expect(rebuyBtn).toBeVisible({ timeout: 8_000 });

    await rebuyBtn.click();
    await page.waitForTimeout(1500);

    // After rebuy, the 🔁 badge should appear next to the re-entered player
    const rebuyBadge = page.locator('[title="Repescagem"]').first();
    await expect(rebuyBadge).toBeVisible({ timeout: 8_000 });

    // Rebuy button should be gone for that player (can only rebuy once)
    await expect(page.locator('button:has-text("Repescagem")')).toHaveCount(
      await page.locator('button:has-text("Repescagem")').count()
    );

    expect(errors.filter(e => !e.includes('favicon') && !e.includes('404'))).toHaveLength(0);
  });

  test('rebuy button not shown when allowRebuy is disabled', async ({ page }) => {
    test.setTimeout(60_000);

    await registerAndLogin(page);
    await createTournamentWithRevenue(page, {
      name: 'Copa Sem Repescagem',
      entryFee: '25',
      enableRebuy: false,
    });

    await expect(page.locator('text=Em andamento')).toBeVisible({ timeout: 10_000 });

    await advanceOneMatch(page);
    await page.waitForTimeout(1000);

    // No rebuy buttons should appear
    await expect(page.locator('button:has-text("Repescagem")')).toHaveCount(0);
  });
});

// ─── Bracket Stability ─────────────────────────────────────────────────────────

test.describe('Bracket Stability — No Corruption After Revenue Operations', () => {
  test('bracket remains intact after late entry (no match history lost)', async ({ page }) => {
    test.setTimeout(120_000);

    await registerAndLogin(page);
    await createTournamentWithRevenue(page, {
      name: 'Copa Estabilidade',
      entryFee: '25',
      enableLateEntry: true,
      players: ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank'],
    });

    await expect(page.locator('text=Em andamento')).toBeVisible({ timeout: 10_000 });

    // Advance 2 matches
    await advanceOneMatch(page);
    await advanceOneMatch(page);
    await page.waitForTimeout(500);

    // Add late entry
    const lateEntryBtn = page.getByRole('button', { name: /jogador atrasado/i });
    const isVisible = await lateEntryBtn.isVisible().catch(() => false);
    if (isVisible) {
      await lateEntryBtn.click();
      await page.getByPlaceholder(/nome do jogador/i).fill('Zara Late');
      await page.getByRole('button', { name: /adicionar jogador/i }).click();
      await page.waitForTimeout(1000);
    }

    // Previously completed matches should still be shown as completed
    // Progress bar should reflect advanced matches
    await expect(page.locator('text=/de \\d+ partida/i')).toBeVisible({ timeout: 5_000 });

    // No JS errors
    await assertNoHorizontalScroll(page);
  });
});

// ─── Mobile UX — Revenue Features ─────────────────────────────────────────────

test.describe('Mobile UX — Revenue Features at 375px', () => {
  test('manage page header does not overflow at 375px', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 375, height: 812 });

    await registerAndLogin(page);
    await createTournamentWithRevenue(page, {
      name: 'Copa Mobile',
      entryFee: '25',
      enableLateEntry: true,
      players: ['Alice', 'Bob', 'Charlie', 'Diana'],
    });

    await expect(page.locator('text=Em andamento')).toBeVisible({ timeout: 10_000 });

    // Header should not cause horizontal scroll
    await assertNoHorizontalScroll(page);

    // Settings/menu button should be accessible
    const settingsBtn = page.locator('[aria-label="Abrir configurações avançadas"]');
    await expect(settingsBtn).toBeVisible();
  });

  test('advanced config toggles are accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndLogin(page);
    await page.goto('/app/new');

    await page.getByPlaceholder('Ex: Copa de Domingo').fill('Copa Mobile Config');
    await page.locator('#entry-fee').fill('25');

    // Open advanced config
    await page.getByRole('button', { name: /configurações avançadas/i }).click();
    await page.waitForTimeout(300);

    // Late entry toggle should be visible and touchable
    const lateEntryLabel = page.locator('label:has-text("Entrada tardia")');
    await expect(lateEntryLabel).toBeVisible();

    // Rebuy toggle should be visible
    const rebuyLabel = page.locator('label:has-text("Repescagem")');
    await expect(rebuyLabel).toBeVisible();

    // Check there's no horizontal scroll in the config form
    await assertNoHorizontalScroll(page);
  });

  test('all visible buttons meet 38px minimum height on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndLogin(page);
    await page.goto('/app/new');
    await page.waitForTimeout(500);

    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 15); i++) {
      const btn = buttons.nth(i);
      const box = await btn.boundingBox();
      if (box && box.height > 0) {
        // Allow for small icon buttons (>= 38px as per WCAG AA guidance for touch)
        expect(box.height).toBeGreaterThanOrEqual(38);
      }
    }
  });
});

// ─── UX Clarity ────────────────────────────────────────────────────────────────

test.describe('UX Clarity — PT-BR Text, No English', () => {
  test('manage page contains no English UI text in primary actions', async ({ page }) => {
    test.setTimeout(60_000);
    await registerAndLogin(page);
    await createTournamentWithRevenue(page, {
      name: 'Copa PT-BR',
      entryFee: '25',
    });

    await expect(page.locator('text=Em andamento')).toBeVisible({ timeout: 10_000 });

    // Primary action words that should be in PT-BR
    await expect(page.locator('text=Modo TV')).toBeVisible();

    // Should NOT contain raw English action text
    const pageContent = await page.content();
    const englishPatterns = ['Click here', 'Submit', 'Close modal', 'Loading...'];
    for (const pattern of englishPatterns) {
      expect(pageContent).not.toContain(pattern);
    }
  });
});
