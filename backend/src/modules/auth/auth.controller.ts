import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  registerOrganizer,
  loginOrganizer,
  AuthError,
} from './auth.service.js';

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
      return reply.status(err.statusCode).send({ error: err.message });
    }
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
      return reply.status(err.statusCode).send({ error: err.message });
    }
    throw err;
  }
}
