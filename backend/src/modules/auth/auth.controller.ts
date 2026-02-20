import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  registerOrganizer,
  loginOrganizer,
  AuthError,
} from './auth.service.js';
import { logEvent } from '../../shared/logging/log.service.js';
import { LOG_JOURNEYS } from '../../shared/logging/journeys.js';

interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
) {
  try {
    const { name, email, password } = request.body;

    const result = await registerOrganizer({ name, email, password });

    const token = request.server.jwt.sign({
      sub: result.organizer.id,
      email: result.organizer.email,
    });

    return reply.status(201).send({
      token,
      organizer: result.organizer,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.AUTH,
        message: err.message,
        metadata: { statusCode: err.statusCode, action: 'register' },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.AUTH,
      message: 'Unexpected register error',
      metadata: {
        action: 'register',
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}

export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  try {
    const { email, password } = request.body;

    const result = await loginOrganizer({ email, password });

    const token = request.server.jwt.sign({
      sub: result.organizer.id,
      email: result.organizer.email,
    });

    return reply.send({
      token,
      organizer: result.organizer,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      logEvent({
        level: 'WARN',
        journey: LOG_JOURNEYS.AUTH,
        message: err.message,
        metadata: { statusCode: err.statusCode, action: 'login' },
      });
      return reply.status(err.statusCode).send({ error: err.message });
    }
    logEvent({
      level: 'ERROR',
      journey: LOG_JOURNEYS.AUTH,
      message: 'Unexpected login error',
      metadata: {
        action: 'login',
        error: err instanceof Error ? err.message.substring(0, 200) : 'unknown_error',
      },
    });
    throw err;
  }
}
