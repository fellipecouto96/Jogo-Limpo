import { useParams } from 'react-router-dom';
import { useBracketData } from './useBracketData.ts';
import { TvLayout } from './layouts/TvLayout.tsx';
import { MobileLayout } from './layouts/MobileLayout.tsx';

interface TournamentPublicViewProps {
  mode: 'tv' | 'mobile';
}

export function TournamentPublicView({ mode }: TournamentPublicViewProps) {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { data, error, isLoading } = useBracketData(tournamentId!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-2xl">Carregando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-2xl">
          {error ?? 'Torneio nao encontrado'}
        </p>
      </div>
    );
  }

  const Layout = mode === 'tv' ? TvLayout : MobileLayout;

  return <Layout data={data} />;
}
