export interface MidRecord {
  id: string;
  name: string;
  statement_descriptor: string;
  mid: string;
  gateway_id: string;
  caid: string;
  bin: string;
  mcc: string;
}

export interface MidCheckRecord {
  id: string;
  date: string;
  midIds: string[];
  type: string;
  data: string;
  dataTooltip: string;
  screenshotUrls: string[];
}
