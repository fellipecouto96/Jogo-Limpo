/**
 * Security tests for the settings service.
 *
 * Verifies that:
 * - Invalid slugs (injections, malformed) are rejected before reaching the DB
 * - Duplicate slug results in a 409 SettingsError
 * - Valid slugs pass validation and trigger the DB update
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: {
    organizer: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { updateSettings, getSettings, SettingsError } from '../settings.service.js';
import { prisma } from '../../../shared/database/prisma.js';

const mockFindUniqueOrThrow = vi.mocked(prisma.organizer.findUniqueOrThrow);
const mockFindUnique = vi.mocked(prisma.organizer.findUnique);
const mockUpdate = vi.mocked(prisma.organizer.update);

describe('getSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns settings for a valid organizer', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindUniqueOrThrow.mockResolvedValue({
      publicSlug: 'joao-a7x2',
      isPublicProfileEnabled: true,
      showFinancials: false,
    } as any);
    const result = await getSettings('org-1');
    expect(result.publicSlug).toBe('joao-a7x2');
    expect(result.isPublicProfileEnabled).toBe(true);
    expect(result.showFinancials).toBe(false);
  });
});

describe('updateSettings – slug validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects slug with consecutive hyphens', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: 'joao--silva' })
    ).rejects.toThrow(SettingsError);
  });

  it('rejects slug starting with hyphen', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: '-joao-silva' })
    ).rejects.toThrow(SettingsError);
  });

  it('rejects slug ending with hyphen', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: 'joao-silva-' })
    ).rejects.toThrow(SettingsError);
  });

  it('rejects empty string slug', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: '' })
    ).rejects.toThrow(SettingsError);
  });

  it('rejects slug shorter than 3 characters', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: 'ab' })
    ).rejects.toThrow(SettingsError);
  });

  it('rejects slug with uppercase letters', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: 'Joao-Silva' })
    ).rejects.toThrow(SettingsError);
  });

  it('rejects slug with spaces', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: 'joao silva' })
    ).rejects.toThrow(SettingsError);
  });

  // ── Security: injection-style slugs ──────────────────────────────────────

  it('rejects SQL injection slug', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: "'; DROP TABLE organizers;--" })
    ).rejects.toThrow(SettingsError);
  });

  it('rejects XSS slug', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: '<script>alert(1)</script>' })
    ).rejects.toThrow(SettingsError);
  });

  it('rejects path traversal slug', async () => {
    await expect(
      updateSettings('org-1', { publicSlug: '../../etc/passwd' })
    ).rejects.toThrow(SettingsError);
  });

  // ── Uniqueness ────────────────────────────────────────────────────────────

  it('rejects slug already taken by a different organizer (409)', async () => {
    mockFindUnique.mockResolvedValue({ id: 'org-OTHER' } as any);
    const err = await updateSettings('org-1', {
      publicSlug: 'taken-slug-ab12',
    }).catch((e) => e);
    expect(err).toBeInstanceOf(SettingsError);
    expect((err as SettingsError).statusCode).toBe(409);
  });

  it('allows organizer to keep their own slug (no conflict)', async () => {
    // Same organizer owns the slug – should succeed
    mockFindUnique.mockResolvedValue({ id: 'org-1' } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUpdate.mockResolvedValue({
      publicSlug: 'own-slug-ab12',
      isPublicProfileEnabled: true,
      showFinancials: false,
    } as any);
    const result = await updateSettings('org-1', { publicSlug: 'own-slug-ab12' });
    expect(result.publicSlug).toBe('own-slug-ab12');
  });

  it('updates toggle fields without touching slug', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUpdate.mockResolvedValue({
      publicSlug: 'joao-a7x2',
      isPublicProfileEnabled: false,
      showFinancials: true,
    } as any);
    const result = await updateSettings('org-1', {
      isPublicProfileEnabled: false,
      showFinancials: true,
    });
    expect(result.isPublicProfileEnabled).toBe(false);
    expect(result.showFinancials).toBe(true);
    // slug validation was NOT called (no findUnique for slug check)
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
