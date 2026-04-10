/**
 * Fulfillment API
 *
 * Fetches all fulfillment pages from the CheckoutChamp proxy.
 */

import { PROXY, PROXY_HEADERS } from '../checkoutchamp/client';

export interface FulfillmentItem {
  fulfillmentItemId: string;
  name: string;
  sku: string;
  qty: string;
  status: string;
  productId: string;
  rmaNumber: string;
}

export interface FulfillmentRecord {
  company: string;
  orderId: string;
  fulfillmentId: number;
  fulfillmentHouseId: number;
  dateShipped: string | null;
  dateDelivered: string | null;
  dateReturned: string | null;
  dateCreated: string;
  dateUpdated: string;
  dateExported: string;
  clientFulfillmentId: string;
  trackingNumber: string | null;
  isReshipment: number;
  shipCarrier: string | null;
  shipMethod: string | null;
  status: string;
  rmaNumber: string | null;
  campaignId: string;
  customerId: number;
  items: FulfillmentItem[];
}

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
