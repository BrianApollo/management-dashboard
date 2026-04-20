export interface RawPurchase {
  price: string;
  billingCycleNumber: number;
  merchant: string;
  merchantId: string;
  descriptor: string;
  status: string;
}

export interface SlimRecord {
  price: string;
  cycle: number;
  merchant: string;
  merchantId: string;
}

export interface PageResponse {
  totalResults: number;
  totalPages: number;
  page: number;
  data: SlimRecord[];
}
