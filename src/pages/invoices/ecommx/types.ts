// === Step 1: Invoice PDF ===

export interface InvoiceProduct {
  sku: string;
  group: string;
  rule: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface PackingLine {
  qty: number;
  price: number;
  total: number;
}

export interface Step1Invoice {
  source: string;
  number: number;
  date: string;
  date_range: string;
  products: Record<string, InvoiceProduct>;
  postage: number;
  sku1: PackingLine;
  sku2: PackingLine;
  returns?: PackingLine;
  total: number;
}

// === Step 2: Sales Report ===

export interface SalesReportProduct {
  name: string;
  qty: number;
  group: string;
}

export interface Step2SalesReport {
  source: string;
  products: Record<string, SalesReportProduct>;
  total_units: number;
  matches_invoice: boolean;
}

// === Step 3: Postage ===

export interface Step3Postage {
  source: string;
  total_orders: number;
  total_postage: number;
}

// === Step 4: Verification ===

export interface VerificationCheck {
  pass: boolean;
  [key: string]: unknown;
}

export interface Step4Verification {
  orders: VerificationCheck & { invoice: number; postage_file: number };
  postage: VerificationCheck & { invoice: number; postage_file: number; diff: number };
  grand_total: VerificationCheck & { invoice: number; calculated: number; diff: number };
  all_pass: boolean;
}

// === Step 5: Matching ===

export interface Step5Matching {
  source: string;
  total: number;
  direct: number;
  r_suffix: number;
  recovered: number;
  unmatched: number;
  all_matched: boolean;
}

// === Step 5b: SKU Comparison ===

export interface SkuComparison {
  original_order: number;
  fulfillment: number;
  invoice: number;
  in_range: boolean;
  status: 'OK' | 'OVER' | 'UNDER';
}

export interface Sku2Check {
  invoice_2nd_sku: number;
  cc_calculated: number;
  diff: number;
  note: string;
}

export interface Step5bSkuComparison {
  per_sku: Record<string, SkuComparison>;
  totals: {
    original_order: number;
    fulfillment: number;
    invoice: number;
    in_range: boolean;
  };
  sku2_check: Sku2Check;
  warnings: string[];
}

// === Step 6: Breakdown ===

export interface GroupBreakdown {
  orders: number;
  products: Record<string, { qty: number; unit_price: number; total: number }>;
  product_cost: number;
  shipping: number;
  packing_share: number;
  brand_total: number;
  avg_cogs: number;
}

export interface Step6Breakdown {
  groups: Record<string, GroupBreakdown>;
  packing: {
    sku1: PackingLine;
    sku2: PackingLine;
    total: number;
  };
  returns?: PackingLine;
}

// === Full invoice_data JSON ===

export interface InvoiceData {
  step_1_invoice: Step1Invoice;
  step_2_sales_report: Step2SalesReport;
  step_3_postage: Step3Postage;
  step_4_verification: Step4Verification;
  step_5_matching: Step5Matching;
  step_5b_sku_comparison: Step5bSkuComparison;
  step_6_breakdown: Step6Breakdown;
  order_matches: Record<string, string>;
}

// === Airtable record shape ===

export interface EcommXInvoiceRecord {
  id: string;
  invoice_id: string;
  date: string;
  invoice_number: string;
  invoice_data: InvoiceData | null;
  inv_status: string | null;
  invoice_pdf: { url: string; filename: string }[] | null;
  postage_file: { url: string; filename: string }[] | null;
  sales_report_file: { url: string; filename: string }[] | null;
  postage_file_matched: { url: string; filename: string }[] | null;
  payment_screenshot: { url: string; filename: string }[] | null;
}
