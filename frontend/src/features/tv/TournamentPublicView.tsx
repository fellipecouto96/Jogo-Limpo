import { useParams } from 'react-router-dom';
import { useBracketData } from './useBracketData.ts';
import { TvLayout } from './layouts/TvLayout.tsx';
import { MobileLayout } from './layouts/MobileLayout.tsx';
import { GuidedErrorCard } from '../../shared/GuidedErrorCard.tsx';
import {
  parseGuidedSystemErrorText,
  resolveGuidedSystemError,
} from '../../shared/systemErrors.ts';

interface TournamentPublicViewProps {
  mode: 'tv' | 'mobile';
}

export function TournamentPublicView({ mode }: TournamentPublicViewProps) {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { data, error, isLoading, refetch } = useBracketData(tournamentId!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-2xl">Carregando...</p>
      </div>
    );
  }

  if (error || !data) {
    const guidedError = error
      ? parseGuidedSystemErrorText(error)
      : resolveGuidedSystemError({ context: 'public_link' });
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10">
        <div className="mx-auto w-full max-w-lg">
          <GuidedErrorCard error={guidedError} onRetry={refetch} />
        </div>
      </div>
    );
  }

  const Layout = mode === 'tv' ? TvLayout : MobileLayout;

  return <Layout data={data} />;
}
