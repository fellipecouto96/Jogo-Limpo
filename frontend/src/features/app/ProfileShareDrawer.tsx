import { useEffect, useState } from 'react';
import {
  downloadDataUrl,
  generateQRDataUrl,
  generateQRSvg,
} from '../../shared/qrcode.ts';
import { QRLoadingPlaceholder } from '../../shared/loading/LoadingSystem.tsx';

interface ProfileShareDrawerProps {
  open: boolean;
  slug: string;
  organizerName: string;
  onClose: () => void;
}

export function ProfileShareDrawer({
  open,
  slug,
  organizerName,
  onClose,
}: ProfileShareDrawerProps) {
  const [svgHtml, setSvgHtml] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const publicUrl = `${window.location.origin}/organizer/${slug}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Confira os torneios de ${organizerName}: ${publicUrl}`
  )}`;

  useEffect(() => {
    if (!open) return;
    void generateQRSvg(publicUrl).then(setSvgHtml).catch(() => setSvgHtml(''));
  }, [open, publicUrl]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  async function handleDownloadPng() {
    if (downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await generateQRDataUrl(publicUrl, 1200);
      downloadDataUrl(dataUrl, `perfil-${slug}.png`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyFeedback('Link copiado.');
      window.setTimeout(() => setCopyFeedback(null), 1800);
    } catch {
      setCopyFeedback('Nao foi possivel copiar o link.');
      window.setTimeout(() => setCopyFeedback(null), 1800);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar painel de compartilhamento"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-gray-700 bg-[#050b1a] p-4 shadow-[0_16px_45px_rgba(0,0,0,0.35)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
              Compartilhamento
            </p>
            <h3 className="text-lg font-semibold text-white">Compartilhar perfil</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-gray-700 px-3 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
          >
            Fechar
          </button>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-[#0b1224] p-4">
          <div className="mx-auto mb-3 flex h-44 w-44 items-center justify-center rounded-xl bg-white p-2">
            {svgHtml ? (
              <div
                className="jl-fade-in h-full w-full [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            ) : (
              <QRLoadingPlaceholder className="h-full w-full" />
            )}
          </div>
          <p className="break-all text-center text-xs text-gray-400">{publicUrl}</p>
          {copyFeedback && (
            <p className="mt-2 text-center text-xs text-emerald-300">{copyFeedback}</p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Copiar link
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={downloading}
            className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            {downloading ? 'Preparando arquivo' : 'Baixar PNG'}
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(`/print/qr/${slug}`, '_blank', 'noopener,noreferrer')
            }
            className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Baixar PDF
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-full items-center justify-center rounded-lg bg-green-600 px-3 text-sm font-semibold text-white transition hover:bg-green-500"
          >
            Compartilhar WhatsApp
          </a>
        </div>
      </aside>
    </div>
  );
}
