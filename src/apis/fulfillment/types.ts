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
