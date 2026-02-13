export interface OnboardingData {
  tournamentName: string;
  playerNames: string[];
  entryFee: string;
  organizerPercentage: string;
  championPercentage: string;
  runnerUpPercentage: string;
  thirdPlacePercentage: string;
  thirdPlaceEnabled: boolean;
}

export interface OnboardingResult {
  organizerId: string;
  tournamentId: string;
  playerIds: string[];
}
