/**
 * POST /api/checkoutchamp/fulfillment
 *
 * Server-side proxy for CheckoutChamp fulfillment/query API.
 * Credentials never reach the browser.
 * Accepts { startDate, endDate } and fetches ALL pages.
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  CHECKOUTCHAMP_LOGIN_ID: string;
  CHECKOUTCHAMP_PASSWORD: string;
  JWT_SECRET: string;
}

const RESULTS_PER_PAGE = 200;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Authenticate
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let startDate: string;
  let endDate: string;
  try {
    const body = (await request.json()) as { startDate?: string; endDate?: string };
    startDate = body.startDate || '';
    endDate = body.endDate || '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!startDate || !endDate) {
    return new Response(JSON.stringify({ error: 'startDate and endDate are required (MM/DD/YY)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch all pages from CheckoutChamp
  const allData: unknown[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const params = new URLSearchParams({
      loginId: env.CHECKOUTCHAMP_LOGIN_ID,
      password: env.CHECKOUTCHAMP_PASSWORD,
      startDate,
      endDate,
      resultsPerPage: String(RESULTS_PER_PAGE),
      page: String(page),
    });

    const res = await fetch('https://api.checkoutchamp.com/fulfillment/query/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const json = (await res.json()) as {
      result: string;
      message: {
        totalResults: number;
        data: unknown[];
      };
    };

    if (json.result !== 'SUCCESS') {
      return new Response(JSON.stringify({ error: 'CheckoutChamp API error', details: json }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const msg = json.message;
    totalPages = Math.ceil(msg.totalResults / RESULTS_PER_PAGE);
    allData.push(...(msg.data || []));
    page++;
  }

  return new Response(JSON.stringify({ result: 'SUCCESS', totalResults: allData.length, data: allData }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
