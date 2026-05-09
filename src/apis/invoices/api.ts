import { fetchAllAirtableRecords } from '../airtable/helpers';
import type { AirtableRecord } from '../airtable/types';
import type { EcommXInvoiceRecord, InvoiceData } from '../../pages/invoices/ecommx/types';

const APOLLO_BASE_ID = 'appoitmhGafbWFz0E';
const ECOMMX_TABLE = 'EcommxInvoices';

const ECOMMX_FIELDS = [
  'invoice_id',
  'date',
  'invoice_number',
  'invoice_data',
  'inv_status',
  'invoice_pdf',
  'postage_file_matched',
];

function toRecord(r: AirtableRecord): EcommXInvoiceRecord {
  const f = r.fields;

  let invoiceData: InvoiceData | null = null;
  if (typeof f.invoice_data === 'string') {
    try {
      invoiceData = JSON.parse(f.invoice_data) as InvoiceData;
    } catch {
      invoiceData = null;
    }
  }

  return {
    id: r.id,
    invoice_id: (f.invoice_id as string) || '',
    date: (f.date as string) || '',
    invoice_number: (f.invoice_number as string) || '',
    invoice_data: invoiceData,
    inv_status: (f.inv_status as string) || null,
    invoice_pdf: (f.invoice_pdf as { url: string; filename: string }[]) || null,
    postage_file: (f.postage_file as { url: string; filename: string }[]) || null,
    sales_report_file: (f.sales_report_file as { url: string; filename: string }[]) || null,
    postage_file_matched: (f.postage_file_matched as { url: string; filename: string }[]) || null,
    payment_screenshot: (f.payment_screenshot as { url: string; filename: string }[]) || null,
  };
}

export async function fetchEcommXInvoices(
  options?: { onPage?: (page: EcommXInvoiceRecord[]) => void }
): Promise<EcommXInvoiceRecord[]> {
  const records = await fetchAllAirtableRecords(ECOMMX_TABLE, {
    baseId: APOLLO_BASE_ID,
    fields: ECOMMX_FIELDS,
    onPage: options?.onPage
      ? (raw) => options.onPage!(raw.map(toRecord))
      : undefined,
  });

  return records.map(toRecord);
}
