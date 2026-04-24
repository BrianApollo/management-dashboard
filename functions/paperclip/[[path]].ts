/**
 * Paperclip API Proxy — /paperclip/[[path]]
 *
 * Forwards authenticated dashboard requests to the upstream paperclip API.
 * PAPERCLIP_API_TOKEN stays server-side; the client never sees it.
 */

import { authenticateRequest } from '../lib/auth';

interface Env {
  PAPERCLIP_UPSTREAM_URL: string;
  PAPERCLIP_API_TOKEN: string;
  JWT_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.PAPERCLIP_UPSTREAM_URL || !env.PAPERCLIP_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Paperclip proxy not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const segments = (params.path as string[] | undefined) ?? [];
  const subPath = segments.map(encodeURIComponent).join('/');
  const url = new URL(request.url);
  const base = env.PAPERCLIP_UPSTREAM_URL.replace(/\/$/, '');
  const targetUrl = `${base}/${subPath}${url.search}`;

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${env.PAPERCLIP_API_TOKEN}`);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const accept = request.headers.get('accept');
  if (accept) headers.set('Accept', accept);

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, init);

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('set-cookie');
  responseHeaders.delete('www-authenticate');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};
