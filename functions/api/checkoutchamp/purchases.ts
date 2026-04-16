/**
 * POST /api/checkoutchamp/purchases
 *
 * Server-side proxy for CheckoutChamp purchase/query API.
 * Fetches a SINGLE page (500 per page) and returns slim data + metadata.
 * The frontend handles pagination, progress, and aggregation.
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  CHECKOUTCHAMP_LOGIN_ID: string;
  CHECKOUTCHAMP_PASSWORD: string;
  JWT_SECRET: string;
}

interface RawPurchase {
  price: string;
  billingCycleNumber: number;
  merchant: string;
  merchantId: string;
  descriptor: string;
  status: string;
}

function slim(r: RawPurchase) {
  return {
    price: r.price,
    cycle: r.billingCycleNumber,
    merchant: r.merchant || r.descriptor || `MID ${r.merchantId}`,
    merchantId: r.merchantId,
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let startDate: string;
  let endDate: string;
  let page: number;
  try {
    const body = (await request.json()) as { startDate?: string; endDate?: string; page?: number };
    startDate = body.startDate || '';
    endDate = body.endDate || '';
    page = body.page || 1;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!startDate || !endDate) {
    return new Response(JSON.stringify({ error: 'startDate and endDate required (MM/DD/YY)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({
    loginId: env.CHECKOUTCHAMP_LOGIN_ID,
    password: env.CHECKOUTCHAMP_PASSWORD,
    dateRangeType: 'nextBillDate',
    startDate,
    endDate,
    resultsPerPage: '200',
    page: String(page),
  });

  const res = await fetch('https://api.checkoutchamp.com/purchase/query/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const json = (await res.json()) as {
    result: string;
    message: { totalResults: number; data: RawPurchase[] };
  };

  if (json.result !== 'SUCCESS') {
    return new Response(JSON.stringify({ error: 'CheckoutChamp API error', details: json }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const msg = json.message;
  const totalPages = Math.ceil(msg.totalResults / 200);

  return new Response(
    JSON.stringify({
      totalResults: msg.totalResults,
      totalPages,
      page,
      data: (msg.data || []).map(slim),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
