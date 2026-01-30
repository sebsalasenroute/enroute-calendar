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
  addDays,
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
  PaymentTerms,
  Release,
  InboundOrderWithTotals,
  CashFlowEntry,
  MonthlyCashFlow,
  CalendarExportEvent,
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

  // Detect delimiter (comma, tab, semicolon, pipe)
  const detectDelimiter = (line: string): string => {
    const delimiters = [',', '\t', ';', '|'];
    let bestDelimiter = ',';
    let maxCount = 0;

    for (const d of delimiters) {
      const count = (line.match(new RegExp(d === '|' ? '\\|' : d, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = d;
      }
    }
    return bestDelimiter;
  };

  const delimiter = detectDelimiter(lines[0]);

  // Parse row - handle quoted values
  const parseRow = (row: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  // Parse all rows first to find header row
  const allRows = lines.map(parseRow);
  const headerRowIndex = findHeaderRow(allRows);

  const headers = allRows[headerRowIndex].map(h =>
    String(h).toLowerCase().replace(/['"]/g, '').trim()
  );
  const rows: Record<string, string>[] = [];

  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const values = allRows[i];
    // Skip empty rows
    if (values.every(v => !v || !v.trim())) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = String(values[idx] ?? '').replace(/^["']|["']$/g, '').trim();
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

        // Try to find the best sheet (one with most data)
        let bestSheet = workbook.Sheets[workbook.SheetNames[0]];
        let bestRowCount = 0;

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
          if (jsonData.length > bestRowCount) {
            bestRowCount = jsonData.length;
            bestSheet = sheet;
          }
        }

        const jsonData = XLSX.utils.sheet_to_json(bestSheet, { header: 1, defval: '' }) as string[][];

        if (jsonData.length < 2) {
          resolve([]);
          return;
        }

        // Find the header row using smart detection
        const headerRowIndex = findHeaderRow(jsonData);

        const headers = jsonData[headerRowIndex].map(h =>
          String(h ?? '').toLowerCase().trim()
        );
        const rows: Record<string, string>[] = [];

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const rowData = jsonData[i];
          // Skip empty rows
          if (!rowData || rowData.every(cell => !cell || !String(cell).trim())) continue;

          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = String(rowData[idx] ?? '').trim();
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
// Enhanced with fuzzy matching and extensive vendor format support
// ============================================

const columnMappings: Record<string, string[]> = {
  sku: [
    'sku', 'our sku', 'internal sku', 'item sku', 'product sku',
    'style number', 'style #', 'style', 'style code', 'style no',
    'article number', 'article #', 'article', 'art no', 'art #',
    'item number', 'item #', 'item no', 'item code',
    'product code', 'prod code', 'code', 'reference', 'ref',
    'model', 'model number', 'model #', 'part number', 'part #',
  ],
  vendor_sku: [
    'vendor sku', 'vendor_sku', 'supplier sku', 'factory sku',
    'manufacturer sku', 'mfr sku', 'mfg sku', 'supplier code',
    'vendor code', 'vendor item', 'vendor ref', 'supplier ref',
    'factory code', 'factory ref', 'external sku',
  ],
  product_name: [
    'product name', 'product_name', 'product', 'name', 'description',
    'title', 'item', 'item name', 'item description', 'product description',
    'style name', 'style description', 'article name', 'article description',
    'product title', 'item title', 'goods', 'goods description',
    'merchandise', 'merch', 'desc', 'product desc',
  ],
  variant_title: [
    'variant', 'variant title', 'variant_title', 'option', 'variation',
    'variant name', 'variant description', 'option value',
  ],
  size: [
    'size', 'sz', 'sizes', 'sizing', 'size code', 'size value',
    'dimension', 'dimensions', 'product size', 'item size',
    's/m/l', 'xs-xl', 'size range',
  ],
  color: [
    'color', 'colour', 'col', 'colors', 'colours', 'color code',
    'colour code', 'color name', 'colour name', 'colorway', 'colourway',
    'shade', 'hue', 'tint', 'color/colour',
  ],
  material: [
    'material', 'fabric', 'composition', 'materials', 'fabrics',
    'content', 'fabric content', 'material content', 'fabric composition',
    'textile', 'cloth', 'fiber', 'fibre',
  ],
  qty: [
    'qty', 'quantity', 'units', 'order qty', 'order quantity',
    'amount', 'count', 'pcs', 'pieces', 'total qty', 'total quantity',
    'ordered', 'ordered qty', 'order units', 'unit count',
    'no of units', 'number of units', '# of units', 'num units',
    'pack qty', 'case qty', 'carton qty', 'stock', 'inventory',
    'qty ordered', 'quantity ordered', 'order amount',
  ],
  unit_cost: [
    'unit cost', 'unit_cost', 'cost', 'price', 'unit price',
    'wholesale', 'wholesale price', 'cost price', 'fob', 'fob price',
    'purchase price', 'buy price', 'buying price', 'landed cost',
    'cost per unit', 'price per unit', 'ex-factory', 'exw', 'exw price',
    'factory price', 'vendor price', 'supplier price', 'net price',
    'cost each', 'each cost', 'unit $', '$ per unit', 'cogs',
    'first cost', '1st cost',
  ],
  unit_retail: [
    'unit retail', 'unit_retail', 'retail', 'rrp', 'msrp',
    'retail price', 'srp', 'selling price', 'sell price',
    'recommended retail', 'suggested retail', 'list price',
    'sales price', 'retail $', 'price retail', 'consumer price',
    'ticket price', 'tag price', 'sticker price', 'full price',
    'compare at', 'compare at price', 'original price',
  ],
  barcode: [
    'barcode', 'upc', 'ean', 'gtin', 'upc code', 'ean code',
    'upc-a', 'ean-13', 'ean13', 'upc a', 'bar code', 'scan code',
    'gtin-14', 'gtin14', 'isbn', 'asin',
  ],
  weight: [
    'weight', 'wt', 'wgt', 'gross weight', 'net weight', 'item weight',
    'product weight', 'unit weight', 'weight (kg)', 'weight (lb)',
    'weight kg', 'weight lb', 'kg', 'lbs', 'grams', 'g',
  ],
  hs_code: [
    'hs code', 'hs_code', 'tariff code', 'hts', 'hts code',
    'harmonized code', 'customs code', 'tariff', 'hs number',
    'commodity code', 'schedule b', 'hts number',
  ],
  country_of_origin: [
    'country of origin', 'origin', 'coo', 'made in', 'country',
    'manufacturing country', 'source country', 'produced in',
    'manufactured in', 'origin country', 'mfg country',
  ],
};

// Fuzzy matching helpers
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-\.\/\\]/g, ' ')  // Replace separators with spaces
    .replace(/['"()[\]{}]/g, '')    // Remove quotes and brackets
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeHeader(str1);
  const s2 = normalizeHeader(str2);

  // Exact match
  if (s1 === s2) return 1;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Word overlap
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w)).length;
  if (commonWords > 0) {
    return 0.5 + (commonWords / Math.max(words1.length, words2.length)) * 0.4;
  }

  return 0;
}

function mapColumn(header: string): string | null {
  const normalized = normalizeHeader(header);

  // First, try exact match
  for (const [field, aliases] of Object.entries(columnMappings)) {
    for (const alias of aliases) {
      if (normalizeHeader(alias) === normalized) return field;
    }
  }

  // Second, try fuzzy match with high threshold
  let bestMatch: { field: string; score: number } | null = null;
  for (const [field, aliases] of Object.entries(columnMappings)) {
    for (const alias of aliases) {
      const score = calculateSimilarity(alias, header);
      if (score >= 0.8 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { field, score };
      }
    }
  }

  return bestMatch?.field || null;
}

// Smart header row detection - find the row with the most recognized columns
function findHeaderRow(rows: string[][]): number {
  let bestRowIndex = 0;
  let bestScore = 0;

  // Check first 10 rows for potential headers
  const checkRows = Math.min(10, rows.length);
  for (let i = 0; i < checkRows; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    let score = 0;
    for (const cell of row) {
      if (typeof cell === 'string' && mapColumn(cell)) {
        score++;
      }
    }

    // Also give points for having mostly text (not numbers)
    const textCells = row.filter(cell =>
      typeof cell === 'string' && isNaN(parseFloat(cell))
    ).length;
    score += textCells * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = i;
    }
  }

  return bestRowIndex;
}

// Detect numeric columns that might be qty or cost
function inferColumnType(values: string[]): 'qty' | 'cost' | 'text' | null {
  const numericValues = values
    .map(v => parseFloat(String(v).replace(/[$,€£¥]/g, '')))
    .filter(n => !isNaN(n) && n > 0);

  if (numericValues.length < values.length * 0.5) return 'text';

  const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
  const hasDecimals = numericValues.some(n => n % 1 !== 0);

  // Quantities are usually whole numbers, often > 1
  if (!hasDecimals && avg > 0.5 && avg < 10000) return 'qty';

  // Costs usually have decimals or are in a typical price range
  if (hasDecimals || (avg > 1 && avg < 100000)) return 'cost';

  return null;
}

// ============================================
// LINE ITEM PARSING
// ============================================

// Auto-detect which price column is cost vs retail
// Logic: if we have two price columns, lower = cost, higher = retail
function detectPrices(row: Record<string, string>): { cost: number; retail: number | undefined } {
  const costValue = parseNumber(row.unit_cost || '0');
  const retailValue = row.unit_retail ? parseNumber(row.unit_retail) : undefined;

  // If both values exist, ensure cost is lower and retail is higher
  if (costValue > 0 && retailValue && retailValue > 0) {
    if (costValue > retailValue) {
      // Swap - the lower value should be cost
      return { cost: retailValue, retail: costValue };
    }
    return { cost: costValue, retail: retailValue };
  }

  // If only one price exists, try to determine what it is
  if (costValue > 0 && !retailValue) {
    return { cost: costValue, retail: undefined };
  }

  return { cost: costValue, retail: retailValue };
}

export function parseLineItemsFromRows(rows: Record<string, string>[]): FileUploadResult {
  const items: LineItem[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  // First pass: map all columns and detect unmapped numeric columns
  const allKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
  const unmappedNumericColumns: { key: string; type: 'qty' | 'cost' }[] = [];

  for (const key of allKeys) {
    if (!mapColumn(key)) {
      // Check if this unmapped column might be qty or cost
      const values = rows.map(r => r[key]).filter(v => v);
      const inferredType = inferColumnType(values);
      if (inferredType === 'qty' || inferredType === 'cost') {
        unmappedNumericColumns.push({ key, type: inferredType });
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const mappedRow: Record<string, string> = {};

    // Map columns to standard fields
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = mapColumn(key);
      if (mappedKey) {
        // Don't overwrite if already set (first match wins)
        if (!mappedRow[mappedKey]) {
          mappedRow[mappedKey] = value;
        }
      }
    }

    // Use inferred columns if standard ones are missing
    for (const { key, type } of unmappedNumericColumns) {
      if (type === 'qty' && !mappedRow.qty && row[key]) {
        mappedRow.qty = row[key];
      } else if (type === 'cost' && !mappedRow.unit_cost && row[key]) {
        mappedRow.unit_cost = row[key];
      }
    }

    // Extract values
    let productName = mappedRow.product_name || '';

    // Try to build product name from other fields if missing
    if (!productName) {
      const parts = [
        mappedRow.vendor_sku,
        mappedRow.sku,
        mappedRow.variant_title,
      ].filter(Boolean);
      if (parts.length > 0) {
        productName = parts.join(' - ');
      }
    }

    const qty = parseNumber(mappedRow.qty || '0');

    // Auto-detect cost vs retail prices
    const { cost, retail } = detectPrices(mappedRow);

    // Skip rows without essential data
    if (!productName || qty <= 0) {
      skipped++;
      if (productName) {
        warnings.push(`Row ${i + 2}: Skipped "${productName}" - invalid quantity`);
      }
      continue;
    }

    // If cost is 0, try to use retail * 0.4 as estimate
    const finalCost = cost > 0 ? cost : (retail ? retail * 0.4 : 0);

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
      unit_cost: finalCost,
      unit_retail: retail,
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
    error: items.length === 0 ? 'No valid line items found. Please check that your file has product names and quantities.' : undefined,
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
// SHOPIFY EXPORT
// ============================================

// Shopify CSV headers for product import
const SHOPIFY_HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Variant Weight Unit',
  'Cost per item',
];

function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ShopifyExportOptions {
  vendor?: string;
  productType?: string;
  tags?: string[];
  published?: boolean;
}

export function exportToShopifyCSV(
  items: LineItem[],
  options: ShopifyExportOptions = {}
): string {
  const {
    vendor = 'ENROUTE',
    productType = '',
    tags = [],
    published = false,
  } = options;

  const rows: string[] = [];

  // Add header row
  rows.push(SHOPIFY_HEADERS.map(escapeCSV).join(','));

  // Group items by product name to handle variants
  const productGroups = new Map<string, LineItem[]>();
  for (const item of items) {
    const key = item.product_name;
    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }
    productGroups.get(key)!.push(item);
  }

  // Generate rows for each product and its variants
  for (const [productName, variants] of Array.from(productGroups.entries())) {
    const handle = generateHandle(productName);

    variants.forEach((item, index) => {
      const isFirstVariant = index === 0;

      // Determine option values
      const hasSize = variants.some(v => v.size);
      const hasColor = variants.some(v => v.color);

      const row = [
        handle, // Handle
        isFirstVariant ? productName : '', // Title
        '', // Body (HTML)
        isFirstVariant ? vendor : '', // Vendor
        isFirstVariant ? productType : '', // Type
        isFirstVariant ? tags.join(', ') : '', // Tags
        isFirstVariant ? (published ? 'TRUE' : 'FALSE') : '', // Published
        hasSize ? 'Size' : '', // Option1 Name
        item.size || '', // Option1 Value
        hasColor ? 'Color' : '', // Option2 Name
        item.color || '', // Option2 Value
        '', // Option3 Name
        '', // Option3 Value
        item.sku || '', // Variant SKU
        item.weight ? Math.round(item.weight * 1000) : '', // Variant Grams
        'shopify', // Variant Inventory Tracker
        item.qty, // Variant Inventory Qty
        'deny', // Variant Inventory Policy
        'manual', // Variant Fulfillment Service
        item.unit_retail || item.unit_cost * 2.5, // Variant Price
        item.unit_retail ? '' : '', // Variant Compare At Price
        'TRUE', // Variant Requires Shipping
        'TRUE', // Variant Taxable
        item.barcode || '', // Variant Barcode
        '', // Image Src
        '', // Image Position
        '', // Image Alt Text
        'FALSE', // Gift Card
        '', // SEO Title
        '', // SEO Description
        item.weight_unit || 'kg', // Variant Weight Unit
        item.unit_cost, // Cost per item
      ];

      rows.push(row.map(escapeCSV).join(','));
    });
  }

  return rows.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// CASH FLOW UTILITIES
// ============================================

// Get number of days for payment terms
export function getPaymentTermsDays(terms: PaymentTerms): number {
  switch (terms) {
    case 'Prepaid': return -30; // Payment due before order
    case 'COD': return 0; // Cash on delivery
    case 'Net-15': return 15;
    case 'Net-30': return 30;
    case 'Net-45': return 45;
    case 'Net-60': return 60;
    case 'Net-90': return 90;
    default: return 30;
  }
}

// Calculate payment due date based on order date and payment terms
export function getPaymentDueDate(orderDate: string, terms: PaymentTerms): string {
  const date = parseISO(orderDate);
  const daysToAdd = getPaymentTermsDays(terms);
  return format(addDays(date, daysToAdd), 'yyyy-MM-dd');
}

// Generate cash flow entries from inbound orders
export function generateCashFlowEntries(
  inbounds: InboundOrderWithTotals[],
  releases: Release[]
): CashFlowEntry[] {
  const entries: CashFlowEntry[] = [];

  // Outflows from inbound orders (payments to vendors)
  for (const inbound of inbounds) {
    if (inbound.status === 'Cancelled') continue;

    const orderDate = inbound.order_date || inbound.created_at.split('T')[0];
    const paymentDueDate = getPaymentDueDate(orderDate, inbound.payment_terms);

    entries.push({
      id: `cf-out-${inbound.id}`,
      date: paymentDueDate,
      type: 'outflow',
      category: 'inbound_payment',
      amount: inbound.total_cost,
      currency: inbound.currency,
      description: `Payment for ${inbound.po_number}`,
      reference: inbound.po_number,
      source: inbound,
    });
  }

  // Inflows from releases (projected revenue)
  for (const release of releases) {
    if (release.status === 'Cancelled') continue;

    // Use user-specified projected_revenue if available
    // Otherwise calculate from line items, fallback to 0
    let totalRevenue = release.projected_revenue || 0;

    // If no projected revenue specified but we have line items, calculate estimate
    if (!release.projected_revenue && release.line_items?.length) {
      const calculatedRevenue = release.line_items.reduce(
        (sum, item) => sum + item.qty * (item.unit_retail || item.unit_cost * 2.5),
        0
      );
      // Apply inventory turnover % if specified (default 100%)
      const turnoverPct = release.inventory_turnover_pct ?? 100;
      totalRevenue = calculatedRevenue * (turnoverPct / 100);
    }

    if (totalRevenue > 0) {
      const turnoverNote = release.inventory_turnover_pct !== undefined
        ? ` (${release.inventory_turnover_pct}% turnover)`
        : '';

      entries.push({
        id: `cf-in-${release.id}`,
        date: release.release_date,
        type: 'inflow',
        category: 'release_revenue',
        amount: totalRevenue,
        currency: 'USD',
        description: `Projected revenue from ${release.title}${turnoverNote}`,
        reference: release.title,
        source: release,
      });
    }
  }

  return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Group cash flow entries by month
export function groupCashFlowByMonth(
  entries: CashFlowEntry[],
  monthsAhead: number = 6
): MonthlyCashFlow[] {
  const now = new Date();
  const months: MonthlyCashFlow[] = [];

  for (let i = -1; i < monthsAhead; i++) {
    const monthDate = addMonths(now, i);
    const monthKey = format(monthDate, 'yyyy-MM');
    const monthLabel = format(monthDate, 'MMMM yyyy');

    const monthEntries = entries.filter((e) => e.date.startsWith(monthKey));
    const outflows = monthEntries.filter((e) => e.type === 'outflow');
    const inflows = monthEntries.filter((e) => e.type === 'inflow');

    const totalOutflow = outflows.reduce((sum, e) => sum + e.amount, 0);
    const totalInflow = inflows.reduce((sum, e) => sum + e.amount, 0);

    months.push({
      month: monthKey,
      monthLabel,
      outflows,
      inflows,
      totalOutflow,
      totalInflow,
      netCashFlow: totalInflow - totalOutflow,
    });
  }

  return months;
}

// ============================================
// CALENDAR EXPORT (ICS)
// ============================================

function formatICSDate(dateStr: string, time?: string): string {
  const date = parseISO(dateStr);
  if (time) {
    const [hours, minutes] = time.split(':');
    date.setHours(parseInt(hours), parseInt(minutes), 0);
  }
  return format(date, "yyyyMMdd'T'HHmmss");
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICSCalendar(events: CalendarExportEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ENROUTE//Release Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ENROUTE Release Calendar',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date().toISOString().split('T')[0])}`);
    lines.push(`DTSTART:${formatICSDate(event.startDate)}`);
    lines.push(`DTEND:${formatICSDate(event.endDate)}`);
    lines.push(`SUMMARY:${escapeICS(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeICS(event.location)}`);
    }
    if (event.url) {
      lines.push(`URL:${event.url}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function createCalendarEvents(
  releases: Release[],
  inbounds: InboundOrderWithTotals[]
): CalendarExportEvent[] {
  const events: CalendarExportEvent[] = [];

  // Add release events
  for (const release of releases) {
    if (release.status === 'Cancelled') continue;

    const totalUnits = release.line_items?.reduce((sum, i) => sum + i.qty, 0) || 0;
    const description = [
      release.summary,
      '',
      `Type: ${release.type}`,
      release.brand ? `Brand: ${release.brand}` : '',
      `Brand Unit: ${release.brand_unit}`,
      `Status: ${release.status}`,
      totalUnits > 0 ? `Units: ${totalUnits}` : '',
      release.projected_revenue ? `Projected Revenue: ${formatCurrency(release.projected_revenue)}` : '',
      release.inventory_turnover_pct !== undefined ? `Turnover: ${release.inventory_turnover_pct}%` : '',
      `Owner: ${release.owner}`,
    ]
      .filter(Boolean)
      .join('\\n');

    events.push({
      uid: `release-${release.id}@enroute.cc`,
      title: `🚀 ${release.title}`,
      description,
      startDate: release.release_date,
      endDate: release.release_date,
    });
  }

  // Add inbound ETA events
  for (const inbound of inbounds) {
    if (inbound.status === 'Cancelled' || inbound.status === 'Received Complete') continue;

    const description = [
      `PO: ${inbound.po_number}`,
      `Vendor: ${inbound.vendor}`,
      `Status: ${inbound.status}`,
      `Units: ${inbound.total_units}`,
      `Cost: ${formatCurrency(inbound.total_cost, inbound.currency)}`,
      inbound.tracking_number ? `Tracking: ${inbound.tracking_number}` : '',
    ]
      .filter(Boolean)
      .join('\\n');

    events.push({
      uid: `inbound-${inbound.id}@enroute.cc`,
      title: `📦 ${inbound.brand} - ${inbound.po_number} (ETA)`,
      description,
      startDate: inbound.eta_date,
      endDate: inbound.eta_date,
    });
  }

  // Add payment due date events
  for (const inbound of inbounds) {
    if (inbound.status === 'Cancelled') continue;

    const orderDate = inbound.order_date || inbound.created_at.split('T')[0];
    const paymentDueDate = getPaymentDueDate(orderDate, inbound.payment_terms);

    events.push({
      uid: `payment-${inbound.id}@enroute.cc`,
      title: `💰 Payment Due: ${inbound.po_number}`,
      description: [
        `Vendor: ${inbound.vendor}`,
        `Amount: ${formatCurrency(inbound.total_cost, inbound.currency)}`,
        `Terms: ${inbound.payment_terms}`,
      ].join('\\n'),
      startDate: paymentDueDate,
      endDate: paymentDueDate,
    });
  }

  return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export function downloadICS(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// EMAIL REMINDER GENERATOR
// ============================================

export interface ReminderEmailData {
  subject: string;
  body: string;
  recipients?: string[];
}

export function generateReleaseReminder(release: Release, daysUntil: number): ReminderEmailData {
  const totalUnits = release.line_items?.reduce((sum, i) => sum + i.qty, 0) || 0;
  const totalValue = release.line_items?.reduce(
    (sum, i) => sum + i.qty * (i.unit_retail || i.unit_cost * 2.5),
    0
  ) || 0;

  const subject = `[REMINDER] ${release.title} launches in ${daysUntil} days`;

  const body = `
Hi team,

This is a reminder that "${release.title}" is scheduled to launch in ${daysUntil} days.

RELEASE DETAILS
───────────────
Title: ${release.title}
Type: ${release.type}
Brand: ${release.brand_unit}
Date: ${formatDate(release.release_date)}${release.release_time ? ` at ${release.release_time}` : ''}
Status: ${release.status}

${totalUnits > 0 ? `INVENTORY
───────────────
Total SKUs: ${release.line_items?.length || 0}
Total Units: ${totalUnits.toLocaleString()}
Est. Revenue: ${formatCurrency(totalValue)}
` : ''}
SUMMARY
───────────────
${release.summary}

${release.tags.length > 0 ? `Tags: ${release.tags.join(', ')}` : ''}

Please ensure all preparations are complete:
• Product pages are live/scheduled
• Inventory is loaded in Shopify
• Marketing assets are ready
• Social media posts are scheduled
• Customer service team is briefed

Owner: ${release.owner}

---
ENROUTE Release Calendar
`.trim();

  return { subject, body };
}

export function generate7DayReminders(releases: Release[]): ReminderEmailData[] {
  const now = new Date();
  const reminders: ReminderEmailData[] = [];

  for (const release of releases) {
    if (release.status === 'Cancelled' || release.status === 'Landed') continue;

    const daysUntil = differenceInDays(parseISO(release.release_date), now);

    if (daysUntil === 7) {
      reminders.push(generateReleaseReminder(release, 7));
    }
  }

  return reminders;
}

export function generateCalendarSummaryEmail(
  releases: Release[],
  inbounds: InboundOrderWithTotals[]
): ReminderEmailData {
  const now = new Date();
  const next30Days = releases
    .filter((r) => {
      const days = differenceInDays(parseISO(r.release_date), now);
      return days >= 0 && days <= 30 && r.status !== 'Cancelled';
    })
    .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());

  const upcomingInbounds = inbounds
    .filter((i) => {
      const days = differenceInDays(parseISO(i.eta_date), now);
      return days >= 0 && days <= 30 && i.status !== 'Cancelled' && i.status !== 'Received Complete';
    })
    .sort((a, b) => new Date(a.eta_date).getTime() - new Date(b.eta_date).getTime());

  const subject = `ENROUTE Calendar Summary - ${format(now, 'MMMM yyyy')}`;

  let body = `
ENROUTE RELEASE CALENDAR SUMMARY
================================
Generated: ${format(now, 'MMMM d, yyyy')}

UPCOMING RELEASES (Next 30 Days)
────────────────────────────────
`;

  if (next30Days.length === 0) {
    body += 'No releases scheduled.\n';
  } else {
    for (const release of next30Days) {
      const daysUntil = differenceInDays(parseISO(release.release_date), now);
      body += `
• ${release.title}
  Date: ${formatDate(release.release_date)} (${daysUntil === 0 ? 'TODAY' : `in ${daysUntil} days`})
  Type: ${release.type} | Brand: ${release.brand_unit}
  Status: ${release.status}
`;
    }
  }

  body += `
INCOMING INVENTORY (Next 30 Days)
─────────────────────────────────
`;

  if (upcomingInbounds.length === 0) {
    body += 'No inbound orders expected.\n';
  } else {
    for (const inbound of upcomingInbounds) {
      const daysUntil = differenceInDays(parseISO(inbound.eta_date), now);
      body += `
• ${inbound.brand} - ${inbound.po_number}
  ETA: ${formatDate(inbound.eta_date)} (${daysUntil === 0 ? 'TODAY' : `in ${daysUntil} days`})
  Vendor: ${inbound.vendor}
  Units: ${inbound.total_units.toLocaleString()} | Cost: ${formatCurrency(inbound.total_cost, inbound.currency)}
  Status: ${inbound.status}
`;
    }
  }

  body += `
---
ENROUTE Release Calendar
`;

  return { subject, body: body.trim() };
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

