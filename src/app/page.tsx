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

// ============================================
// SIDEBAR
// ============================================

type ViewType = 'dashboard' | 'calendar' | 'list';

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

  useEffect(() => {
    if (release) {
      setFormData({ ...release });
    } else {
      setFormData({
        brand_unit: 'ENROUTE.CC',
        title: '',
        type: 'Drop',
        release_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'Draft',
        summary: '',
        tags: [],
        assets: [],
        owner: '',
      });
    }
  }, [release]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <>
      <div className={cn('drawer-overlay', isOpen && 'open')} onClick={onClose} />
      <div className={cn('drawer', isOpen && 'open')}>
        <div className="drawer-header">
          <h3 className="drawer-title">{isNew ? 'New Release' : release?.title}</h3>
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

          <div className="form-group">
            <label className="label">Tags (comma-separated)</label>
            <input className="input" value={formData.tags?.join(', ') || ''} onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="summer, capsule, SS25" />
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
  };

  const clearLineItems = () => {
    setFormData({ ...formData, line_items: [] });
  };

  const removeLineItem = (id: string) => {
    setFormData({ ...formData, line_items: (formData.line_items || []).filter(i => i.id !== id) });
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
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-2)' }}>
              <label className="label" style={{ marginBottom: 0 }}>Line Items ({formData.line_items?.length || 0})</label>
              {(formData.line_items?.length || 0) > 0 && (
                <button className="btn btn-sm btn-danger" onClick={clearLineItems}>Clear All</button>
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
                      <th>Size</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Cost</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.line_items?.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div>{item.product_name}</div>
                          {item.sku && <div className="mono text-muted" style={{ fontSize: '0.625rem' }}>{item.sku}</div>}
                        </td>
                        <td>{item.size || '-'}</td>
                        <td className="text-right mono">{item.qty}</td>
                        <td className="text-right mono">{formatCurrency(item.unit_cost, formData.currency || 'USD')}</td>
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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const [r, i] = await Promise.all([
        dataStore.getReleases(),
        dataStore.getInboundOrders(),
      ]);
      setReleases(r);
      setInbounds(i);
      setLoading(false);
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
    if (e.type === 'release') openRelease(e.data as Release);
    else openInbound(e.data as InboundOrderWithTotals);
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
          </h1>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={openNewRelease}><Icons.Plus /> Release</button>
            <button className="btn btn-primary" onClick={openNewInbound}><Icons.Plus /> Inbound</button>
          </div>
        </header>

        <div className="content">
          {view === 'dashboard' && (
            <DashboardView stats={stats as any} onSelectRelease={openRelease} onSelectInbound={openInbound} />
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
    </div>
  );
}
