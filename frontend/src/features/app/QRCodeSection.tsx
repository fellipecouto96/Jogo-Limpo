import { useState, useEffect } from 'react';
import {
  generateQRSvg,
  generateQRDataUrl,
  downloadDataUrl,
} from '../../shared/qrcode.ts';
import { logClientError } from '../../shared/logger.ts';
import { QRLoadingPlaceholder } from '../../shared/loading/LoadingSystem.tsx';

interface QRCodeSectionProps {
  slug: string;
  organizerName: string;
}

export function QRCodeSection({ slug, organizerName }: QRCodeSectionProps) {
  const [svgHtml, setSvgHtml] = useState('');
  const publicUrl = `${window.location.origin}/organizer/${slug}`;

  useEffect(() => {
    generateQRSvg(publicUrl)
      .then(setSvgHtml)
      .catch(() => {
        logClientError('qr_access', 'QR SVG generation failed', { slug });
      });
  }, [publicUrl, slug]);

  async function handleDownloadPng() {
    try {
      const dataUrl = await generateQRDataUrl(publicUrl, 1024);
      downloadDataUrl(dataUrl, `qrcode-${slug}.png`);
    } catch {
      logClientError('qr_access', 'QR PNG download failed', { slug });
    }
  }

  function handleOpenPrint() {
    window.open(
      `/print/qr/${slug}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Confira os torneios de ${organizerName} no Jogo Limpo!\n${publicUrl}`
  )}`;

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="font-display text-xl text-white mb-4">
        Divulgar torneios
      </h2>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* QR preview */}
        <div className="shrink-0 rounded-xl bg-white p-3 w-40 h-40 flex items-center justify-center">
          {svgHtml ? (
            <div
              className="jl-fade-in w-full h-full [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          ) : (
            <QRLoadingPlaceholder className="h-full w-full" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 flex-1 w-full sm:w-auto">
          <p className="text-sm text-gray-400 break-all">{publicUrl}</p>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 [touch-action:manipulation]"
          >
            <DownloadIcon />
            Baixar QR Code (PNG)
          </button>

          <button
            type="button"
            onClick={handleOpenPrint}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 text-sm font-semibold text-white transition hover:bg-gray-700 [touch-action:manipulation]"
          >
            <PrintIcon />
            Baixar versao para impressao (PDF)
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-semibold text-white transition hover:bg-green-500 [touch-action:manipulation]"
          >
            <WhatsAppIcon />
            Compartilhar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
