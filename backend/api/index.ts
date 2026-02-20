import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../src/app.js';

// Vercel Serverless Function Handler

type App = Awaited<ReturnType<typeof buildApp>>;

let app: App | null = null;

async function getApp(): Promise<App> {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const fastify = await getApp();
  const requestUrl = req.url && req.url.length > 0 ? req.url : '/';

  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      normalizedHeaders[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      normalizedHeaders[key] = value.join(', ');
    }
  }

  const payload =
    req.body == null
      ? undefined
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

  const response = await fastify.inject({
    method: req.method as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE'
      | 'OPTIONS'
      | 'HEAD',
    url: requestUrl,
    headers: normalizedHeaders,
    payload,
  });

  res.status(response.statusCode);

  const headers = response.headers;
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      res.setHeader(key, value as string);
    }
  }

  res.send(response.body);
}
