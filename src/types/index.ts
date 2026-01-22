// ============================================
// ENROUTE Release Calendar - Type Definitions
// ============================================

// Brand Units
export type BrandUnit = 'ENROUTE.CC' | 'ENROUTE.RUN';

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
  title: string;
  type: ReleaseType;
  release_date: string;
  release_time?: string;
  status: ReleaseStatus;
  summary: string;
  tags: string[];
  assets: Asset[];
  line_items?: LineItem[]; // Products in this release
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
