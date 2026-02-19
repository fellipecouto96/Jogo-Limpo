import { describe, it, expect } from 'vitest';
import { generateSlug, isValidSlug } from '../slug.js';

// ─── generateSlug ─────────────────────────────────────────────────────────────

describe('generateSlug', () => {
  it('lowercases ASCII names', () => {
    const slug = generateSlug('Joao');
    expect(slug).toMatch(/^joao-[a-z0-9]{4}$/);
  });

  it('strips accents (NFD normalization)', () => {
    const slug = generateSlug('João da Silva');
    expect(slug).toMatch(/^joao-da-silva-[a-z0-9]{4}$/);
  });

  it('converts spaces to hyphens', () => {
    const slug = generateSlug('Copa de Domingo');
    expect(slug).toMatch(/^copa-de-domingo-[a-z0-9]{4}$/);
  });

  it('collapses multiple consecutive spaces into one hyphen', () => {
    const slug = generateSlug('A  B');
    expect(slug).toMatch(/^a-b-[a-z0-9]{4}$/);
  });

  it('strips special characters', () => {
    const slug = generateSlug('Test & Club!');
    expect(slug).toMatch(/^test-club-[a-z0-9]{4}$/);
  });

  it('appends a 4-character alphanumeric suffix', () => {
    const slug = generateSlug('Ana');
    const suffix = slug.split('-').pop()!;
    expect(suffix).toHaveLength(4);
    expect(suffix).toMatch(/^[a-z0-9]+$/);
  });

  it('generates different slugs on repeated calls (randomness)', () => {
    const slugs = Array.from({ length: 10 }, () => generateSlug('Test'));
    const unique = new Set(slugs);
    // With 36^4 = 1.6M possibilities, collision probability is negligible
    expect(unique.size).toBeGreaterThan(1);
  });

  it('handles fully numeric names', () => {
    const slug = generateSlug('1234');
    expect(slug).toMatch(/^1234-[a-z0-9]{4}$/);
  });
});

// ─── isValidSlug ──────────────────────────────────────────────────────────────

describe('isValidSlug', () => {
  it('accepts canonical kebab-case slug', () => {
    expect(isValidSlug('joao-silva-a7x2')).toBe(true);
  });

  it('accepts all-lowercase alphanumeric', () => {
    expect(isValidSlug('abc123')).toBe(true);
  });

  it('accepts minimum length slug (3 chars)', () => {
    // regex: [a-z0-9] + {1,48} middle + [a-z0-9] = minimum 3 chars valid
    expect(isValidSlug('abc')).toBe(true);
  });

  it('rejects single-character slug', () => {
    expect(isValidSlug('a')).toBe(false);
  });

  it('rejects two-character slug', () => {
    expect(isValidSlug('ab')).toBe(false);
  });

  it('rejects slug starting with hyphen', () => {
    expect(isValidSlug('-joao-silva')).toBe(false);
  });

  it('rejects slug ending with hyphen', () => {
    expect(isValidSlug('joao-silva-')).toBe(false);
  });

  it('rejects slug with consecutive hyphens', () => {
    expect(isValidSlug('joao--silva')).toBe(false);
  });

  it('rejects uppercase letters', () => {
    expect(isValidSlug('Joao-Silva')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(isValidSlug('joao silva')).toBe(false);
  });

  it('rejects slug exceeding 50 characters', () => {
    const long = 'a'.repeat(51);
    expect(isValidSlug(long)).toBe(false);
  });

  // ── Security: injection resistance ─────────────────────────────────────────

  it('rejects SQL injection attempt', () => {
    expect(isValidSlug("'; DROP TABLE organizers; --")).toBe(false);
  });

  it('rejects XSS attempt', () => {
    expect(isValidSlug('<script>alert(1)</script>')).toBe(false);
  });

  it('rejects path traversal attempt', () => {
    expect(isValidSlug('../../../etc/passwd')).toBe(false);
  });

  it('rejects null bytes', () => {
    expect(isValidSlug('joao\x00silva')).toBe(false);
  });

  it('rejects URL-encoded characters', () => {
    expect(isValidSlug('joao%20silva')).toBe(false);
  });

  it('rejects slug with dot', () => {
    expect(isValidSlug('joao.silva')).toBe(false);
  });
});
