import { prisma } from '../database/prisma.js';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEventInput {
  level: LogLevel;
  journey: string;
  userId?: string;
  tournamentId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'auth', 'hash'];

function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(meta).filter(([k]) =>
      !SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))
    )
  );
}

export function logEvent(input: LogEventInput): void {
  const environment = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
  const safe = sanitizeMetadata(input.metadata ?? {});
  const userId = input.userId ?? null;
  const tournamentId = input.tournamentId ?? null;
  const metadata = JSON.stringify(safe);

  prisma.$executeRaw`
    INSERT INTO system_logs (level, journey, user_id, tournament_id, message, metadata, environment)
    VALUES (
      ${input.level},
      ${input.journey},
      ${userId},
      ${tournamentId},
      ${input.message},
      ${metadata}::jsonb,
      ${environment}
    )
  `.catch((err: unknown) => {
    console.error('[log] Failed to write log:', err);
  });
}
