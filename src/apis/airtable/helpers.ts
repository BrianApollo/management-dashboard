/**
 * Shared Airtable fetch helpers.
 * Replaces the copy-pasted do-while(offset) pagination pattern.
 */

import { airtableFetch } from './api';
import type { AirtableRecord, AirtableResponse } from './types';

/**
 * Fetch ALL records from an Airtable table, handling pagination automatically.
 * @param tableOrUrl - Table name (e.g. 'Products') or full path with params
 * @param options.fields - Restrict the response to these field names (Airtable `fields[]=` filter)
 * @param options.onPage - Called with each page of records as it arrives, for progressive UI
 */
export async function fetchAllAirtableRecords(
  tableOrUrl: string,
  options?: {
    baseId?: string;
    fields?: string[];
    onPage?: (records: AirtableRecord[]) => void;
  }
): Promise<AirtableRecord[]> {
  const { baseId, fields, onPage } = options ?? {};

  let baseUrl = tableOrUrl;
  if (fields && fields.length > 0) {
    const fieldsQuery = fields
      .map((f) => `fields%5B%5D=${encodeURIComponent(f)}`)
      .join('&');
    baseUrl += `${baseUrl.includes('?') ? '&' : '?'}${fieldsQuery}`;
  }

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = offset
      ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}offset=${offset}`
      : baseUrl;
    const response = await airtableFetch(url, { baseId });
    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    onPage?.(data.records);
    offset = data.offset;
  } while (offset);
  return allRecords;
}
