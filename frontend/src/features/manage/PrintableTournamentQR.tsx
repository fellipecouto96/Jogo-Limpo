import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { generateQRDataUrl } from '../../shared/qrcode.ts';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { resolveGuidedSystemError } from '../../shared/systemErrors.ts';
import { usePublicTournament } from '../public-profile/usePublicProfile.ts';
import { logClientPerformance } from '../../shared/logger.ts';

export function PrintableTournamentQR() {
  const mountStartedAt = useRef<number | null>(null);
  const { tournamentSlug } = useParams<{ tournamentSlug: string }>();
  const { data, error, isLoading, refetch } = usePublicTournament(tournamentSlug!);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const publicUrl = `${window.location.origin}/tournament/${tournamentSlug}`;

  useEffect(() => {
    mountStartedAt.current = performance.now();
  }, []);

  useEffect(() => {
    generateQRDataUrl(publicUrl, 1200).then(setQrDataUrl);
  }, [publicUrl]);

  useEffect(() => {
    if (qrDataUrl && data && !error) {
      const startedAt = mountStartedAt.current ?? performance.now();
      const elapsedMs = performance.now() - startedAt;
      logClientPerformance('qr_perf', 'printable_tournament_qr_load_ms', {
        durationMs: Number(elapsedMs.toFixed(2)),
        slug: tournamentSlug,
      });
      setTimeout(() => window.print(), 350);
    }
  }, [data, error, qrDataUrl, tournamentSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <p className="text-gray-500 text-base">Carregando...</p>
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

  const tournamentDate = data.tournament.startedAt ?? data.tournament.createdAt;

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
          <p
            className="text-center text-gray-700 font-semibold uppercase tracking-[0.24em]"
            style={{ fontSize: '1rem' }}
          >
            Torneio
          </p>

          <h1
            className="mt-2 text-center text-black font-bold leading-tight max-w-[16cm]"
            style={{ fontSize: '2.3rem' }}
          >
            {data.tournament.name}
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            {formatDate(tournamentDate)}
          </p>

          <div className="mt-10 mb-8">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code do torneio"
                className="mx-auto"
                style={{ width: '340px', height: '340px' }}
              />
            ) : (
              <div
                className="mx-auto bg-gray-200 animate-pulse"
                style={{ width: '340px', height: '340px' }}
              />
            )}
          </div>

          <p
            className="text-center text-gray-700 font-semibold"
            style={{ fontSize: '1.25rem' }}
          >
            Acompanhe a chave ao vivo
          </p>

          <p className="mt-4 text-center text-gray-500 break-all text-sm">
            {publicUrl}
          </p>
        </div>
      </div>
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
