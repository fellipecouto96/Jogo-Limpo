import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../src/app.js';

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

  const response = await fastify.inject({
    method: req.method as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH'
      | 'DELETE'
      | 'OPTIONS'
      | 'HEAD',
    url: req.url!,
    headers: req.headers as Record<string, string>,
    payload: req.body ? JSON.stringify(req.body) : undefined,
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
