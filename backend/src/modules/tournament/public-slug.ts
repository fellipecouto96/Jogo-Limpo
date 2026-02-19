import { generateSlug, isValidSlug } from '../../utils/slug.js';

const MAX_SLUG_ATTEMPTS = 20;
const FALLBACK_TOURNAMENT_NAME = 'torneio';

function createSlugCandidate(name: string): string {
  const candidate = generateSlug(name);
  if (isValidSlug(candidate)) return candidate;
  return generateSlug(FALLBACK_TOURNAMENT_NAME);
}

export async function generateUniqueTournamentSlug(
  tournamentName: string,
  isSlugTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = createSlugCandidate(tournamentName);
    const taken = await isSlugTaken(candidate);
    if (!taken) {
      return candidate;
    }
  }

  throw new Error('Nao foi possivel gerar um slug publico para o torneio');
}
