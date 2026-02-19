import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { generateQRDataUrl } from '../../shared/qrcode.ts';
import { usePublicProfile } from '../public-profile/usePublicProfile.ts';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import { resolveGuidedSystemError } from '../../shared/systemErrors.ts';

export function PrintableQR() {
  const { slug } = useParams<{ slug: string }>();
  const { data, error, isLoading, refetch } = usePublicProfile(slug!);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const publicUrl = `${window.location.origin}/organizer/${slug}`;

  useEffect(() => {
    generateQRDataUrl(publicUrl, 1024).then(setQrDataUrl);
  }, [publicUrl]);

  useEffect(() => {
    if (qrDataUrl && data && !error) {
      setTimeout(() => window.print(), 400);
    }
  }, [qrDataUrl, data, error]);

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
                className="mx-auto"
                style={{ width: '280px', height: '280px' }}
              />
            ) : (
              <div
                className="mx-auto bg-gray-200 animate-pulse"
                style={{ width: '280px', height: '280px' }}
              />
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
