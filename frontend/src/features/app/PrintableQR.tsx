import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { generateQRDataUrl } from '../../shared/qrcode.ts';
import { usePublicProfile } from '../public-profile/usePublicProfile.ts';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { resolveGuidedSystemError } from '../../shared/systemErrors.ts';
import { logClientPerformance } from '../../shared/logger.ts';
import {
  LoadingAssistText,
  QRLoadingPlaceholder,
} from '../../shared/loading/LoadingSystem.tsx';

export function PrintableQR() {
  const startedAtRef = useRef<number | null>(null);
  const { slug } = useParams<{ slug: string }>();
  const { data, error, isLoading, refetch } = usePublicProfile(slug!);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const publicUrl = `${window.location.origin}/organizer/${slug}`;

  useEffect(() => {
    startedAtRef.current = performance.now();
  }, []);

  useEffect(() => {
    generateQRDataUrl(publicUrl, 1024).then(setQrDataUrl);
  }, [publicUrl]);

  useEffect(() => {
    if (qrDataUrl && data && !error) {
      const startedAt = startedAtRef.current ?? performance.now();
      const elapsedMs = performance.now() - startedAt;
      logClientPerformance('qr_perf', 'printable_profile_qr_load_ms', {
        durationMs: Number(elapsedMs.toFixed(2)),
        slug,
      });
      setTimeout(() => window.print(), 400);
    }
  }, [data, error, qrDataUrl, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-xs">
          <QRLoadingPlaceholder className="h-64 w-full" />
          <LoadingAssistText
            initialMessage="Preparando QR Code"
            className="mt-4 text-center text-sm text-gray-600"
            withVisibilityDelay={false}
          />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="mx-auto mt-12 max-w-lg">
          <GuidedErrorCard
            error={error ?? resolveGuidedSystemError({ context: 'public_link' })}
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  const organizerName = data.name;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <div className="min-h-screen bg-white flex items-center justify-center p-8 print:p-0">
        <div className="w-full max-w-[210mm] min-h-[297mm] bg-white flex flex-col items-center justify-center px-12 py-16 print:px-16 print:py-20">
          {/* Header: organizer name */}
          <p
            className="text-center text-gray-800 font-bold tracking-wide uppercase"
            style={{ fontSize: '1.5rem', letterSpacing: '0.08em' }}
          >
            {organizerName}
          </p>

          {/* Title */}
          <h1
            className="mt-8 text-center text-black font-bold leading-tight"
            style={{ fontSize: '2.5rem' }}
          >
            Acompanhe nossos torneios
          </h1>

          {/* QR Code */}
          <div className="mt-12 mb-12">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="jl-fade-in mx-auto"
                style={{ width: '280px', height: '280px' }}
              />
            ) : (
              <QRLoadingPlaceholder className="mx-auto h-[280px] w-[280px]" />
            )}
          </div>

          {/* URL */}
          <p
            className="text-center text-gray-500 break-all"
            style={{ fontSize: '0.875rem' }}
          >
            {publicUrl}
          </p>

          {/* Footer */}
          <p
            className="mt-12 text-center text-gray-600 leading-relaxed max-w-md"
            style={{ fontSize: '1.125rem' }}
          >
            Escaneie para ver chave, campeoes e proximos torneios
          </p>

          {/* Branding */}
          <p
            className="mt-auto pt-12 text-center text-gray-400"
            style={{ fontSize: '0.75rem' }}
          >
            Jogo Limpo
          </p>
        </div>
      </div>
    </>
  );
}
