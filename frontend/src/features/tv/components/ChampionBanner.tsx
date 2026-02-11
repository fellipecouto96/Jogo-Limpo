import type { BracketPlayer } from '../types.ts';

interface ChampionBannerProps {
  champion: BracketPlayer;
}

export function ChampionBanner({ champion }: ChampionBannerProps) {
  return (
    <div className="mt-4 inline-block bg-emerald-500/20 border border-emerald-500 rounded-xl px-8 py-3">
      <span className="text-2xl font-bold text-emerald-400">
        &#127942; Campeao: {champion.name}
      </span>
    </div>
  );
}
