import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/database/prisma.js';
import { generateSlug } from '../../utils/slug.js';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  organizer: {
    id: string;
    name: string;
    email: string;
    publicSlug: string | null;
  };
}

const SALT_ROUNDS = 10;

export async function registerOrganizer(
  input: RegisterInput
): Promise<AuthResult> {
  const { name, email, password } = input;

  if (!name.trim()) {
    throw new AuthError('Nome e obrigatorio', 400);
  }
  if (!email.trim()) {
    throw new AuthError('Email e obrigatorio', 400);
  }
  if (password.length < 6) {
    throw new AuthError('Senha deve ter pelo menos 6 caracteres', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.organizer.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new AuthError('Email ja cadastrado', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const trimmedName = name.trim();
  let organizer;

  for (let attempt = 0; attempt < 3; attempt++) {
    const publicSlug = generateSlug(trimmedName);
    try {
      organizer = await prisma.organizer.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          passwordHash,
          publicSlug,
        },
      });
      break;
    } catch (err: unknown) {
      const isUniqueViolation =
        err instanceof Error &&
        err.message.includes('Unique constraint failed');
      if (!isUniqueViolation || attempt === 2) throw err;
    }
  }

  return {
    organizer: {
      id: organizer!.id,
      name: organizer!.name,
      email: organizer!.email,
      publicSlug: organizer!.publicSlug,
    },
  };
}

export async function loginOrganizer(
  input: LoginInput
): Promise<AuthResult> {
  const { email, password } = input;

  const normalizedEmail = email.trim().toLowerCase();

  const organizer = await prisma.organizer.findUnique({
    where: { email: normalizedEmail },
  });

  if (!organizer) {
    throw new AuthError('Email ou senha incorretos', 401);
  }

  const valid = await bcrypt.compare(password, organizer.passwordHash);
  if (!valid) {
    throw new AuthError('Email ou senha incorretos', 401);
  }

  return {
    organizer: {
      id: organizer.id,
      name: organizer.name,
      email: organizer.email,
      publicSlug: organizer.publicSlug,
    },
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
