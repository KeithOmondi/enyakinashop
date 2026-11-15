/** Shapes returned by the API (see server/src/modules). Money is integer KES cents. */

export type Role = 'super_admin' | 'admin' | 'shop_manager';

export interface Business {
  id: string;
  code: string;
  name: string;
  role: Role;
}

export interface Me {
  user: { id: string; email: string; name: string; isSuperAdmin: boolean };
  businesses: Business[];
  timezone: string;
}

export interface BusinessProfile {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  receiptFooter: string | null;
  timezone: string;
  currency: string;
  /** Whether product photo storage (Cloudflare R2) is set up on the server. */
  imagesEnabled: boolean;
  /** off = typed codes only, simulator = pretend Safaricom (development), daraja = live M-Pesa prompts. */
  mpesaMode: 'off' | 'simulator' | 'daraja';
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
  productCount: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  unit: string;
  allowsFraction: boolean;
  priceCents: number;
  costCents: number;
  reorderLevel: number;
  active: boolean;
  imageUrl: string | null;
  quantity: number;
  lowStock: boolean;
}

export interface Movement {
  id: number;
  productId: string;
  productName: string;
  sku: string;
  type: 'opening' | 'purchase' | 'sale' | 'void' | 'adjustment';
  quantity: number;
  balanceAfter: number;
  note: string | null;
  userName: string | null;
  createdAt: string;
}

export interface InventorySummary {
  products: number;
  units: number;
  valueCents: number;
  lowStock: number;
  outOfStock: number;
}

export type PayMethod = 'cash' | 'mpesa' | 'card';

export interface SaleRow {
  id: string;
  receiptNo: number;
  status: 'completed' | 'voided';
  totalCents: number;
  createdAt: string;
  cashierName: string;
  itemCount: number;
  methods: string | null;
}

export interface Sale extends SaleRow {
  subtotalCents: number;
  discountCents: number;
  paidCents: number;
  changeCents: number;
  note: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  voidedByName: string | null;
  items: { productId: string; name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  payments: { method: PayMethod; amountCents: number; reference: string | null; verified: boolean }[];
}

export interface PurchaseRow {
  id: string;
  supplierName: string | null;
  reference: string | null;
  note: string | null;
  totalCents: number;
  createdByName: string;
  createdAt: string;
}

export interface Purchase extends PurchaseRow {
  items: { productId: string; productName: string; sku: string; quantity: number; unitCostCents: number }[];
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'shop_manager';
  active: boolean;
}

export interface AuditRow {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  userName: string | null;
}

export interface DayPreview {
  date: string;
  salesCount: number;
  totalCents: number;
  cashCents: number;
  mpesaCents: number;
  cardCents: number;
  voidedCount: number;
  /** M-Pesa entered by hand (not confirmed by a prompt): check it against the statement. */
  unverifiedMpesaCents: number;
  expectedCashCents: number;
  closing: { id: string; countedCashCents: number; varianceCents: number; createdAt: string } | null;
}

export interface Closing {
  id: string;
  businessDate: string;
  salesCount: number;
  totalCents: number;
  cashCents: number;
  mpesaCents: number;
  cardCents: number;
  countedCashCents: number;
  varianceCents: number;
  note: string | null;
  createdAt: string;
  closedByName: string;
}

export interface ReportSummary {
  from: string;
  to: string;
  salesCount: number;
  voidedCount: number;
  revenueCents: number;
  discountCents: number;
  cogsCents: number;
  grossProfitCents: number;
  averageSaleCents: number;
  byDay: { date: string; salesCount: number; revenueCents: number; profitCents: number }[];
  byPayment: { method: PayMethod; amountCents: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenueCents: number }[];
}

export interface StockValuationRow {
  categoryName: string | null;
  products: number;
  units: number;
  costValueCents: number;
  retailValueCents: number;
}

export interface MpesaRequest {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'timeout';
  amountCents: number;
  /** Masked, e.g. 254712***678 */
  phone: string;
  receipt: string | null;
  resultDesc: string | null;
  expiresAt: string;
  saleId: string | null;
}

export interface MpesaRequestRow {
  id: string;
  status: MpesaRequest['status'];
  amountCents: number;
  phone: string;
  receipt: string | null;
  resultDesc: string | null;
  createdAt: string;
  createdByName: string;
  receiptNo: number | null;
  /** Paid by the customer but not attached to any sale. */
  unmatched: boolean;
}
