'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import {
  Release,
  InboundOrderWithTotals,
  CalendarEvent,
  FilterState,
  BrandUnit,
  ReleaseType,
  ReleaseStatus,
  InboundStatus,
  DashboardStats,
  Asset,
  LineItem,
  Currency,
  PaymentTerms,
  MonthlyCashFlow,
} from '@/types';
import { 
  dataStore, 
  getCalendarEvents, 
  getDashboardStats,
  getUniqueVendors,
} from '@/lib/data';
import {
  formatDate,
  formatRelativeDate,
  formatCurrency,
  formatNumber,
  formatMonthYear,
  getCalendarDays,
  getNextMonth,
  getPrevMonth,
  isSameMonthAs,
  isSameDayAs,
  releaseStatusStyles,
  inboundStatusStyles,
  releaseTypeStyles,
  brandUnitStyles,
  assetTypeConfig,
  cn,
  getDaysUntil,
  processUploadedFile,
  generateId,
  formatFileSize,
  exportToShopifyCSV,
  downloadCSV,
  generateCashFlowEntries,
  groupCashFlowByMonth,
  generateICSCalendar,
  createCalendarEvents,
  downloadICS,
  generateCalendarSummaryEmail,
  generate7DayReminders,
  copyToClipboard,
} from '@/lib/utils';

// ============================================
// ICONS
// ============================================

const Icons = {
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  List: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>
    </svg>
  ),
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  Link: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  File: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Package: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>
  ),
  Tag: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  DollarSign: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  Share: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  TrendingDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
    </svg>
  ),
  ShoppingCart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  ),
  Repeat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  ),
};

// ============================================
// BADGE COMPONENTS
// ============================================

function StatusBadge({ status, type }: { status: ReleaseStatus | InboundStatus; type: 'release' | 'inbound' }) {
  const styles = type === 'release' 
    ? releaseStatusStyles[status as ReleaseStatus]
    : inboundStatusStyles[status as InboundStatus];
  return (
    <span className={cn('badge', styles.className)}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: ReleaseType }) {
  const styles = releaseTypeStyles[type];
  return <span className={cn('badge', styles.className)}>{type}</span>;
}

function BrandBadge({ brand }: { brand: BrandUnit }) {
  const className = brand === 'ENROUTE.CC' ? 'badge-dark' : 'badge-orange-solid';
  return <span className={cn('badge', className)}>{brand}</span>;
}

function OrderTypeBadge({ type }: { type: 'preorder' | 'restock' | 'onetime' }) {
  const config = {
    preorder: { className: 'badge-blue', label: 'Pre-order' },
    restock: { className: 'badge-teal', label: 'Re-stock' },
    onetime: { className: 'badge-purple', label: 'One-time' },
  };
  return <span className={cn('badge', config[type].className)}>{config[type].label}</span>;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={cn('toast', toast.type)}>
          {toast.type === 'success' && <Icons.Check />}
          {toast.type === 'error' && <Icons.AlertCircle />}
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// ============================================
// BOTTOM NAVIGATION (Mobile)
// ============================================

function BottomNav({
  view,
  onViewChange,
  onUploadClick,
}: {
  view: ViewType;
  onViewChange: (v: ViewType) => void;
  onUploadClick: () => void;
}) {
  return (
    <nav className="bottom-nav">
      <button
        className={cn('bottom-nav-item', view === 'dashboard' && 'active')}
        onClick={() => onViewChange('dashboard')}
      >
        <Icons.Dashboard />
        <span>Home</span>
      </button>
      <button
        className={cn('bottom-nav-item', view === 'calendar' && 'active')}
        onClick={() => onViewChange('calendar')}
      >
        <Icons.Calendar />
        <span>Calendar</span>
      </button>
      <button className="bottom-nav-item primary" onClick={onUploadClick}>
        <Icons.Plus />
      </button>
      <button
        className={cn('bottom-nav-item', view === 'list' && 'active')}
        onClick={() => onViewChange('list')}
      >
        <Icons.List />
        <span>Items</span>
      </button>
      <button
        className={cn('bottom-nav-item', view === 'cashflow' && 'active')}
        onClick={() => onViewChange('cashflow')}
      >
        <Icons.DollarSign />
        <span>Cash</span>
      </button>
    </nav>
  );
}

// ============================================
// UPLOAD WIZARD MODAL
// ============================================

type WizardStep = 1 | 2 | 3;
type OrderType = 'preorder' | 'restock' | 'onetime';

interface UploadWizardData {
  orderType: OrderType | null;
  // Common fields
  brand_unit: BrandUnit;
  brand: string;
  vendor: string;
  collection_name: string;
  sku: string;
  quantity: number | '';
  unit_cost: number | '';
  currency: Currency;
  expected_arrival_date: string;
  payment_terms: PaymentTerms;
  notes: string;
  line_items: LineItem[];
  // Pre-order specific
  preorder_open_date: string;
  preorder_close_date: string;
  deposit_percentage: number | '';
  expected_payout_date: string;
  // Re-stock specific
  order_date: string;
  warehouse_location: string;
  receiving_date: string;
  // One-time specific
  due_date: string;
  payment_date: string;
}

const initialWizardData: UploadWizardData = {
  orderType: null,
  brand_unit: 'ENROUTE.CC',
  brand: '',
  vendor: '',
  collection_name: '',
  sku: '',
  quantity: '',
  unit_cost: '',
  currency: 'USD',
  expected_arrival_date: format(new Date(), 'yyyy-MM-dd'),
  payment_terms: 'Net-30',
  notes: '',
  line_items: [],
  preorder_open_date: '',
  preorder_close_date: '',
  deposit_percentage: '',
  expected_payout_date: '',
  order_date: format(new Date(), 'yyyy-MM-dd'),
  warehouse_location: '',
  receiving_date: '',
  due_date: '',
  payment_date: '',
};

interface ValidationErrors {
  [key: string]: string;
}

function UploadWizardModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UploadWizardData) => Promise<void>;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<UploadWizardData>(initialWizardData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setData(initialWizardData);
      setErrors({});
      setUploadResult(null);
    }
  }, [isOpen]);

  const validateStep2 = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!data.brand.trim()) newErrors.brand = 'Brand is required';
    if (!data.vendor.trim()) newErrors.vendor = 'Vendor is required';
    if (!data.collection_name.trim()) newErrors.collection_name = 'Collection/Product name is required';

    if (data.orderType === 'preorder') {
      if (!data.preorder_open_date) newErrors.preorder_open_date = 'Open date is required';
      if (!data.preorder_close_date) newErrors.preorder_close_date = 'Close date is required';
    }

    if (data.orderType === 'restock') {
      if (!data.expected_arrival_date) newErrors.expected_arrival_date = 'ETA is required';
    }

    if (data.orderType === 'onetime') {
      if (!data.due_date) newErrors.due_date = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Must have either line items OR manual quantity/cost
    if (data.line_items.length === 0) {
      if (!data.quantity || data.quantity <= 0) {
        newErrors.quantity = 'Quantity is required';
      }
      if (!data.unit_cost || data.unit_cost <= 0) {
        newErrors.unit_cost = 'Unit cost is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && data.orderType) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create order' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadResult(null);
    try {
      const result = await processUploadedFile(file);
      if (result.success && result.data) {
        setData(prev => ({
          ...prev,
          line_items: [...prev.line_items, ...result.data!],
        }));
        setUploadResult({
          success: true,
          message: `Added ${result.data.length} items (${formatNumber(result.summary?.total_units || 0)} units)`,
        });
      } else {
        setUploadResult({ success: false, message: result.error || 'Failed to parse file' });
      }
    } catch (error) {
      setUploadResult({ success: false, message: error instanceof Error ? error.message : 'Failed to process file' });
    }
  };

  const updateField = <K extends keyof UploadWizardData>(field: K, value: UploadWizardData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const totalUnits = data.line_items.reduce((sum, i) => sum + i.qty, 0) || (typeof data.quantity === 'number' ? data.quantity : 0);
  const totalCost = data.line_items.reduce((sum, i) => sum + i.qty * i.unit_cost, 0) ||
    ((typeof data.quantity === 'number' ? data.quantity : 0) * (typeof data.unit_cost === 'number' ? data.unit_cost : 0));

  return (
    <div className={cn('modal-overlay', isOpen && 'open')} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <h2 className="modal-title">
            {step === 1 && 'What are you uploading?'}
            {step === 2 && 'Order Details'}
            {step === 3 && 'Products & Summary'}
          </h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <Icons.X />
          </button>
        </div>

        <div className="modal-body">
          {/* Wizard Progress */}
          <div className="wizard-progress">
            <div className={cn('wizard-step', step >= 1 && 'active', step > 1 && 'completed')}>
              <div className="wizard-step-number">{step > 1 ? <Icons.Check /> : '1'}</div>
              <span className="wizard-step-label">Type</span>
            </div>
            <div className={cn('wizard-connector', step > 1 && 'completed')} />
            <div className={cn('wizard-step', step >= 2 && 'active', step > 2 && 'completed')}>
              <div className="wizard-step-number">{step > 2 ? <Icons.Check /> : '2'}</div>
              <span className="wizard-step-label">Details</span>
            </div>
            <div className={cn('wizard-connector', step > 2 && 'completed')} />
            <div className={cn('wizard-step', step >= 3 && 'active')}>
              <div className="wizard-step-number">3</div>
              <span className="wizard-step-label">Products</span>
            </div>
          </div>

          {/* Step 1: Order Type Selection */}
          {step === 1 && (
            <div className="order-type-grid">
              <button
                className={cn('order-type-option', data.orderType === 'preorder' && 'selected')}
                onClick={() => updateField('orderType', 'preorder')}
              >
                <div className="order-type-icon preorder">
                  <Icons.Clock />
                </div>
                <div className="order-type-content">
                  <div className="order-type-title">Pre-order</div>
                  <div className="order-type-desc">Customer orders before inventory arrives. Includes open/close dates and deposit.</div>
                </div>
              </button>

              <button
                className={cn('order-type-option', data.orderType === 'restock' && 'selected')}
                onClick={() => updateField('orderType', 'restock')}
              >
                <div className="order-type-icon restock">
                  <Icons.Repeat />
                </div>
                <div className="order-type-content">
                  <div className="order-type-title">Re-stock</div>
                  <div className="order-type-desc">Replenishing existing inventory. Includes ETA window and warehouse location.</div>
                </div>
              </button>

              <button
                className={cn('order-type-option', data.orderType === 'onetime' && 'selected')}
                onClick={() => updateField('orderType', 'onetime')}
              >
                <div className="order-type-icon onetime">
                  <Icons.ShoppingCart />
                </div>
                <div className="order-type-content">
                  <div className="order-type-title">One-time Order</div>
                  <div className="order-type-desc">Single purchase with fixed payment date. Standard vendor order.</div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Order Details */}
          {step === 2 && (
            <div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="label">Brand Unit</label>
                  <select
                    className="input select"
                    value={data.brand_unit}
                    onChange={e => updateField('brand_unit', e.target.value as BrandUnit)}
                  >
                    <option value="ENROUTE.CC">ENROUTE.CC</option>
                    <option value="ENROUTE.RUN">ENROUTE.RUN</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">
                    Brand <span className="required-indicator">*</span>
                  </label>
                  <BrandAutoSuggest
                    value={data.brand}
                    onChange={v => updateField('brand', v)}
                    placeholder="e.g., MAAP, Nike"
                  />
                  {errors.brand && <div className="error-message"><Icons.AlertCircle />{errors.brand}</div>}
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label">
                    Vendor <span className="required-indicator">*</span>
                  </label>
                  <input
                    className={cn('input', errors.vendor && 'input-error')}
                    value={data.vendor}
                    onChange={e => updateField('vendor', e.target.value)}
                    placeholder="Vendor / Factory name"
                  />
                  {errors.vendor && <div className="error-message"><Icons.AlertCircle />{errors.vendor}</div>}
                </div>
                <div className="input-group">
                  <label className="label">
                    Product / Collection <span className="required-indicator">*</span>
                  </label>
                  <input
                    className={cn('input', errors.collection_name && 'input-error')}
                    value={data.collection_name}
                    onChange={e => updateField('collection_name', e.target.value)}
                    placeholder="e.g., Summer Capsule Vol. 3"
                  />
                  {errors.collection_name && <div className="error-message"><Icons.AlertCircle />{errors.collection_name}</div>}
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label className="label">Currency</label>
                  <select
                    className="input select"
                    value={data.currency}
                    onChange={e => updateField('currency', e.target.value as Currency)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Payment Terms</label>
                  <select
                    className="input select"
                    value={data.payment_terms}
                    onChange={e => updateField('payment_terms', e.target.value as PaymentTerms)}
                  >
                    <option value="Prepaid">Prepaid</option>
                    <option value="COD">COD (Cash on Delivery)</option>
                    <option value="Net-15">Net-15</option>
                    <option value="Net-30">Net-30</option>
                    <option value="Net-45">Net-45</option>
                    <option value="Net-60">Net-60</option>
                    <option value="Net-90">Net-90</option>
                  </select>
                </div>
              </div>

              {/* Pre-order specific fields */}
              {data.orderType === 'preorder' && (
                <>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="label">
                        Pre-order Opens <span className="required-indicator">*</span>
                      </label>
                      <input
                        type="date"
                        className={cn('input', errors.preorder_open_date && 'input-error')}
                        value={data.preorder_open_date}
                        onChange={e => updateField('preorder_open_date', e.target.value)}
                      />
                      {errors.preorder_open_date && <div className="error-message"><Icons.AlertCircle />{errors.preorder_open_date}</div>}
                    </div>
                    <div className="input-group">
                      <label className="label">
                        Pre-order Closes <span className="required-indicator">*</span>
                      </label>
                      <input
                        type="date"
                        className={cn('input', errors.preorder_close_date && 'input-error')}
                        value={data.preorder_close_date}
                        onChange={e => updateField('preorder_close_date', e.target.value)}
                      />
                      {errors.preorder_close_date && <div className="error-message"><Icons.AlertCircle />{errors.preorder_close_date}</div>}
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="label">Deposit %</label>
                      <input
                        type="number"
                        className="input mono"
                        value={data.deposit_percentage}
                        onChange={e => updateField('deposit_percentage', e.target.value ? parseFloat(e.target.value) : '')}
                        placeholder="e.g., 50"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="input-group">
                      <label className="label">Expected Payout Date</label>
                      <input
                        type="date"
                        className="input"
                        value={data.expected_payout_date}
                        onChange={e => updateField('expected_payout_date', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="label">Est. Delivery Window</label>
                    <input
                      type="date"
                      className="input"
                      value={data.expected_arrival_date}
                      onChange={e => updateField('expected_arrival_date', e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Re-stock specific fields */}
              {data.orderType === 'restock' && (
                <>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="label">Order Date</label>
                      <input
                        type="date"
                        className="input"
                        value={data.order_date}
                        onChange={e => updateField('order_date', e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="label">
                        ETA / Arrival Date <span className="required-indicator">*</span>
                      </label>
                      <input
                        type="date"
                        className={cn('input', errors.expected_arrival_date && 'input-error')}
                        value={data.expected_arrival_date}
                        onChange={e => updateField('expected_arrival_date', e.target.value)}
                      />
                      {errors.expected_arrival_date && <div className="error-message"><Icons.AlertCircle />{errors.expected_arrival_date}</div>}
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="label">Warehouse / Location</label>
                      <input
                        className="input"
                        value={data.warehouse_location}
                        onChange={e => updateField('warehouse_location', e.target.value)}
                        placeholder="e.g., Main Warehouse"
                      />
                    </div>
                    <div className="input-group">
                      <label className="label">Receiving Date</label>
                      <input
                        type="date"
                        className="input"
                        value={data.receiving_date}
                        onChange={e => updateField('receiving_date', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* One-time order specific fields */}
              {data.orderType === 'onetime' && (
                <>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="label">Order Date</label>
                      <input
                        type="date"
                        className="input"
                        value={data.order_date}
                        onChange={e => updateField('order_date', e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="label">
                        Due Date <span className="required-indicator">*</span>
                      </label>
                      <input
                        type="date"
                        className={cn('input', errors.due_date && 'input-error')}
                        value={data.due_date}
                        onChange={e => updateField('due_date', e.target.value)}
                      />
                      {errors.due_date && <div className="error-message"><Icons.AlertCircle />{errors.due_date}</div>}
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="label">Payment Date</label>
                      <input
                        type="date"
                        className="input"
                        value={data.payment_date}
                        onChange={e => updateField('payment_date', e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="label">Expected Arrival</label>
                      <input
                        type="date"
                        className="input"
                        value={data.expected_arrival_date}
                        onChange={e => updateField('expected_arrival_date', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="input-group">
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input textarea"
                  value={data.notes}
                  onChange={e => updateField('notes', e.target.value)}
                  placeholder="Add any notes..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 3: Products / Line Items */}
          {step === 3 && (
            <div>
              <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: 'var(--sp-4)' }}>
                Upload a file with product details, or enter quantity and cost manually.
              </p>

              <FileUploader onUpload={handleFileUpload} accept=".csv,.xlsx,.xls" />

              {uploadResult && (
                <div
                  style={{
                    marginTop: 'var(--sp-2)',
                    padding: 'var(--sp-2) var(--sp-3)',
                    borderRadius: 'var(--radius-md)',
                    background: uploadResult.success ? 'var(--green-50)' : 'var(--red-50)',
                    color: uploadResult.success ? 'var(--green-700)' : 'var(--red-700)',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-2)',
                  }}
                >
                  {uploadResult.success ? <Icons.Check /> : <Icons.AlertCircle />}
                  {uploadResult.message}
                </div>
              )}

              {data.line_items.length > 0 && (
                <div className="file-preview">
                  <div className="file-preview-header">
                    <div className="file-preview-title">Import Preview</div>
                    <button className="btn btn-sm btn-ghost" onClick={() => updateField('line_items', [])}>
                      Clear
                    </button>
                  </div>
                  <div className="file-preview-summary">
                    <div className="file-preview-stat">
                      <div className="file-preview-stat-value">{data.line_items.length}</div>
                      <div className="file-preview-stat-label">SKUs</div>
                    </div>
                    <div className="file-preview-stat">
                      <div className="file-preview-stat-value">{formatNumber(totalUnits)}</div>
                      <div className="file-preview-stat-label">Units</div>
                    </div>
                    <div className="file-preview-stat">
                      <div className="file-preview-stat-value">{formatCurrency(totalCost, data.currency)}</div>
                      <div className="file-preview-stat-label">Total Cost</div>
                    </div>
                    <div className="file-preview-stat">
                      <div className="file-preview-stat-value">
                        {formatCurrency(data.line_items.reduce((sum, i) => sum + i.qty * (i.unit_retail || i.unit_cost * 2.5), 0), data.currency)}
                      </div>
                      <div className="file-preview-stat-label">Est. Value</div>
                    </div>
                  </div>
                </div>
              )}

              {data.line_items.length === 0 && (
                <>
                  <div style={{ textAlign: 'center', padding: 'var(--sp-3) 0', color: 'var(--gray-400)', fontSize: '0.75rem' }}>
                    — or enter manually —
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="label">
                        Quantity <span className="required-indicator">*</span>
                      </label>
                      <input
                        type="number"
                        className={cn('input mono', errors.quantity && 'input-error')}
                        value={data.quantity}
                        onChange={e => updateField('quantity', e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="e.g., 100"
                        min="1"
                      />
                      {errors.quantity && <div className="error-message"><Icons.AlertCircle />{errors.quantity}</div>}
                    </div>
                    <div className="input-group">
                      <label className="label">
                        Unit Cost ({data.currency}) <span className="required-indicator">*</span>
                      </label>
                      <input
                        type="number"
                        className={cn('input mono', errors.unit_cost && 'input-error')}
                        value={data.unit_cost}
                        onChange={e => updateField('unit_cost', e.target.value ? parseFloat(e.target.value) : '')}
                        placeholder="e.g., 25.00"
                        min="0"
                        step="0.01"
                      />
                      {errors.unit_cost && <div className="error-message"><Icons.AlertCircle />{errors.unit_cost}</div>}
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="label">SKU (optional)</label>
                    <input
                      className="input mono"
                      value={data.sku}
                      onChange={e => updateField('sku', e.target.value)}
                      placeholder="e.g., PROD-001"
                    />
                  </div>
                </>
              )}

              {/* Summary */}
              <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
                <div className="card-body" style={{ padding: 'var(--sp-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 'var(--sp-2)' }}>
                    <span className="text-muted">Order Type</span>
                    <span><OrderTypeBadge type={data.orderType!} /></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 'var(--sp-2)' }}>
                    <span className="text-muted">Total Units</span>
                    <span className="mono">{formatNumber(totalUnits)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 600 }}>
                    <span>Total Cost</span>
                    <span className="mono">{formatCurrency(totalCost, data.currency)}</span>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="error-message" style={{ marginTop: 'var(--sp-3)', justifyContent: 'center' }}>
                  <Icons.AlertCircle />{errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={handleBack} disabled={isSubmitting}>
              Back
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          {step < 3 ? (
            <button className="btn btn-primary" onClick={handleNext} disabled={step === 1 && !data.orderType}>
              Next
            </button>
          ) : (
            <button
              className={cn('btn btn-primary', isSubmitting && 'btn-loading')}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? '' : 'Create Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EVENT DETAILS DRAWER (Mobile)
// ============================================

function EventDetailsDrawer({
  event,
  isOpen,
  onClose,
  onEdit,
}: {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!event) return null;

  const isRelease = event.type === 'release';
  const release = isRelease ? (event.data as Release) : null;
  const inbound = !isRelease ? (event.data as InboundOrderWithTotals) : null;

  return (
    <>
      <div
        className={cn('drawer-overlay', isOpen && 'open')}
        onClick={onClose}
        style={{ zIndex: 140 }}
      />
      <div className={cn('event-drawer', isOpen && 'open')}>
        <div className="event-drawer-handle" />

        <div className="event-drawer-header">
          <h3 className="event-drawer-title">{event.title}</h3>
          <div className="event-drawer-meta">
            <BrandBadge brand={event.brand_unit} />
            {isRelease && release && <TypeBadge type={release.type} />}
            <StatusBadge status={event.status} type={event.type} />
          </div>
        </div>

        <div className="event-drawer-body">
          <div className="event-drawer-section">
            <div className="event-drawer-section-title">Details</div>
            <div className="event-drawer-row">
              <span className="event-drawer-label">Date</span>
              <span className="event-drawer-value">{formatDate(event.date)}</span>
            </div>
            {isRelease && release && (
              <>
                {release.release_time && (
                  <div className="event-drawer-row">
                    <span className="event-drawer-label">Time</span>
                    <span className="event-drawer-value">{release.release_time}</span>
                  </div>
                )}
                {release.brand && (
                  <div className="event-drawer-row">
                    <span className="event-drawer-label">Brand</span>
                    <span className="event-drawer-value">{release.brand}</span>
                  </div>
                )}
                {release.owner && (
                  <div className="event-drawer-row">
                    <span className="event-drawer-label">Owner</span>
                    <span className="event-drawer-value">{release.owner}</span>
                  </div>
                )}
                {release.line_items && release.line_items.length > 0 && (
                  <>
                    <div className="event-drawer-row">
                      <span className="event-drawer-label">Total Units</span>
                      <span className="event-drawer-value mono">{formatNumber(release.line_items.reduce((s, i) => s + i.qty, 0))}</span>
                    </div>
                    <div className="event-drawer-row">
                      <span className="event-drawer-label">Total Value</span>
                      <span className="event-drawer-value mono">
                        {formatCurrency(release.line_items.reduce((s, i) => s + i.qty * (i.unit_retail || i.unit_cost * 2.5), 0))}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
            {!isRelease && inbound && (
              <>
                <div className="event-drawer-row">
                  <span className="event-drawer-label">PO Number</span>
                  <span className="event-drawer-value mono">{inbound.po_number}</span>
                </div>
                <div className="event-drawer-row">
                  <span className="event-drawer-label">Vendor</span>
                  <span className="event-drawer-value">{inbound.vendor}</span>
                </div>
                <div className="event-drawer-row">
                  <span className="event-drawer-label">Collection</span>
                  <span className="event-drawer-value">{inbound.collection_name}</span>
                </div>
                <div className="event-drawer-row">
                  <span className="event-drawer-label">Total Units</span>
                  <span className="event-drawer-value mono">{formatNumber(inbound.total_units)}</span>
                </div>
                <div className="event-drawer-row">
                  <span className="event-drawer-label">Total Cost</span>
                  <span className="event-drawer-value mono">{formatCurrency(inbound.total_cost, inbound.currency)}</span>
                </div>
                <div className="event-drawer-row">
                  <span className="event-drawer-label">Payment Terms</span>
                  <span className="event-drawer-value">{inbound.payment_terms}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="event-drawer-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
            Edit Details
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================
// SIDEBAR
// ============================================

type ViewType = 'dashboard' | 'calendar' | 'list' | 'cashflow';

function Sidebar({ 
  view, 
  onViewChange, 
  onNewRelease, 
  onNewInbound 
}: { 
  view: ViewType;
  onViewChange: (v: ViewType) => void;
  onNewRelease: () => void;
  onNewInbound: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">ENROUTE OPS</div>
      </div>
      
      <nav className="sidebar-nav">
        <button className={cn('nav-item', view === 'dashboard' && 'active')} onClick={() => onViewChange('dashboard')}>
          <Icons.Dashboard /> Dashboard
        </button>
        <button className={cn('nav-item', view === 'calendar' && 'active')} onClick={() => onViewChange('calendar')}>
          <Icons.Calendar /> Calendar
        </button>
        <button className={cn('nav-item', view === 'list' && 'active')} onClick={() => onViewChange('list')}>
          <Icons.List /> All Items
        </button>
        <button className={cn('nav-item', view === 'cashflow' && 'active')} onClick={() => onViewChange('cashflow')}>
          <Icons.DollarSign /> Cash Flow
        </button>

        <div className="sidebar-section">
          <div className="sidebar-label">Quick Add</div>
          <button className="nav-item" onClick={onNewRelease}>
            <Icons.Tag /> New Release
          </button>
          <button className="nav-item" onClick={onNewInbound}>
            <Icons.Package /> New Inbound
          </button>
        </div>
      </nav>
    </aside>
  );
}

// ============================================
// FILTER BAR
// ============================================

function FilterBar({
  filters,
  onChange,
  vendors,
  showVendor = false,
  showType = false,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  vendors: string[];
  showVendor?: boolean;
  showType?: boolean;
}) {
  return (
    <div className="filter-bar">
      <div className="filter-search">
        <Icons.Search />
        <input
          type="text"
          className="input"
          placeholder="Search..."
          value={filters.search || ''}
          onChange={e => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      
      <select
        className="input select filter-select"
        value={filters.brand_unit || 'all'}
        onChange={e => onChange({ ...filters, brand_unit: e.target.value as any })}
      >
        <option value="all">All Brands</option>
        <option value="ENROUTE.CC">ENROUTE.CC</option>
        <option value="ENROUTE.RUN">ENROUTE.RUN</option>
      </select>
      
      <select
        className="input select filter-select"
        value={filters.status || 'all'}
        onChange={e => onChange({ ...filters, status: e.target.value })}
      >
        <option value="all">All Status</option>
        <option value="Draft">Draft</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Placed">Placed</option>
        <option value="In Transit">In Transit</option>
        <option value="Customs">Customs</option>
        <option value="Delayed">Delayed</option>
        <option value="Received Partial">Received Partial</option>
        <option value="Received Complete">Received Complete</option>
        <option value="Landed">Landed</option>
        <option value="Cancelled">Cancelled</option>
      </select>
      
      {showType && (
        <select
          className="input select filter-select"
          value={filters.type || 'all'}
          onChange={e => onChange({ ...filters, type: e.target.value as any })}
        >
          <option value="all">All Types</option>
          <option value="Drop">Drop</option>
          <option value="Restock">Restock</option>
          <option value="Preorder">Preorder</option>
          <option value="Collaboration">Collaboration</option>
          <option value="Event">Event</option>
        </select>
      )}
      
      {showVendor && vendors.length > 0 && (
        <select
          className="input select filter-select"
          value={filters.vendor || 'all'}
          onChange={e => onChange({ ...filters, vendor: e.target.value })}
        >
          <option value="all">All Vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      )}
    </div>
  );
}

// ============================================
// BRAND AUTO-SUGGEST COMPONENT
// ============================================

const SAVED_BRANDS_KEY = 'enroute-saved-brands';

function getSavedBrands(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(SAVED_BRANDS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveBrand(brand: string): void {
  if (typeof window === 'undefined' || !brand.trim()) return;
  try {
    const brands = getSavedBrands();
    const normalizedBrand = brand.trim();
    if (!brands.includes(normalizedBrand)) {
      brands.push(normalizedBrand);
      brands.sort((a, b) => a.localeCompare(b));
      localStorage.setItem(SAVED_BRANDS_KEY, JSON.stringify(brands));
    }
  } catch {
    // Ignore localStorage errors
  }
}

function BrandAutoSuggest({
  value,
  onChange,
  placeholder = 'Enter brand name',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedBrands = getSavedBrands();
    if (value.trim()) {
      const filtered = savedBrands.filter(b =>
        b.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions(savedBrands);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (brand: string) => {
    onChange(brand);
    setIsOpen(false);
  };

  const handleBlur = () => {
    // Save brand on blur if it's a new one
    setTimeout(() => {
      if (value.trim()) {
        saveBrand(value);
      }
    }, 200);
  };

  return (
    <div className="autosuggest-container" ref={containerRef}>
      <input
        type="text"
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      {isOpen && suggestions.length > 0 && (
        <div className="autosuggest-dropdown">
          {suggestions.map(brand => (
            <div
              key={brand}
              className="autosuggest-item"
              onMouseDown={() => handleSelect(brand)}
            >
              {brand}
            </div>
          ))}
        </div>
      )}
      {isOpen && suggestions.length === 0 && value.trim() && (
        <div className="autosuggest-dropdown">
          <div className="autosuggest-empty">
            Press Enter or Tab to add "{value}" as a new brand
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// FILE UPLOAD COMPONENT
// ============================================

function FileUploader({
  onUpload,
  accept = '.csv,.xlsx,.xls',
  label = 'Upload File',
}: {
  onUpload: (file: File) => void;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={cn('upload-zone', isDragging && 'dragging')}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="upload-icon"><Icons.Upload /></div>
      <div className="upload-text">{label}</div>
      <div className="upload-hint">Drag & drop or click to browse. Supports CSV, Excel (.xlsx, .xls)</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ============================================
// ASSET MANAGER COMPONENT
// ============================================

function AssetManager({
  assets,
  onChange,
  canEdit,
}: {
  assets: Asset[];
  onChange: (assets: Asset[]) => void;
  canEdit: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAsset, setNewAsset] = useState({ label: '', url: '', type: 'drive' as Asset['type'] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    if (!newAsset.label || !newAsset.url) return;
    onChange([...assets, { id: generateId('asset'), ...newAsset }]);
    setNewAsset({ label: '', url: '', type: 'drive' });
    setShowAddForm(false);
  };

  const addFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    // For small files, store as base64
    if (file.size < 5 * 1024 * 1024) { // 5MB limit
      const reader = new FileReader();
      reader.onload = () => {
        const asset: Asset = {
          id: generateId('asset'),
          label: file.name,
          type: isImage ? 'image' : isPdf ? 'pdf' : 'file',
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_data: reader.result as string,
          uploaded_at: new Date().toISOString(),
        };
        onChange([...assets, asset]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAsset = (id: string) => {
    onChange(assets.filter(a => a.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-2)' }}>
        <label className="label" style={{ marginBottom: 0 }}>Assets ({assets.length})</label>
        {canEdit && !showAddForm && (
          <div className="flex gap-2">
            <button className="btn btn-sm btn-secondary" onClick={() => setShowAddForm(true)}>
              <Icons.Link /> Add Link
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => fileInputRef.current?.click()}>
              <Icons.Upload /> Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={e => e.target.files?.[0] && addFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {showAddForm && canEdit && (
        <div style={{ padding: 'var(--sp-3)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-3)' }}>
          <div className="grid-2" style={{ marginBottom: 'var(--sp-3)' }}>
            <input
              type="text"
              className="input input-sm"
              placeholder="Label"
              value={newAsset.label}
              onChange={e => setNewAsset({ ...newAsset, label: e.target.value })}
            />
            <select
              className="input input-sm select"
              value={newAsset.type}
              onChange={e => setNewAsset({ ...newAsset, type: e.target.value as any })}
            >
              <option value="drive">📁 Google Drive</option>
              <option value="figma">🎨 Figma</option>
              <option value="shopify">🛒 Shopify</option>
              <option value="lookbook">📖 Lookbook</option>
              <option value="instagram">📷 Instagram</option>
              <option value="other">🔗 Other</option>
            </select>
          </div>
          <input
            type="url"
            className="input input-sm"
            placeholder="https://..."
            value={newAsset.url}
            onChange={e => setNewAsset({ ...newAsset, url: e.target.value })}
            style={{ marginBottom: 'var(--sp-3)' }}
          />
          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={addLink} disabled={!newAsset.label || !newAsset.url}>Add</button>
          </div>
        </div>
      )}

      <div className="asset-list">
        {assets.map(asset => (
          <div key={asset.id} className="asset-item">
            <span className="asset-icon">{assetTypeConfig[asset.type]?.icon || '📎'}</span>
            {asset.url ? (
              <a href={asset.url} target="_blank" rel="noopener noreferrer" className="asset-label">{asset.label}</a>
            ) : (
              <span className="asset-label">{asset.label}</span>
            )}
            {asset.file_size && (
              <span className="text-muted" style={{ fontSize: '0.6875rem' }}>{formatFileSize(asset.file_size)}</span>
            )}
            {canEdit && (
              <button className="btn btn-icon btn-ghost asset-remove" onClick={() => removeAsset(asset.id)}>
                <Icons.X />
              </button>
            )}
          </div>
        ))}
        {assets.length === 0 && (
          <div style={{ padding: 'var(--sp-4)', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>
            No assets added
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD VIEW
// ============================================

function DashboardView({
  stats,
  onSelectRelease,
  onSelectInbound,
}: {
  stats: DashboardStats;
  onSelectRelease: (r: Release) => void;
  onSelectInbound: (i: InboundOrderWithTotals) => void;
}) {
  const totalUpcoming = stats.upcoming14.releases.length + stats.upcoming14.inbounds.length;
  const totalDelayed = stats.delayed.releases.length + stats.delayed.inbounds.length;
  const totalFlagged = stats.flagged.missingAssets.length + stats.flagged.missingValues.length;

  return (
    <div>
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-value">{totalUpcoming}</div>
          <div className="stat-label">Next 14 Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.upcoming30.releases.length + stats.upcoming30.inbounds.length}</div>
          <div className="stat-label">Next 30 Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: totalDelayed > 0 ? 'var(--yellow-500)' : undefined }}>{totalDelayed}</div>
          <div className="stat-label">Delayed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: totalFlagged > 0 ? 'var(--red-500)' : undefined }}>{totalFlagged}</div>
          <div className="stat-label">Needs Attention</div>
        </div>
      </div>

      {/* Upcoming Items */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h3 className="section-title">Upcoming (14 Days)</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Brand</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.upcoming14.releases.map(r => (
                <tr key={r.id} onClick={() => onSelectRelease(r)}>
                  <td><strong>{r.title}</strong></td>
                  <td><TypeBadge type={r.type} /></td>
                  <td><BrandBadge brand={r.brand_unit} /></td>
                  <td>{formatRelativeDate(r.release_date)}</td>
                  <td><StatusBadge status={r.status} type="release" /></td>
                </tr>
              ))}
              {stats.upcoming14.inbounds.map(i => (
                <tr key={i.id} onClick={() => onSelectInbound(i)}>
                  <td>
                    <strong>{i.brand}</strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{i.po_number}</div>
                  </td>
                  <td><span className="badge badge-neutral">Inbound</span></td>
                  <td><BrandBadge brand={i.brand_unit} /></td>
                  <td>{formatRelativeDate(i.eta_date)}</td>
                  <td><StatusBadge status={i.status} type="inbound" /></td>
                </tr>
              ))}
              {totalUpcoming === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No items in the next 14 days</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delayed Items */}
      {totalDelayed > 0 && (
        <div>
          <h3 className="section-title">Delayed / Needs Attention</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Brand</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.delayed.releases.map(r => (
                  <tr key={r.id} onClick={() => onSelectRelease(r)}>
                    <td><strong>{r.title}</strong></td>
                    <td><TypeBadge type={r.type} /></td>
                    <td><BrandBadge brand={r.brand_unit} /></td>
                    <td>{formatRelativeDate(r.release_date)}</td>
                    <td><StatusBadge status={r.status} type="release" /></td>
                  </tr>
                ))}
                {stats.delayed.inbounds.map(i => (
                  <tr key={i.id} onClick={() => onSelectInbound(i)}>
                    <td>
                      <strong>{i.brand}</strong>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{i.po_number}</div>
                    </td>
                    <td><span className="badge badge-neutral">Inbound</span></td>
                    <td><BrandBadge brand={i.brand_unit} /></td>
                    <td>{formatRelativeDate(i.eta_date)}</td>
                    <td><StatusBadge status={i.status} type="inbound" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CALENDAR VIEW
// ============================================

function CalendarView({
  events,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const days = getCalendarDays(currentMonth);

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div>
      <div className="calendar-header">
        <h2 className="calendar-title">{formatMonthYear(currentMonth)}</h2>
        <div className="calendar-nav">
          <button className="btn btn-icon btn-ghost" onClick={() => setCurrentMonth(getPrevMonth(currentMonth))}>
            <Icons.ChevronLeft />
          </button>
          <button className="btn btn-secondary" onClick={() => setCurrentMonth(new Date())}>Today</button>
          <button className="btn btn-icon btn-ghost" onClick={() => setCurrentMonth(getNextMonth(currentMonth))}>
            <Icons.ChevronRight />
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonthAs(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={idx}
              className={cn('calendar-day', !isCurrentMonth && 'other-month', isCurrentDay && 'today')}
            >
              <div className="day-number">{format(day, 'd')}</div>
              <div className="day-events">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={cn('day-event', event.type)}
                    onClick={() => onSelectEvent(event)}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="day-event" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// CASH FLOW VIEW
// ============================================

function CashFlowView({
  cashFlow,
  onSelectInbound,
}: {
  cashFlow: MonthlyCashFlow[];
  onSelectInbound: (i: InboundOrderWithTotals) => void;
}) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const toggleMonth = (month: string) => {
    setExpandedMonth(expandedMonth === month ? null : month);
  };

  // Calculate running totals
  let runningTotal = 0;
  const monthsWithRunning = cashFlow.map((m) => {
    runningTotal += m.netCashFlow;
    return { ...m, runningTotal };
  });

  return (
    <div>
      <h3 className="section-title">Cash Flow Projections</h3>
      <p className="text-muted" style={{ marginBottom: 'var(--sp-4)', fontSize: '0.875rem' }}>
        Projected cash outflows based on payment terms. Click a month to see details.
      </p>

      <div className="cashflow-grid">
        {monthsWithRunning.map((month) => (
          <div key={month.month} className="cashflow-month">
            <div
              className="cashflow-header"
              onClick={() => toggleMonth(month.month)}
              style={{ cursor: 'pointer' }}
            >
              <div className="cashflow-month-title">
                <strong>{month.monthLabel}</strong>
                <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: 'var(--sp-2)' }}>
                  {month.outflows.length + month.inflows.length} items
                </span>
              </div>
              <div className="cashflow-summary">
                <div className="cashflow-item outflow">
                  <Icons.TrendingDown />
                  <span>{formatCurrency(month.totalOutflow)}</span>
                </div>
                <div className="cashflow-item inflow">
                  <Icons.TrendingUp />
                  <span>{formatCurrency(month.totalInflow)}</span>
                </div>
                <div
                  className={cn('cashflow-item net', month.netCashFlow >= 0 ? 'positive' : 'negative')}
                >
                  <strong>Net: {formatCurrency(Math.abs(month.netCashFlow))}</strong>
                  {month.netCashFlow < 0 && <span style={{ color: 'var(--red-500)' }}> (outflow)</span>}
                </div>
              </div>
            </div>

            {expandedMonth === month.month && (
              <div className="cashflow-details">
                {month.outflows.length > 0 && (
                  <div className="cashflow-section">
                    <h4 style={{ color: 'var(--red-600)', marginBottom: 'var(--sp-2)' }}>
                      <Icons.TrendingDown /> Outflows (Payments Due)
                    </h4>
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Due Date</th>
                          <th>Reference</th>
                          <th>Description</th>
                          <th className="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {month.outflows.map((entry) => (
                          <tr
                            key={entry.id}
                            onClick={() => {
                              if (entry.category === 'inbound_payment') {
                                onSelectInbound(entry.source as InboundOrderWithTotals);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>{formatDate(entry.date)}</td>
                            <td><code>{entry.reference}</code></td>
                            <td>{entry.description}</td>
                            <td className="text-right mono" style={{ color: 'var(--red-600)' }}>
                              -{formatCurrency(entry.amount, entry.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {month.inflows.length > 0 && (
                  <div className="cashflow-section" style={{ marginTop: 'var(--sp-3)' }}>
                    <h4 style={{ color: 'var(--green-600)', marginBottom: 'var(--sp-2)' }}>
                      <Icons.TrendingUp /> Projected Revenue
                    </h4>
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Release Date</th>
                          <th>Reference</th>
                          <th>Description</th>
                          <th className="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {month.inflows.map((entry) => (
                          <tr key={entry.id}>
                            <td>{formatDate(entry.date)}</td>
                            <td>{entry.reference}</td>
                            <td>{entry.description}</td>
                            <td className="text-right mono" style={{ color: 'var(--green-600)' }}>
                              +{formatCurrency(entry.amount, entry.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {month.outflows.length === 0 && month.inflows.length === 0 && (
                  <p className="text-muted" style={{ padding: 'var(--sp-3)', textAlign: 'center' }}>
                    No cash flow items for this month.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
        <div className="card-body">
          <h4 style={{ marginBottom: 'var(--sp-3)' }}>6-Month Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)', textAlign: 'center' }}>
            <div>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--red-600)' }}>
                {formatCurrency(cashFlow.reduce((sum, m) => sum + m.totalOutflow, 0))}
              </div>
              <div className="text-muted">Total Outflows</div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--green-600)' }}>
                {formatCurrency(cashFlow.reduce((sum, m) => sum + m.totalInflow, 0))}
              </div>
              <div className="text-muted">Projected Revenue</div>
            </div>
            <div>
              <div
                className="mono"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: runningTotal >= 0 ? 'var(--green-600)' : 'var(--red-600)',
                }}
              >
                {formatCurrency(Math.abs(runningTotal))}
                {runningTotal < 0 && <span style={{ fontSize: '0.875rem' }}> (deficit)</span>}
              </div>
              <div className="text-muted">Net Position</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LIST VIEW
// ============================================

function ListView({
  releases,
  inbounds,
  filters,
  onFiltersChange,
  vendors,
  onSelectRelease,
  onSelectInbound,
}: {
  releases: Release[];
  inbounds: InboundOrderWithTotals[];
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  vendors: string[];
  onSelectRelease: (r: Release) => void;
  onSelectInbound: (i: InboundOrderWithTotals) => void;
}) {
  const [activeTab, setActiveTab] = useState<'releases' | 'inbounds'>('releases');

  // Filter releases
  const filteredReleases = useMemo(() => {
    return releases.filter(r => {
      if (filters.brand_unit && filters.brand_unit !== 'all' && r.brand_unit !== filters.brand_unit) return false;
      if (filters.status && filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.type && filters.type !== 'all' && r.type !== filters.type) return false;
      if (filters.search && !r.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [releases, filters]);

  // Filter inbounds
  const filteredInbounds = useMemo(() => {
    return inbounds.filter(i => {
      if (filters.brand_unit && filters.brand_unit !== 'all' && i.brand_unit !== filters.brand_unit) return false;
      if (filters.status && filters.status !== 'all' && i.status !== filters.status) return false;
      if (filters.vendor && filters.vendor !== 'all' && i.vendor !== filters.vendor) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!i.brand.toLowerCase().includes(search) && 
            !i.po_number.toLowerCase().includes(search) &&
            !i.collection_name.toLowerCase().includes(search)) return false;
      }
      return true;
    });
  }, [inbounds, filters]);

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={onFiltersChange}
        vendors={vendors}
        showVendor={activeTab === 'inbounds'}
        showType={activeTab === 'releases'}
      />

      <div className="tabs">
        <button className={cn('tab', activeTab === 'releases' && 'active')} onClick={() => setActiveTab('releases')}>
          Releases ({filteredReleases.length})
        </button>
        <button className={cn('tab', activeTab === 'inbounds' && 'active')} onClick={() => setActiveTab('inbounds')}>
          Inbound Orders ({filteredInbounds.length})
        </button>
      </div>

      {activeTab === 'releases' ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Brand</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReleases.map(r => (
                <tr key={r.id} onClick={() => onSelectRelease(r)}>
                  <td><strong>{r.title}</strong></td>
                  <td><TypeBadge type={r.type} /></td>
                  <td><BrandBadge brand={r.brand_unit} /></td>
                  <td>{formatDate(r.release_date)}</td>
                  <td><StatusBadge status={r.status} type="release" /></td>
                </tr>
              ))}
              {filteredReleases.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No releases found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Brand / PO</th>
                <th>Collection</th>
                <th>Vendor</th>
                <th>ETA</th>
                <th className="text-right">Units</th>
                <th className="text-right">Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInbounds.map(i => (
                <tr key={i.id} onClick={() => onSelectInbound(i)}>
                  <td>
                    <strong>{i.brand}</strong>
                    <div className="mono text-muted" style={{ fontSize: '0.6875rem' }}>{i.po_number}</div>
                  </td>
                  <td>{i.collection_name}</td>
                  <td>{i.vendor}</td>
                  <td>{formatDate(i.eta_date)}</td>
                  <td className="text-right mono">{formatNumber(i.total_units)}</td>
                  <td className="text-right mono">{formatCurrency(i.total_cost, i.currency)}</td>
                  <td><StatusBadge status={i.status} type="inbound" /></td>
                </tr>
              ))}
              {filteredInbounds.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No inbound orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// RELEASE DRAWER
// ============================================

function ReleaseDrawer({
  release,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isNew,
}: {
  release: Release | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Release>) => void;
  onDelete: () => void;
  isNew: boolean;
}) {
  const [formData, setFormData] = useState<Partial<Release>>({});
  const [uploadResult, setUploadResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (release) {
      setFormData({ ...release });
    } else {
      setFormData({
        brand_unit: 'ENROUTE.CC',
        brand: '',
        title: '',
        type: 'Drop',
        release_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'Draft',
        summary: '',
        tags: [],
        assets: [],
        line_items: [],
        payment_terms: 'Net-30',
        projected_revenue: undefined,
        inventory_turnover_pct: undefined,
        owner: '',
      });
    }
    setUploadResult(null);
  }, [release]);

  const handleSave = () => {
    // Save brand to localStorage for future auto-suggest
    if (formData.brand?.trim()) {
      saveBrand(formData.brand);
    }
    onSave(formData);
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    setUploadResult(null);
    try {
      const result = await processUploadedFile(file);
      if (result.success && result.data) {
        setFormData({
          ...formData,
          line_items: [...(formData.line_items || []), ...result.data],
        });
        setUploadResult({ success: true, message: `Added ${result.data.length} items (${formatNumber(result.summary?.total_units || 0)} units)` });
      } else {
        setUploadResult({ success: false, message: result.error || 'Failed to parse file' });
      }
    } catch (error) {
      setUploadResult({ success: false, message: error instanceof Error ? error.message : 'Failed to process file' });
    }
  };

  const clearLineItems = () => {
    setFormData({ ...formData, line_items: [] });
  };

  const removeLineItem = (id: string) => {
    setFormData({ ...formData, line_items: (formData.line_items || []).filter(i => i.id !== id) });
  };

  const handleExportShopify = () => {
    if (!formData.line_items || formData.line_items.length === 0) return;
    const csv = exportToShopifyCSV(formData.line_items, {
      vendor: formData.brand || 'ENROUTE',
      productType: formData.type || 'Drop',
      tags: formData.tags || [],
      published: false,
    });
    const filename = `${formData.title || 'release'}-shopify-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCSV(csv, filename);
  };

  const totalUnits = formData.line_items?.reduce((sum, i) => sum + i.qty, 0) || 0;
  const totalCost = formData.line_items?.reduce((sum, i) => sum + (i.qty * i.unit_cost), 0) || 0;
  const totalValue = formData.line_items?.reduce((sum, i) => sum + (i.qty * (i.unit_retail || i.unit_cost * 2.5)), 0) || 0;

  return (
    <>
      <div className={cn('drawer-overlay', isOpen && 'open')} onClick={onClose} />
      <div className={cn('drawer', isOpen && 'open')}>
        <div className="drawer-header">
          <h3 className="drawer-title">{isNew ? 'New Release' : release?.title}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icons.X /></button>
        </div>

        <div className="drawer-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Brand Unit</label>
              <select className="input select" value={formData.brand_unit || ''} onChange={e => setFormData({ ...formData, brand_unit: e.target.value as BrandUnit })}>
                <option value="ENROUTE.CC">ENROUTE.CC</option>
                <option value="ENROUTE.RUN">ENROUTE.RUN</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Brand</label>
              <BrandAutoSuggest
                value={formData.brand || ''}
                onChange={brand => setFormData({ ...formData, brand })}
                placeholder="e.g., MAAP, Nike"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Title</label>
            <input className="input" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Summer Capsule Vol. 3" />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Type</label>
              <select className="input select" value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value as ReleaseType })}>
                <option value="Drop">Drop</option>
                <option value="Restock">Restock</option>
                <option value="Preorder">Preorder</option>
                <option value="Collaboration">Collaboration</option>
                <option value="Event">Event</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Status</label>
              <select className="input select" value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value as ReleaseStatus })}>
                <option value="Draft">Draft</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Delayed">Delayed</option>
                <option value="Landed">Landed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Release Date</label>
              <input type="date" className="input" value={formData.release_date || ''} onChange={e => setFormData({ ...formData, release_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Time (Optional)</label>
              <input type="time" className="input" value={formData.release_time || ''} onChange={e => setFormData({ ...formData, release_time: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Summary</label>
            <textarea className="input textarea" value={formData.summary || ''} onChange={e => setFormData({ ...formData, summary: e.target.value })} placeholder="Describe the release..." />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Tags (comma-separated)</label>
              <input className="input" value={formData.tags?.join(', ') || ''} onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="summer, capsule, SS25" />
            </div>
            <div className="form-group">
              <label className="label">Payment Terms</label>
              <select className="input select" value={formData.payment_terms || 'Net-30'} onChange={e => setFormData({ ...formData, payment_terms: e.target.value as PaymentTerms })}>
                <option value="Prepaid">Prepaid</option>
                <option value="COD">COD (Cash on Delivery)</option>
                <option value="Net-15">Net-15</option>
                <option value="Net-30">Net-30</option>
                <option value="Net-45">Net-45</option>
                <option value="Net-60">Net-60</option>
                <option value="Net-90">Net-90</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Projected Revenue ($)</label>
              <input
                type="number"
                className="input mono"
                value={formData.projected_revenue || ''}
                onChange={e => setFormData({ ...formData, projected_revenue: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 15000"
                min="0"
                step="100"
              />
            </div>
            <div className="form-group">
              <label className="label">Inventory Turnover (%)</label>
              <input
                type="number"
                className="input mono"
                value={formData.inventory_turnover_pct || ''}
                onChange={e => setFormData({ ...formData, inventory_turnover_pct: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 85"
                min="0"
                max="100"
                step="1"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Owner</label>
            <input className="input" value={formData.owner || ''} onChange={e => setFormData({ ...formData, owner: e.target.value })} placeholder="Name" />
          </div>

          <div className="form-group">
            <AssetManager
              assets={formData.assets || []}
              onChange={assets => setFormData({ ...formData, assets })}
              canEdit={true}
            />
          </div>

          {/* Line Items / Products Section */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
              <label className="label" style={{ margin: 0 }}>Products / Line Items</label>
              {(formData.line_items?.length || 0) > 0 && (
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <button className="btn btn-sm btn-secondary" onClick={handleExportShopify}>
                    <Icons.Download /> Export Shopify CSV
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={clearLineItems}>Clear All</button>
                </div>
              )}
            </div>

            <FileUploader onUpload={handleFileUpload} accept=".csv,.xlsx,.xls" />

            {uploadResult && (
              <div className={cn('upload-result', uploadResult.success ? 'success' : 'error')}>
                {uploadResult.message}
              </div>
            )}

            {(formData.line_items?.length || 0) > 0 && (
              <>
                <div className="line-items-summary" style={{ marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
                  <span><strong>{formData.line_items?.length}</strong> SKUs</span>
                  <span><strong>{formatNumber(totalUnits)}</strong> units</span>
                  <span>Cost: <strong>{formatCurrency(totalCost)}</strong></span>
                  <span>Retail: <strong>{formatCurrency(totalValue)}</strong></span>
                </div>

                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>UPC/Barcode</th>
                        <th>Size</th>
                        <th>Color</th>
                        <th>Qty</th>
                        <th>Cost</th>
                        <th>MSRP</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.line_items?.map(item => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td><code>{item.sku || '-'}</code></td>
                          <td><code>{item.barcode || '-'}</code></td>
                          <td>{item.size || '-'}</td>
                          <td>{item.color || '-'}</td>
                          <td>{item.qty}</td>
                          <td>{formatCurrency(item.unit_cost)}</td>
                          <td>{item.unit_retail ? formatCurrency(item.unit_retail) : '-'}</td>
                          <td>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => removeLineItem(item.id)}>
                              <Icons.X />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="drawer-footer">
          {!isNew && (
            <button className="btn btn-danger" onClick={onDelete}><Icons.Trash /> Delete</button>
          )}
          <div className="spacer" />
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{isNew ? 'Create' : 'Save'}</button>
        </div>
      </div>
    </>
  );
}

// ============================================
// INBOUND DRAWER
// ============================================

function InboundDrawer({
  inbound,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isNew,
}: {
  inbound: InboundOrderWithTotals | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<InboundOrderWithTotals>) => void;
  onDelete: () => void;
  isNew: boolean;
}) {
  const [formData, setFormData] = useState<Partial<InboundOrderWithTotals>>({});
  const [uploadResult, setUploadResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (inbound) {
      setFormData({ ...inbound });
    } else {
      setFormData({
        brand_unit: 'ENROUTE.CC',
        brand: '',
        collection_name: '',
        vendor: '',
        po_number: '',
        eta_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'Placed',
        currency: 'USD',
        payment_terms: 'Net-30',
        assets: [],
        line_items: [],
        notes: '',
      });
    }
    setUploadResult(null);
  }, [inbound]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    setUploadResult(null);
    try {
      const result = await processUploadedFile(file);
      if (result.success && result.data) {
        setFormData({
          ...formData,
          line_items: [...(formData.line_items || []), ...result.data],
        });
        setUploadResult({ success: true, message: `Added ${result.data.length} items (${formatNumber(result.summary?.total_units || 0)} units)` });
      } else {
        setUploadResult({ success: false, message: result.error || 'Failed to parse file' });
      }
    } catch (error) {
      setUploadResult({ success: false, message: error instanceof Error ? error.message : 'Failed to process file' });
    }
  };

  const clearLineItems = () => {
    setFormData({ ...formData, line_items: [] });
  };

  const removeLineItem = (id: string) => {
    setFormData({ ...formData, line_items: (formData.line_items || []).filter(i => i.id !== id) });
  };

  const handleExportShopify = () => {
    if (!formData.line_items || formData.line_items.length === 0) return;
    const csv = exportToShopifyCSV(formData.line_items, {
      vendor: formData.brand || 'ENROUTE',
      productType: formData.collection_name || '',
      tags: [],
      published: false,
    });
    const filename = `${formData.po_number || 'inbound'}-shopify-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCSV(csv, filename);
  };

  const totalUnits = formData.line_items?.reduce((sum, i) => sum + i.qty, 0) || 0;
  const totalCost = formData.line_items?.reduce((sum, i) => sum + (i.qty * i.unit_cost), 0) || 0;
  const totalValue = formData.line_items?.reduce((sum, i) => sum + (i.qty * (i.unit_retail || i.unit_cost * 2.5)), 0) || 0;

  return (
    <>
      <div className={cn('drawer-overlay', isOpen && 'open')} onClick={onClose} />
      <div className={cn('drawer', isOpen && 'open')}>
        <div className="drawer-header">
          <h3 className="drawer-title">{isNew ? 'New Inbound Order' : `${inbound?.brand} — ${inbound?.po_number}`}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><Icons.X /></button>
        </div>

        <div className="drawer-body">
          <div className="form-group">
            <label className="label">Brand Unit</label>
            <select className="input select" value={formData.brand_unit || ''} onChange={e => setFormData({ ...formData, brand_unit: e.target.value as BrandUnit })}>
              <option value="ENROUTE.CC">ENROUTE.CC</option>
              <option value="ENROUTE.RUN">ENROUTE.RUN</option>
            </select>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Brand</label>
              <input className="input" value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g., Nike, ENROUTE" />
            </div>
            <div className="form-group">
              <label className="label">Collection Name</label>
              <input className="input" value={formData.collection_name || ''} onChange={e => setFormData({ ...formData, collection_name: e.target.value })} placeholder="e.g., Summer Capsule Vol. 3" />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Vendor / Factory</label>
              <input className="input" value={formData.vendor || ''} onChange={e => setFormData({ ...formData, vendor: e.target.value })} placeholder="Vendor name" />
            </div>
            <div className="form-group">
              <label className="label">PO Number</label>
              <input className="input mono" value={formData.po_number || ''} onChange={e => setFormData({ ...formData, po_number: e.target.value })} placeholder="PO-2025-0001" />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">ETA Date</label>
              <input type="date" className="input" value={formData.eta_date || ''} onChange={e => setFormData({ ...formData, eta_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Status</label>
              <select className="input select" value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value as InboundStatus })}>
                <option value="Placed">Placed</option>
                <option value="In Transit">In Transit</option>
                <option value="Customs">Customs</option>
                <option value="Received Partial">Received Partial</option>
                <option value="Received Complete">Received Complete</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Currency</label>
              <select className="input select" value={formData.currency || ''} onChange={e => setFormData({ ...formData, currency: e.target.value as Currency })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Payment Terms</label>
              <select className="input select" value={formData.payment_terms || 'Net-30'} onChange={e => setFormData({ ...formData, payment_terms: e.target.value as PaymentTerms })}>
                <option value="Prepaid">Prepaid</option>
                <option value="COD">COD (Cash on Delivery)</option>
                <option value="Net-15">Net-15</option>
                <option value="Net-30">Net-30</option>
                <option value="Net-45">Net-45</option>
                <option value="Net-60">Net-60</option>
                <option value="Net-90">Net-90</option>
              </select>
            </div>
          </div>

          {/* Totals */}
          <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)', textAlign: 'center' }}>
              <div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{formatNumber(totalUnits)}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Units</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 600 }}>{formatCurrency(totalCost, formData.currency || 'USD')}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Cost</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--green-600)' }}>{formatCurrency(totalValue, formData.currency || 'USD')}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Est. Value</div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
              <label className="label" style={{ marginBottom: 0 }}>Line Items ({formData.line_items?.length || 0})</label>
              {(formData.line_items?.length || 0) > 0 && (
                <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                  <button className="btn btn-sm btn-secondary" onClick={handleExportShopify}>
                    <Icons.Download /> Export Shopify CSV
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={clearLineItems}>Clear All</button>
                </div>
              )}
            </div>

            {/* Upload Zone */}
            <FileUploader onUpload={handleFileUpload} label="Upload Line Items" />

            {uploadResult && (
              <div style={{ marginTop: 'var(--sp-2)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius-md)', background: uploadResult.success ? 'var(--green-50)' : 'var(--red-50)', color: uploadResult.success ? 'var(--green-700)' : 'var(--red-700)', fontSize: '0.8125rem' }}>
                {uploadResult.success ? <Icons.Check /> : <Icons.AlertCircle />} {uploadResult.message}
              </div>
            )}

            {/* Line Items Table */}
            {(formData.line_items?.length || 0) > 0 && (
              <div className="table-container" style={{ marginTop: 'var(--sp-3)', maxHeight: 300, overflow: 'auto' }}>
                <table className="table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>UPC/Barcode</th>
                      <th>Size</th>
                      <th>Color</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Cost</th>
                      <th className="text-right">MSRP</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.line_items?.map(item => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td><code style={{ fontSize: '0.625rem' }}>{item.sku || '-'}</code></td>
                        <td><code style={{ fontSize: '0.625rem' }}>{item.barcode || '-'}</code></td>
                        <td>{item.size || '-'}</td>
                        <td>{item.color || '-'}</td>
                        <td className="text-right mono">{item.qty}</td>
                        <td className="text-right mono">{formatCurrency(item.unit_cost, formData.currency || 'USD')}</td>
                        <td className="text-right mono">{item.unit_retail ? formatCurrency(item.unit_retail, formData.currency || 'USD') : '-'}</td>
                        <td>
                          <button className="btn btn-icon btn-ghost" style={{ width: 24, height: 24 }} onClick={() => removeLineItem(item.id)}>
                            <Icons.X />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="label">Notes</label>
            <textarea className="input textarea" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Internal notes..." />
          </div>

          <div className="form-group">
            <AssetManager
              assets={formData.assets || []}
              onChange={assets => setFormData({ ...formData, assets })}
              canEdit={true}
            />
          </div>
        </div>

        <div className="drawer-footer">
          {!isNew && (
            <button className="btn btn-danger" onClick={onDelete}><Icons.Trash /> Delete</button>
          )}
          <div className="spacer" />
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{isNew ? 'Create' : 'Save'}</button>
        </div>
      </div>
    </>
  );
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [releases, setReleases] = useState<Release[]>([]);
  const [inbounds, setInbounds] = useState<InboundOrderWithTotals[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [releaseDrawerOpen, setReleaseDrawerOpen] = useState(false);
  const [inboundDrawerOpen, setInboundDrawerOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [selectedInbound, setSelectedInbound] = useState<InboundOrderWithTotals | null>(null);
  const [isNewRelease, setIsNewRelease] = useState(false);
  const [isNewInbound, setIsNewInbound] = useState(false);

  // Upload wizard state
  const [uploadWizardOpen, setUploadWizardOpen] = useState(false);

  // Mobile event details drawer
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = generateId('toast');
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [r, i] = await Promise.all([
          dataStore.getReleases(),
          dataStore.getInboundOrders(),
        ]);
        setReleases(r);
        setInbounds(i);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Computed
  const vendors = useMemo(() => getUniqueVendors(inbounds), [inbounds]);
  const events = useMemo(() => {
    const evts: CalendarEvent[] = [];
    releases.forEach(r => evts.push({ id: r.id, type: 'release', date: r.release_date, title: r.title, brand_unit: r.brand_unit, status: r.status, data: r }));
    inbounds.forEach(i => evts.push({ id: i.id, type: 'inbound', date: i.eta_date, title: `${i.brand} - ${i.po_number}`, brand_unit: i.brand_unit, status: i.status, data: i }));
    return evts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [releases, inbounds]);
  const stats = useMemo(() => getDashboardStats(releases, inbounds), [releases, inbounds]);
  const cashFlow = useMemo(() => {
    const entries = generateCashFlowEntries(inbounds, releases);
    return groupCashFlowByMonth(entries, 6);
  }, [releases, inbounds]);

  // Export handlers
  const handleExportCalendar = () => {
    const calendarEvents = createCalendarEvents(releases, inbounds);
    const ics = generateICSCalendar(calendarEvents);
    downloadICS(ics, `enroute-calendar-${format(new Date(), 'yyyy-MM-dd')}.ics`);
  };

  const handleShareCalendar = async () => {
    const email = generateCalendarSummaryEmail(releases, inbounds);
    await copyToClipboard(email.body);
    alert('Calendar summary copied to clipboard!');
  };

  const handleEmailReminders = () => {
    const reminders = generate7DayReminders(releases);
    if (reminders.length === 0) {
      alert('No releases are exactly 7 days away.');
      return;
    }
    const emailContent = reminders.map(r => `Subject: ${r.subject}\n\n${r.body}`).join('\n\n---\n\n');
    copyToClipboard(emailContent);
    alert(`${reminders.length} reminder(s) copied to clipboard!`);
  };

  // Handlers
  const openNewRelease = () => { setSelectedRelease(null); setIsNewRelease(true); setReleaseDrawerOpen(true); };
  const openNewInbound = () => { setSelectedInbound(null); setIsNewInbound(true); setInboundDrawerOpen(true); };
  const openRelease = (r: Release) => { setSelectedRelease(r); setIsNewRelease(false); setReleaseDrawerOpen(true); };
  const openInbound = (i: InboundOrderWithTotals) => { setSelectedInbound(i); setIsNewInbound(false); setInboundDrawerOpen(true); };

  const handleSaveRelease = async (data: Partial<Release>) => {
    if (isNewRelease) {
      const newRelease = await dataStore.createRelease(data as any);
      setReleases([...releases, newRelease]);
    } else if (selectedRelease) {
      const updated = await dataStore.updateRelease(selectedRelease.id, data);
      if (updated) setReleases(releases.map(r => r.id === updated.id ? updated : r));
    }
  };

  const handleDeleteRelease = async () => {
    if (selectedRelease) {
      await dataStore.deleteRelease(selectedRelease.id);
      setReleases(releases.filter(r => r.id !== selectedRelease.id));
      setReleaseDrawerOpen(false);
    }
  };

  const handleSaveInbound = async (data: Partial<InboundOrderWithTotals>) => {
    if (isNewInbound) {
      const newInbound = await dataStore.createInboundOrder(data as any);
      setInbounds([...inbounds, newInbound]);
    } else if (selectedInbound) {
      const updated = await dataStore.updateInboundOrder(selectedInbound.id, data);
      if (updated) setInbounds(inbounds.map(i => i.id === updated.id ? updated : i));
    }
  };

  const handleDeleteInbound = async () => {
    if (selectedInbound) {
      await dataStore.deleteInboundOrder(selectedInbound.id);
      setInbounds(inbounds.filter(i => i.id !== selectedInbound.id));
      setInboundDrawerOpen(false);
    }
  };

  const handleSelectEvent = (e: CalendarEvent) => {
    // On mobile, show the event details drawer first
    if (window.innerWidth <= 768) {
      setSelectedEvent(e);
      setEventDrawerOpen(true);
    } else {
      // On desktop, open the full drawer directly
      if (e.type === 'release') openRelease(e.data as Release);
      else openInbound(e.data as InboundOrderWithTotals);
    }
  };

  const handleEventDrawerEdit = () => {
    if (!selectedEvent) return;
    setEventDrawerOpen(false);
    if (selectedEvent.type === 'release') {
      openRelease(selectedEvent.data as Release);
    } else {
      openInbound(selectedEvent.data as InboundOrderWithTotals);
    }
  };

  // Handle upload wizard submission
  const handleUploadWizardSubmit = async (wizardData: UploadWizardData) => {
    // Create an inbound order from the wizard data
    const lineItems: LineItem[] = wizardData.line_items.length > 0
      ? wizardData.line_items
      : [{
          id: generateId('item'),
          product_name: wizardData.collection_name,
          sku: wizardData.sku || undefined,
          qty: typeof wizardData.quantity === 'number' ? wizardData.quantity : 0,
          unit_cost: typeof wizardData.unit_cost === 'number' ? wizardData.unit_cost : 0,
        }];

    // Determine the ETA date based on order type
    let etaDate = wizardData.expected_arrival_date;
    if (wizardData.orderType === 'preorder' && wizardData.expected_arrival_date) {
      etaDate = wizardData.expected_arrival_date;
    } else if (wizardData.orderType === 'onetime' && wizardData.due_date) {
      etaDate = wizardData.due_date;
    }

    const newInbound = await dataStore.createInboundOrder({
      brand_unit: wizardData.brand_unit,
      brand: wizardData.brand,
      collection_name: wizardData.collection_name,
      vendor: wizardData.vendor,
      po_number: `PO-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      order_date: wizardData.order_date || format(new Date(), 'yyyy-MM-dd'),
      eta_date: etaDate,
      status: 'Placed',
      currency: wizardData.currency,
      payment_terms: wizardData.payment_terms,
      assets: [],
      line_items: lineItems,
      notes: wizardData.notes + (wizardData.orderType ? `\n[Order Type: ${wizardData.orderType}]` : ''),
    });

    setInbounds([...inbounds, newInbound]);

    // Also create a release if it's a preorder
    if (wizardData.orderType === 'preorder' && wizardData.preorder_open_date) {
      const newRelease = await dataStore.createRelease({
        brand_unit: wizardData.brand_unit,
        brand: wizardData.brand,
        title: `${wizardData.brand} - ${wizardData.collection_name} Pre-order`,
        type: 'Preorder',
        release_date: wizardData.preorder_open_date,
        status: 'Confirmed',
        summary: `Pre-order opens ${formatDate(wizardData.preorder_open_date)}${wizardData.preorder_close_date ? ` and closes ${formatDate(wizardData.preorder_close_date)}` : ''}`,
        tags: ['preorder'],
        assets: [],
        line_items: lineItems,
        payment_terms: wizardData.payment_terms,
        owner: '',
      });
      setReleases([...releases, newRelease]);
    }

    const orderTypeLabel = wizardData.orderType === 'preorder' ? 'Pre-order' : wizardData.orderType === 'restock' ? 'Re-stock' : 'One-time order';
    showToast(`${orderTypeLabel} created successfully!`, 'success');
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <div className="app">
      <Sidebar view={view} onViewChange={setView} onNewRelease={openNewRelease} onNewInbound={openNewInbound} />

      <main className="main">
        <header className="header">
          <h1 className="header-title">
            {view === 'dashboard' && 'Dashboard'}
            {view === 'calendar' && 'Calendar'}
            {view === 'list' && 'All Items'}
            {view === 'cashflow' && 'Cash Flow'}
          </h1>
          <div className="flex gap-2 desktop-actions">
            <button className="btn btn-ghost" onClick={handleExportCalendar} title="Export to Google Calendar">
              <Icons.Calendar /> Export .ics
            </button>
            <button className="btn btn-ghost" onClick={handleShareCalendar} title="Copy calendar summary">
              <Icons.Share /> Share
            </button>
            <button className="btn btn-ghost" onClick={handleEmailReminders} title="Generate 7-day reminders">
              <Icons.Mail /> Reminders
            </button>
            <button className="btn btn-primary" onClick={() => setUploadWizardOpen(true)}>
              <Icons.Upload /> Upload
            </button>
          </div>
        </header>

        <div className="content">
          {view === 'dashboard' && (
            <DashboardView stats={stats} onSelectRelease={openRelease} onSelectInbound={openInbound} />
          )}
          {view === 'calendar' && (
            <CalendarView events={events} onSelectEvent={handleSelectEvent} />
          )}
          {view === 'list' && (
            <ListView
              releases={releases}
              inbounds={inbounds}
              filters={filters}
              onFiltersChange={setFilters}
              vendors={vendors}
              onSelectRelease={openRelease}
              onSelectInbound={openInbound}
            />
          )}
          {view === 'cashflow' && (
            <CashFlowView cashFlow={cashFlow} onSelectInbound={openInbound} />
          )}
        </div>
      </main>

      <ReleaseDrawer
        release={selectedRelease}
        isOpen={releaseDrawerOpen}
        onClose={() => setReleaseDrawerOpen(false)}
        onSave={handleSaveRelease}
        onDelete={handleDeleteRelease}
        isNew={isNewRelease}
      />

      <InboundDrawer
        inbound={selectedInbound}
        isOpen={inboundDrawerOpen}
        onClose={() => setInboundDrawerOpen(false)}
        onSave={handleSaveInbound}
        onDelete={handleDeleteInbound}
        isNew={isNewInbound}
      />

      {/* Upload Wizard Modal */}
      <UploadWizardModal
        isOpen={uploadWizardOpen}
        onClose={() => setUploadWizardOpen(false)}
        onSubmit={handleUploadWizardSubmit}
      />

      {/* Mobile Event Details Drawer */}
      <EventDetailsDrawer
        event={selectedEvent}
        isOpen={eventDrawerOpen}
        onClose={() => setEventDrawerOpen(false)}
        onEdit={handleEventDrawerEdit}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        view={view}
        onViewChange={setView}
        onUploadClick={() => setUploadWizardOpen(true)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
