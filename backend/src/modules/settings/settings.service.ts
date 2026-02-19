import { prisma } from '../../shared/database/prisma.js';
import { isValidSlug } from '../../utils/slug.js';

export interface Settings {
  publicSlug: string | null;
  isPublicProfileEnabled: boolean;
  showFinancials: boolean;
}

export interface SettingsInput {
  publicSlug?: string;
  isPublicProfileEnabled?: boolean;
  showFinancials?: boolean;
}

export async function getSettings(organizerId: string): Promise<Settings> {
  const organizer = await prisma.organizer.findUniqueOrThrow({
    where: { id: organizerId },
    select: {
      publicSlug: true,
      isPublicProfileEnabled: true,
      showFinancials: true,
    },
  });
  return organizer;
}

export async function updateSettings(
  organizerId: string,
  data: SettingsInput
): Promise<Settings> {
  if (data.publicSlug !== undefined) {
    if (!isValidSlug(data.publicSlug)) {
      throw new SettingsError(
        'Slug invalido. Use apenas letras minusculas, numeros e hifens (3-50 caracteres).',
        400
      );
    }

    const existing = await prisma.organizer.findUnique({
      where: { publicSlug: data.publicSlug },
      select: { id: true },
    });

    if (existing && existing.id !== organizerId) {
      throw new SettingsError('Este slug ja esta em uso', 409);
    }
  }

  const organizer = await prisma.organizer.update({
    where: { id: organizerId },
    data: {
      ...(data.publicSlug !== undefined && { publicSlug: data.publicSlug }),
      ...(data.isPublicProfileEnabled !== undefined && {
        isPublicProfileEnabled: data.isPublicProfileEnabled,
      }),
      ...(data.showFinancials !== undefined && {
        showFinancials: data.showFinancials,
      }),
    },
    select: {
      publicSlug: true,
      isPublicProfileEnabled: true,
      showFinancials: true,
    },
  });

  return organizer;
}

export class SettingsError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'SettingsError';
  }
}
