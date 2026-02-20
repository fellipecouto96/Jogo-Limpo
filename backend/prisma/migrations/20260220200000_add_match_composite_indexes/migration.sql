-- Composite index for the "anyUnfinished" check in recordMatchResult
-- Speeds up: tx.match.findFirst({ where: { roundId, winnerId: null } })
CREATE INDEX IF NOT EXISTS "matches_round_id_winner_id_idx"
  ON "matches"("round_id", "winner_id");

-- Composite index for the downstream match lookup
-- Speeds up: tx.match.findFirst({ where: { tournamentId, positionInBracket } })
CREATE INDEX IF NOT EXISTS "matches_tournament_id_position_idx"
  ON "matches"("tournament_id", "position_in_bracket");
