import { useState, useEffect } from 'react';
import {
  generateQRSvg,
  generateQRDataUrl,
  downloadDataUrl,
} from '../../shared/qrcode.ts';
import { logClientError } from '../../shared/logger.ts';

interface TournamentQRModalProps {
  tournamentSlug: string;
  tournamentName: string;
  tournamentDate: string | null;
  onClose: () => void;
}

export function TournamentQRModal({
  tournamentSlug,
  tournamentName,
  tournamentDate,
  onClose,
}: TournamentQRModalProps) {
  const [svgHtml, setSvgHtml] = useState('');
  const publicUrl = `${window.location.origin}/tournament/${tournamentSlug}`;

  useEffect(() => {
    generateQRSvg(publicUrl)
      .then(setSvgHtml)
      .catch(() => {
        logClientError('qr_access', 'QR SVG generation failed', { tournamentSlug });
      });
  }, [publicUrl, tournamentSlug]);

  async function handleDownload() {
    try {
      const dataUrl = await generateQRDataUrl(publicUrl, 1024);
      downloadDataUrl(dataUrl, `qrcode-torneio-${tournamentSlug}.png`);
    } catch {
      logClientError('qr_access', 'QR PNG download failed', { tournamentSlug });
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Confira o torneio aqui: ${publicUrl}`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="mx-auto mt-16 w-full max-w-sm rounded-3xl border border-gray-700 bg-[#0b1120] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.65)]">
        <h3 className="mb-1 text-xl font-semibold text-white">
          QR Code do Torneio
        </h3>
        <p className="mb-4 text-sm text-gray-400 truncate">{tournamentName}</p>
        {tournamentDate && (
          <p className="-mt-3 mb-4 text-xs text-gray-500">
            {formatDate(tournamentDate)}
          </p>
        )}

        <div className="mx-auto mb-4 w-48 h-48 rounded-xl bg-white p-3 flex items-center justify-center">
          {svgHtml ? (
            <div
              className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          ) : (
            <div className="relative w-full h-full rounded flex items-center justify-center">
              <div className="absolute inset-0 bg-gray-100 animate-pulse rounded" />
              <p className="relative text-[11px] font-medium text-gray-500">
                Preparando QR Code
              </p>
            </div>
          )}
        </div>

        <p className="mb-4 text-center text-xs text-gray-500 break-all">
          {publicUrl}
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 [touch-action:manipulation]"
          >
            Baixar QR Code (PNG)
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-green-600 text-sm font-semibold text-white transition hover:bg-green-500 [touch-action:manipulation]"
          >
            Compartilhar no WhatsApp
          </a>
          <a
            href={`/print/tournament/${tournamentSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 [touch-action:manipulation]"
          >
            Versao para imprimir
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-gray-800 text-sm font-semibold text-white transition hover:bg-gray-700 [touch-action:manipulation]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
