import { 
  format, 
  parseISO, 
  isToday, 
  isTomorrow, 
  isPast, 
  isFuture,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { 
  ReleaseStatus, 
  InboundStatus, 
  ReleaseType, 
  BrandUnit, 
  Currency,
  LineItem,
  FileUploadResult,
  AssetType,
} from '@/types';

// ============================================
// DATE UTILITIES
// ============================================

export function formatDate(dateStr: string, includeTime?: string): string {
  const date = parseISO(dateStr);
  let formatted = format(date, 'MMM d, yyyy');
  if (includeTime) formatted += ` at ${includeTime}`;
  return formatted;
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d');
}

export function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  const days = differenceInDays(date, new Date());
  if (days > 0 && days <= 7) return `In ${days} days`;
  if (days < 0 && days >= -7) return `${Math.abs(days)} days ago`;
  return format(date, 'MMM d');
}

export function getDaysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

export function isDatePast(dateStr: string): boolean {
  return isPast(parseISO(dateStr));
}

export function isDateFuture(dateStr: string): boolean {
  return isFuture(parseISO(dateStr));
}

// ============================================
// CALENDAR HELPERS
// ============================================

export function getCalendarDays(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

export function getNextMonth(date: Date): Date {
  return addMonths(date, 1);
}

export function getPrevMonth(date: Date): Date {
  return subMonths(date, 1);
}

export function isSameMonthAs(date1: Date, date2: Date): boolean {
  return isSameMonth(date1, date2);
}

export function isSameDayAs(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

// ============================================
// CURRENCY & NUMBER FORMATTING
// ============================================

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  CAD: 'C$',
};

export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  const symbol = currencySymbols[currency];
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function parseNumber(value: string): number {
  const cleaned = value.replace(/[,$\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ============================================
// STATUS & BADGE STYLING
// ============================================

type BadgeStyle = { className: string };

export const releaseStatusStyles: Record<ReleaseStatus, BadgeStyle> = {
  Draft: { className: 'badge-neutral' },
  Confirmed: { className: 'badge-success' },
  Delayed: { className: 'badge-warning' },
  Landed: { className: 'badge-info' },
  Cancelled: { className: 'badge-error' },
};

export const inboundStatusStyles: Record<InboundStatus, BadgeStyle> = {
  'Placed': { className: 'badge-neutral' },
  'In Transit': { className: 'badge-info' },
  'Customs': { className: 'badge-warning' },
  'Received Partial': { className: 'badge-warning' },
  'Received Complete': { className: 'badge-success' },
  'Cancelled': { className: 'badge-error' },
};

export const releaseTypeStyles: Record<ReleaseType, BadgeStyle> = {
  Drop: { className: 'badge-purple' },
  Restock: { className: 'badge-teal' },
  Preorder: { className: 'badge-blue' },
  Collaboration: { className: 'badge-pink' },
  Event: { className: 'badge-orange' },
};

export const brandUnitStyles: Record<BrandUnit, BadgeStyle> = {
  'ENROUTE.CC': { className: 'badge-dark' },
  'ENROUTE.RUN': { className: 'badge-orange' },
};

// ============================================
// ASSET TYPE ICONS & LABELS
// ============================================

export const assetTypeConfig: Record<AssetType, { icon: string; label: string }> = {
  drive: { icon: '📁', label: 'Google Drive' },
  figma: { icon: '🎨', label: 'Figma' },
  shopify: { icon: '🛒', label: 'Shopify' },
  lookbook: { icon: '📖', label: 'Lookbook' },
  instagram: { icon: '📷', label: 'Instagram' },
  image: { icon: '🖼️', label: 'Image' },
  pdf: { icon: '📄', label: 'PDF' },
  file: { icon: '📎', label: 'File' },
  other: { icon: '🔗', label: 'Link' },
};

// ============================================
// FILE PARSING - CSV
// ============================================

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parse header row - handle quoted values
  const parseRow = (row: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };
  
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.replace(/^["']|["']$/g, '') || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// ============================================
// FILE PARSING - EXCEL (XLSX)
// ============================================

export async function parseExcel(file: File): Promise<Record<string, string>[]> {
  // Dynamic import of xlsx library
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
        
        if (jsonData.length < 2) {
          resolve([]);
          return;
        }
        
        const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
        const rows: Record<string, string>[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = String(jsonData[i][idx] ?? '');
          });
          rows.push(row);
        }
        
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ============================================
// COLUMN MAPPING - Map various header names to our standard fields
// ============================================

const columnMappings: Record<string, string[]> = {
  sku: ['sku', 'our sku', 'internal sku', 'item sku', 'product sku', 'style number', 'style #', 'style'],
  vendor_sku: ['vendor sku', 'vendor_sku', 'supplier sku', 'factory sku', 'manufacturer sku', 'mfr sku'],
  product_name: ['product name', 'product_name', 'product', 'name', 'description', 'title', 'item', 'item name', 'item description'],
  variant_title: ['variant', 'variant title', 'variant_title', 'option'],
  size: ['size', 'sz', 'sizes'],
  color: ['color', 'colour', 'col', 'colors'],
  material: ['material', 'fabric', 'composition'],
  qty: ['qty', 'quantity', 'units', 'order qty', 'order quantity', 'amount', 'count'],
  unit_cost: ['unit cost', 'unit_cost', 'cost', 'price', 'unit price', 'wholesale', 'wholesale price', 'cost price', 'fob'],
  unit_retail: ['unit retail', 'unit_retail', 'retail', 'rrp', 'msrp', 'retail price', 'srp', 'selling price'],
  barcode: ['barcode', 'upc', 'ean', 'gtin'],
  weight: ['weight', 'wt'],
  hs_code: ['hs code', 'hs_code', 'tariff code', 'hts'],
  country_of_origin: ['country of origin', 'origin', 'coo', 'made in'],
};

function mapColumn(header: string): string | null {
  const normalized = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(columnMappings)) {
    if (aliases.includes(normalized)) return field;
  }
  return null;
}

// ============================================
// LINE ITEM PARSING
// ============================================

export function parseLineItemsFromRows(rows: Record<string, string>[]): FileUploadResult {
  const items: LineItem[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const mappedRow: Record<string, string> = {};
    
    // Map columns to standard fields
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = mapColumn(key);
      if (mappedKey) {
        mappedRow[mappedKey] = value;
      }
    }
    
    // Extract values
    const productName = mappedRow.product_name || '';
    const qty = parseNumber(mappedRow.qty || '0');
    const unitCost = parseNumber(mappedRow.unit_cost || '0');
    
    // Skip rows without essential data
    if (!productName || qty <= 0) {
      skipped++;
      if (productName) {
        warnings.push(`Row ${i + 2}: Skipped "${productName}" - invalid quantity`);
      }
      continue;
    }
    
    const item: LineItem = {
      id: `li-${Date.now()}-${i}`,
      sku: mappedRow.sku || undefined,
      vendor_sku: mappedRow.vendor_sku || undefined,
      product_name: productName,
      variant_title: mappedRow.variant_title || undefined,
      size: mappedRow.size || undefined,
      color: mappedRow.color || undefined,
      material: mappedRow.material || undefined,
      qty,
      unit_cost: unitCost,
      unit_retail: mappedRow.unit_retail ? parseNumber(mappedRow.unit_retail) : undefined,
      barcode: mappedRow.barcode || undefined,
      weight: mappedRow.weight ? parseNumber(mappedRow.weight) : undefined,
      hs_code: mappedRow.hs_code || undefined,
      country_of_origin: mappedRow.country_of_origin || undefined,
    };
    
    items.push(item);
  }
  
  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const totalCost = items.reduce((sum, item) => sum + (item.qty * item.unit_cost), 0);
  
  return {
    success: items.length > 0,
    data: items,
    warnings: warnings.length > 0 ? warnings : undefined,
    summary: {
      total_rows: rows.length,
      valid_rows: items.length,
      skipped_rows: skipped,
      total_units: totalUnits,
      total_cost: totalCost,
    },
  };
}

// ============================================
// FILE UPLOAD HANDLER
// ============================================

export async function processUploadedFile(file: File): Promise<FileUploadResult> {
  const fileName = file.name.toLowerCase();
  
  try {
    let rows: Record<string, string>[] = [];
    
    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const text = await file.text();
      rows = parseCSV(text);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      rows = await parseExcel(file);
    } else if (fileName.endsWith('.pdf')) {
      // PDF parsing would require a library like pdf-parse
      // For now, return an error suggesting manual entry or CSV conversion
      return {
        success: false,
        error: 'PDF parsing is not yet supported. Please convert to CSV or Excel format.',
      };
    } else {
      return {
        success: false,
        error: `Unsupported file type. Please upload CSV or Excel (.xlsx, .xls) files.`,
      };
    }
    
    if (rows.length === 0) {
      return {
        success: false,
        error: 'No data found in file. Please check the file format.',
      };
    }
    
    return parseLineItemsFromRows(rows);
  } catch (err) {
    return {
      success: false,
      error: `Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

// ============================================
// FILE SIZE FORMATTING
// ============================================

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// ID GENERATION
// ============================================

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// CLASSNAME HELPER
// ============================================

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// VALIDATION
// ============================================

export function validateEmail(email: string, allowedDomains: string[]): boolean {
  const domain = email.split('@')[1];
  return allowedDomains.includes(domain);
}
