import { fetchAllAirtableRecords } from '../airtable/helpers';
import type { MidRecord } from '../../pages/mids/overview/types';

const MIDS_TABLE = 'MIDs';

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
