import { fetchAllAirtableRecords } from '../airtable/helpers';
import type { MidCheckRecord, MidRecord } from '../../pages/mids/overview/types';

const MIDS_TABLE = 'MIDs';
const MID_CHECKS_TABLE = 'MID Checks';

export async function fetchMids(): Promise<MidRecord[]> {
  const records = await fetchAllAirtableRecords(MIDS_TABLE);

  return records.map((r) => {
    const f = r.fields;
    return {
      id: r.id,
      name: (f['Name'] as string) || '',
      statement_descriptor: (f['Statement Descriptor'] as string) || '',
      mid: (f['MID'] as string) || '',
      gateway_id: (f['Gateway ID'] as string) || '',
      caid: (f['CAID'] as string) || '',
      bin: (f['BIN'] as string) || '',
      mcc: (f['MCC'] as string) || '',
    };
  });
}

export async function fetchMidChecks(): Promise<MidCheckRecord[]> {
  const records = await fetchAllAirtableRecords(MID_CHECKS_TABLE);

  return records.map((r) => {
    const f = r.fields;
    const screenshots = (f['Screenshot'] as { url: string }[] | undefined) ?? [];
    return {
      id: r.id,
      date: (f['Date'] as string) || '',
      midIds: (f['MID'] as string[]) || [],
      type: (f['Type'] as string) || '',
      data: (f['Data'] as string) || '',
      dataTooltip: (f['Data Tooltip'] as string) || '',
      screenshotUrls: screenshots.map((s) => s.url).filter(Boolean),
    };
  });
}
