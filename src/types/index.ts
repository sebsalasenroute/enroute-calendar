// ============================================
// ENROUTE Release Calendar - Type Definitions
// ============================================

// Brand Units
export type BrandUnit = 'ENROUTE.CC' | 'ENROUTE.RUN';

// Unified Order Type for the new upload wizard
export type OrderType = 'preorder' | 'restock' | 'onetime';

// Order Status (unified)
export type OrderStatus =
  | 'Draft'
  | 'Placed'
  | 'In Transit'
  | 'Customs'
  | 'Received Partial'
  | 'Received Complete'
  | 'Cancelled';

// Unified Order Interface for new upload flow
export interface Order {
  id: string;
  order_type: OrderType;
  brand_unit: BrandUnit;
  brand: string;
  collection_name: string;
  vendor: string;
  po_number?: string;
  sku?: string;
  quantity: number;
  unit_cost: number;
  currency: Currency;
  payment_terms: PaymentTerms;
  notes?: string;
  assets: Asset[];
  line_items: LineItem[];
  status: OrderStatus;
  created_at: string;
  updated_at: string;

  // Common dates
  expected_ship_date?: string;
  expected_arrival_date?: string;

  // Pre-order specific
  preorder_open_date?: string;
  preorder_close_date?: string;
  est_delivery_window_start?: string;
  est_delivery_window_end?: string;
  deposit_percentage?: number;
  expected_payout_date?: string;

  // Re-stock specific
  order_date?: string;
  eta_window_start?: string;
  eta_window_end?: string;
  warehouse_location?: string;
  receiving_date?: string;

  // One-time order specific
  due_date?: string;
  payment_date?: string;
}

// Order with computed totals
export interface OrderWithTotals extends Order {
  total_units: number;
  total_cost: number;
  total_value: number;
  total_skus: number;
}

// Release Types
export type ReleaseType = 'Drop' | 'Restock' | 'Preorder' | 'Collaboration' | 'Event';

// Release Status
export type ReleaseStatus = 'Draft' | 'Confirmed' | 'Delayed' | 'Landed' | 'Cancelled';

// Inbound Order Status
export type InboundStatus = 
  | 'Placed' 
  | 'In Transit' 
  | 'Customs' 
  | 'Received Partial' 
  | 'Received Complete' 
  | 'Cancelled';

// Currency
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'CAD';

// Payment Terms
export type PaymentTerms = 'Prepaid' | 'COD' | 'Net-15' | 'Net-30' | 'Net-45' | 'Net-60' | 'Net-90';

// Asset Types - Extended to support both links and files
export type AssetType = 'drive' | 'figma' | 'shopify' | 'lookbook' | 'instagram' | 'image' | 'pdf' | 'file' | 'other';

// Asset - Can be a link OR an uploaded file
export interface Asset {
  id: string;
  label: string;
  type: AssetType;
  // For links
  url?: string;
  // For uploaded files
  file_name?: string;
  file_type?: string;
  file_size?: number;
  file_data?: string; // Base64 encoded for small files, or reference ID for large files
  uploaded_at?: string;
}

// Line Item for Inbound Orders
export interface LineItem {
  id: string;
  sku?: string;
  vendor_sku?: string;
  product_name: string;
  variant_title?: string;
  size?: string;
  color?: string;
  material?: string;
  qty: number;
  unit_cost: number;
  unit_retail?: number;
  barcode?: string;
  weight?: number;
  weight_unit?: 'kg' | 'lb' | 'g' | 'oz';
  hs_code?: string; // For customs
  country_of_origin?: string;
}

// Release
export interface Release {
  id: string;
  brand_unit: BrandUnit;
  brand?: string; // Product brand (e.g., MAAP, Nike) - auto-suggest from previous entries
  title: string;
  type: ReleaseType;
  release_date: string;
  release_time?: string;
  status: ReleaseStatus;
  summary: string;
  tags: string[];
  assets: Asset[];
  line_items?: LineItem[]; // Products in this release
  payment_terms?: PaymentTerms; // Payment terms for this release
  projected_revenue?: number; // User-specified projected revenue for cash flow
  inventory_turnover_pct?: number; // Expected inventory turnover percentage (0-100)
  owner: string;
  created_at: string;
  updated_at: string;
}

// Inbound Order
export interface InboundOrder {
  id: string;
  brand_unit: BrandUnit;
  brand: string;
  collection_name: string;
  vendor: string;
  po_number: string;
  order_date?: string;
  eta_date: string;
  ship_date?: string;
  status: InboundStatus;
  currency: Currency;
  payment_terms: PaymentTerms; // Payment terms (default Net-30)
  shipping_method?: string;
  tracking_number?: string;
  assets: Asset[];
  line_items: LineItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Calculated totals for Inbound Order
export interface InboundOrderWithTotals extends InboundOrder {
  total_units: number;
  total_cost: number;
  total_value: number;
  total_skus: number;
}

// Calendar Event
export interface CalendarEvent {
  id: string;
  type: 'release' | 'inbound';
  date: string;
  title: string;
  brand_unit: BrandUnit;
  status: ReleaseStatus | InboundStatus;
  data: Release | InboundOrderWithTotals;
}

// Filter State
export interface FilterState {
  brand_unit?: BrandUnit | 'all';
  status?: string | 'all';
  type?: ReleaseType | 'all';
  vendor?: string | 'all';
  search?: string;
}

// Dashboard Stats
export interface DashboardStats {
  upcoming14: { releases: Release[]; inbounds: InboundOrderWithTotals[] };
  upcoming30: { releases: Release[]; inbounds: InboundOrderWithTotals[] };
  upcoming60: { releases: Release[]; inbounds: InboundOrderWithTotals[] };
  delayed: { releases: Release[]; inbounds: InboundOrderWithTotals[] };
  flagged: {
    missingETA: (Release | InboundOrder)[];
    missingAssets: Release[];
    missingValues: InboundOrder[];
  };
}

// File Upload Result
export interface FileUploadResult {
  success: boolean;
  data?: LineItem[];
  error?: string;
  warnings?: string[];
  summary?: {
    total_rows: number;
    valid_rows: number;
    skipped_rows: number;
    total_units: number;
    total_cost: number;
  };
}

// Supported file types for line item imports
export type ImportFileType = 'csv' | 'xlsx' | 'xls' | 'pdf';

// Cash Flow Entry
export interface CashFlowEntry {
  id: string;
  date: string; // Payment due date
  type: 'outflow' | 'inflow';
  category: 'inbound_payment' | 'release_revenue';
  amount: number;
  currency: Currency;
  description: string;
  reference: string; // PO number or release title
  source: InboundOrderWithTotals | Release;
}

// Monthly Cash Flow Summary
export interface MonthlyCashFlow {
  month: string; // YYYY-MM format
  monthLabel: string; // "January 2025"
  outflows: CashFlowEntry[];
  inflows: CashFlowEntry[];
  totalOutflow: number;
  totalInflow: number;
  netCashFlow: number;
}

// Calendar Export Event
export interface CalendarExportEvent {
  uid: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  url?: string;
}
