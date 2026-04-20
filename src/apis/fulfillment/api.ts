/**
 * Fulfillment API
 *
 * Fetches all fulfillment pages from the CheckoutChamp proxy.
 */

import { PROXY, PROXY_HEADERS } from '../checkoutchamp/api';
import type { FulfillmentRecord } from './types';

/**
 * Fetch all fulfillment records across all pages for a date range.
 */
export async function fetchAllFulfillments(
  startDate: string,
  endDate: string
): Promise<FulfillmentRecord[]> {
  const resultsPerPage = 200;
  const allData: FulfillmentRecord[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const params = new URLSearchParams({
      startDate,
      endDate,
      resultsPerPage: String(resultsPerPage),
      page: String(page),
    });

    const res = await fetch(`${PROXY}/fulfillment/query?${params.toString()}`, {
      headers: PROXY_HEADERS,
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const json = (await res.json()) as {
      result: string;
      message: { totalResults: number; data: FulfillmentRecord[] };
    };

    if (json.result !== 'SUCCESS') {
      throw new Error('CheckoutChamp API error');
    }

    const msg = json.message;
    totalPages = Math.ceil(msg.totalResults / resultsPerPage);
    allData.push(...(msg.data || []));
    page++;
  }

  return allData;
}
