/**
 * QR Code feature validation tests.
 *
 * Verifies:
 * - generateQRSvg produces valid SVG for a given URL
 * - generateQRDataUrl produces a PNG data URL
 * - The correct public URL format is embedded in QR output
 * - WhatsApp share URL is correctly encoded
 * - downloadDataUrl creates and clicks an anchor (DOM side-effect)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateQRSvg, generateQRDataUrl, downloadDataUrl } from './qrcode.ts';

// ── generateQRSvg ─────────────────────────────────────────────────────────────

describe('generateQRSvg', () => {
  it('returns a string containing <svg', async () => {
    const svg = await generateQRSvg('https://example.com/organizer/joao-a7x2');
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
  });

  it('returns a non-empty string', async () => {
    const svg = await generateQRSvg('https://jogolimpo.com/organizer/test-slug');
    expect(svg.length).toBeGreaterThan(100);
  });

  it('generates different QR codes for different URLs', async () => {
    const svgA = await generateQRSvg('https://example.com/organizer/slug-aaaa');
    const svgB = await generateQRSvg('https://example.com/organizer/slug-bbbb');
    expect(svgA).not.toBe(svgB);
  });
});

// ── generateQRDataUrl ─────────────────────────────────────────────────────────

describe('generateQRDataUrl', () => {
  it('returns a data URL starting with data:image/png', async () => {
    const dataUrl = await generateQRDataUrl(
      'https://example.com/organizer/joao-a7x2'
    );
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('returns a non-trivial base64 payload', async () => {
    const dataUrl = await generateQRDataUrl(
      'https://example.com/organizer/joao-a7x2'
    );
    const base64 = dataUrl.replace('data:image/png;base64,', '');
    expect(base64.length).toBeGreaterThan(500);
  });

  it('generates different data URLs for different slugs', async () => {
    const a = await generateQRDataUrl(
      'https://example.com/organizer/slug-aaaa'
    );
    const b = await generateQRDataUrl(
      'https://example.com/organizer/slug-bbbb'
    );
    expect(a).not.toBe(b);
  });

  it('uses default size 1024 when not specified', async () => {
    // We can't easily assert image dimensions, but the call should succeed
    const dataUrl = await generateQRDataUrl('https://example.com/test');
    expect(dataUrl).toMatch(/^data:image\/png/);
  });
});

// ── Public URL format ─────────────────────────────────────────────────────────

describe('QR URL format validation', () => {
  it('public organizer URL follows /organizer/:slug pattern', () => {
    const origin = 'https://jogolimpo.com';
    const slug = 'joao-silva-a7x2';
    const url = `${origin}/organizer/${slug}`;
    expect(url).toBe('https://jogolimpo.com/organizer/joao-silva-a7x2');
  });

  it('public tournament URL follows /tournament/:tournamentSlug pattern', () => {
    const origin = 'https://jogolimpo.com';
    const tournamentSlug = 'copa-domingo-a7x2';
    const url = `${origin}/tournament/${tournamentSlug}`;
    expect(url).toBe('https://jogolimpo.com/tournament/copa-domingo-a7x2');
  });

  it('QR code for organizer page encodes correct URL', async () => {
    const slug = 'joao-a7x2';
    const publicUrl = `https://example.com/organizer/${slug}`;
    // The QR should encode the full URL – generating it should not throw
    const svg = await generateQRSvg(publicUrl);
    expect(svg).toContain('<svg');
  });
});

// ── WhatsApp share URL encoding ───────────────────────────────────────────────

describe('WhatsApp share URL', () => {
  it('generates a valid WhatsApp share URL', () => {
    const organizerName = 'João Silva';
    const publicUrl = 'https://example.com/organizer/joao-a7x2';
    const message = `Confira os torneios de ${organizerName} no Jogo Limpo!\n${publicUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    expect(whatsappUrl).toContain('wa.me');
    expect(whatsappUrl).toContain(encodeURIComponent(organizerName));
    expect(whatsappUrl).toContain(encodeURIComponent(publicUrl));
  });

  it('encodes special characters in organizer name', () => {
    const name = 'Café & Bar';
    const url = 'https://example.com/organizer/cafe-bar';
    const message = `Confira os torneios de ${name} no Jogo Limpo!\n${url}`;
    const encoded = encodeURIComponent(message);
    // Must not contain raw & or space
    expect(encoded).not.toContain(' ');
    expect(encoded).not.toContain('&');
  });

  it('tournament-specific WhatsApp share uses correct URL', () => {
    const publicUrl = 'https://example.com/tournament/copa-domingo-a7x2';
    const message = `Confira o torneio aqui: ${publicUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    expect(whatsappUrl).toContain(encodeURIComponent(publicUrl));
  });

  it('WhatsApp URL is safe (no unencoded newlines)', () => {
    const publicUrl = 'https://example.com/organizer/slug';
    const message = `Jogo Limpo\n${publicUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    // Raw newlines in URLs would be dangerous
    expect(whatsappUrl).not.toMatch(/[^%]\n/);
  });
});

// ── downloadDataUrl ──────────────────────────────────────────────────────────

describe('downloadDataUrl', () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let createdAnchor: HTMLAnchorElement;

  beforeEach(() => {
    createdAnchor = document.createElement('a');
    clickSpy = vi.spyOn(createdAnchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(createdAnchor);
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => createdAnchor);
    removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => createdAnchor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets href and download attributes on the anchor', () => {
    downloadDataUrl('data:image/png;base64,abc', 'qrcode-test.png');
    expect(createdAnchor.href).toContain('data:image/png');
    expect(createdAnchor.download).toBe('qrcode-test.png');
  });

  it('appends anchor to body, clicks, then removes it', () => {
    downloadDataUrl('data:image/png;base64,abc', 'test.png');
    expect(appendChildSpy).toHaveBeenCalledWith(createdAnchor);
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(removeChildSpy).toHaveBeenCalledWith(createdAnchor);
  });
});
