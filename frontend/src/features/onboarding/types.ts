export interface OnboardingData {
  tournamentName: string;
  playerNames: string[];
  prizePool?: number;
}

export interface OnboardingResult {
  organizerId: string;
  tournamentId: string;
  playerIds: string[];
}
