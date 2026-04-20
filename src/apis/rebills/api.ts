/**
 * Rebills / Purchases API
 *
 * Fetches purchase (rebill) data from the CheckoutChamp proxy.
 */

import { PROXY, PROXY_HEADERS } from '../checkoutchamp/api';
import type { RawPurchase, SlimRecord, PageResponse } from './types';

function slim(r: RawPurchase): SlimRecord {
  return {
    price: r.price,
    cycle: r.billingCycleNumber,
    merchant: r.merchant || r.descriptor || `MID ${r.merchantId}`,
    merchantId: r.merchantId,
  };
}

/**
 * Fetch a single page of purchase/rebill records.
 */
export async function fetchPurchasePage(
  startDate: string,
  endDate: string,
  page: number
): Promise<PageResponse> {
  const params = new URLSearchParams({
    dateRangeType: 'nextBillDate',
    startDate,
    endDate,
    resultsPerPage: '200',
    page: String(page),
  });

  const res = await fetch(`${PROXY}/purchase/query?${params.toString()}`, {
    headers: PROXY_HEADERS,
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    result: string;
    message: { totalResults: number; data: RawPurchase[] };
  };

  if (json.result !== 'SUCCESS') {
    throw new Error('CheckoutChamp API error');
  }

  const msg = json.message;
  const totalPages = Math.ceil(msg.totalResults / 200);

  return {
    totalResults: msg.totalResults,
    totalPages,
    page,
    data: (msg.data || []).map(slim),
  };
}
