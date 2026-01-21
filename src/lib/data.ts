import {
  Release,
  InboundOrder,
  InboundOrderWithTotals,
  CalendarEvent,
  DashboardStats,
} from '@/types';
import { seedReleases, seedInboundOrders } from '@/data/seed';
import { differenceInDays, parseISO } from 'date-fns';

// ============================================
// DATA STORE INTERFACE
// ============================================

export interface DataStore {
  // Releases
  getReleases(): Promise<Release[]>;
  getRelease(id: string): Promise<Release | null>;
  createRelease(data: Omit<Release, 'id' | 'created_at' | 'updated_at'>): Promise<Release>;
  updateRelease(id: string, data: Partial<Release>): Promise<Release | null>;
  deleteRelease(id: string): Promise<boolean>;
  
  // Inbound Orders
  getInboundOrders(): Promise<InboundOrderWithTotals[]>;
  getInboundOrder(id: string): Promise<InboundOrderWithTotals | null>;
  createInboundOrder(data: Omit<InboundOrder, 'id' | 'created_at' | 'updated_at'>): Promise<InboundOrderWithTotals>;
  updateInboundOrder(id: string, data: Partial<InboundOrder>): Promise<InboundOrderWithTotals | null>;
  deleteInboundOrder(id: string): Promise<boolean>;
}

// ============================================
// HELPER: Calculate totals for inbound order
// ============================================

function calculateTotals(order: InboundOrder): InboundOrderWithTotals {
  const totalUnits = order.line_items.reduce((sum, item) => sum + item.qty, 0);
  const totalCost = order.line_items.reduce((sum, item) => sum + (item.qty * item.unit_cost), 0);
  const totalValue = order.line_items.reduce((sum, item) => {
    const retail = item.unit_retail || item.unit_cost * 2.5;
    return sum + (item.qty * retail);
  }, 0);
  const totalSkus = order.line_items.length;
  
  return {
    ...order,
    total_units: totalUnits,
    total_cost: totalCost,
    total_value: totalValue,
    total_skus: totalSkus,
  };
}

// ============================================
// LOCAL MEMORY STORE (Development)
// ============================================

class LocalMemoryStore implements DataStore {
  private releases: Release[] = [...seedReleases];
  private inboundOrders: InboundOrder[] = [...seedInboundOrders];
  
  // Releases
  async getReleases(): Promise<Release[]> {
    return [...this.releases].sort((a, b) => 
      new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
    );
  }
  
  async getRelease(id: string): Promise<Release | null> {
    return this.releases.find(r => r.id === id) || null;
  }
  
  async createRelease(data: Omit<Release, 'id' | 'created_at' | 'updated_at'>): Promise<Release> {
    const now = new Date().toISOString();
    const release: Release = {
      ...data,
      id: `release-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    this.releases.push(release);
    return release;
  }
  
  async updateRelease(id: string, data: Partial<Release>): Promise<Release | null> {
    const idx = this.releases.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.releases[idx] = {
      ...this.releases[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return this.releases[idx];
  }
  
  async deleteRelease(id: string): Promise<boolean> {
    const idx = this.releases.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.releases.splice(idx, 1);
    return true;
  }
  
  // Inbound Orders
  async getInboundOrders(): Promise<InboundOrderWithTotals[]> {
    return [...this.inboundOrders]
      .map(calculateTotals)
      .sort((a, b) => new Date(a.eta_date).getTime() - new Date(b.eta_date).getTime());
  }
  
  async getInboundOrder(id: string): Promise<InboundOrderWithTotals | null> {
    const order = this.inboundOrders.find(o => o.id === id);
    return order ? calculateTotals(order) : null;
  }
  
  async createInboundOrder(data: Omit<InboundOrder, 'id' | 'created_at' | 'updated_at'>): Promise<InboundOrderWithTotals> {
    const now = new Date().toISOString();
    const order: InboundOrder = {
      ...data,
      id: `inbound-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    this.inboundOrders.push(order);
    return calculateTotals(order);
  }
  
  async updateInboundOrder(id: string, data: Partial<InboundOrder>): Promise<InboundOrderWithTotals | null> {
    const idx = this.inboundOrders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.inboundOrders[idx] = {
      ...this.inboundOrders[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    return calculateTotals(this.inboundOrders[idx]);
  }
  
  async deleteInboundOrder(id: string): Promise<boolean> {
    const idx = this.inboundOrders.findIndex(o => o.id === id);
    if (idx === -1) return false;
    this.inboundOrders.splice(idx, 1);
    return true;
  }
}

// ============================================
// SINGLETON STORE INSTANCE
// ============================================

export const dataStore: DataStore = new LocalMemoryStore();

// ============================================
// DATA HELPERS
// ============================================

export async function getCalendarEvents(
  releases: Release[],
  inbounds: InboundOrderWithTotals[]
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  
  for (const release of releases) {
    events.push({
      id: release.id,
      type: 'release',
      date: release.release_date,
      title: release.title,
      brand_unit: release.brand_unit,
      status: release.status,
      data: release,
    });
  }
  
  for (const inbound of inbounds) {
    events.push({
      id: inbound.id,
      type: 'inbound',
      date: inbound.eta_date,
      title: `${inbound.brand} - ${inbound.po_number}`,
      brand_unit: inbound.brand_unit,
      status: inbound.status,
      data: inbound,
    });
  }
  
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getDashboardStats(
  releases: Release[],
  inbounds: InboundOrderWithTotals[]
): DashboardStats {
  const now = new Date();
  
  const isWithinDays = (dateStr: string, days: number) => {
    const diff = differenceInDays(parseISO(dateStr), now);
    return diff >= 0 && diff <= days;
  };
  
  const isDelayed = (item: Release | InboundOrderWithTotals) => {
    if ('release_date' in item) {
      return item.status === 'Delayed';
    }
    return item.status === 'Received Partial' || 
           (differenceInDays(parseISO(item.eta_date), now) < 0 && 
            item.status !== 'Received Complete' && item.status !== 'Cancelled');
  };
  
  return {
    upcoming14: {
      releases: releases.filter(r => isWithinDays(r.release_date, 14) && r.status !== 'Cancelled'),
      inbounds: inbounds.filter(i => isWithinDays(i.eta_date, 14) && i.status !== 'Cancelled' && i.status !== 'Received Complete'),
    },
    upcoming30: {
      releases: releases.filter(r => isWithinDays(r.release_date, 30) && r.status !== 'Cancelled'),
      inbounds: inbounds.filter(i => isWithinDays(i.eta_date, 30) && i.status !== 'Cancelled' && i.status !== 'Received Complete'),
    },
    upcoming60: {
      releases: releases.filter(r => isWithinDays(r.release_date, 60) && r.status !== 'Cancelled'),
      inbounds: inbounds.filter(i => isWithinDays(i.eta_date, 60) && i.status !== 'Cancelled' && i.status !== 'Received Complete'),
    },
    delayed: {
      releases: releases.filter(r => isDelayed(r)),
      inbounds: inbounds.filter(i => isDelayed(i)),
    },
    flagged: {
      missingETA: [],
      missingAssets: releases.filter(r => r.assets.length === 0 && r.status !== 'Cancelled'),
      missingValues: inbounds.filter(i => i.total_cost === 0 && i.status !== 'Cancelled'),
    },
  };
}

export function getUniqueVendors(inbounds: InboundOrderWithTotals[]): string[] {
  const vendors = new Set(inbounds.map(i => i.vendor));
  return Array.from(vendors).sort();
}

export function getUniqueBrands(inbounds: InboundOrderWithTotals[]): string[] {
  const brands = new Set(inbounds.map(i => i.brand));
  return Array.from(brands).sort();
}
