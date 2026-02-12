export interface OnboardingData {
  organizerName: string;
  tournamentName: string;
  playerNames: string[];
}

export interface OnboardingResult {
  organizerId: string;
  tournamentId: string;
  playerIds: string[];
}
