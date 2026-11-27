export type WarehouseType =
  | 'COLD_STORAGE'
  | 'ABF_FREEZER'
  | 'CHILLER'
  | 'TRANSIT_PORT'
  | 'DRY_PACKAGING';

export type FishStorageType = 'FRESH' | 'CHILLED' | 'FROZEN' | 'DRY';

export type MovementType =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'SALES_OUT'
  | 'OPNAME_ADJUSTMENT';

export interface InventoryWarehouse {
  id: string;
  warehouse_code: string;
  warehouse_name: string;
  warehouse_type: WarehouseType;
  location: string;
  target_temp_c: number;
  capacity_kg: number;
  pic_name: string;
  pic_phone: string;
  is_active: boolean;
  created_at?: string;
}

export interface StockBalanceRecord {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  product_sku: string;
  product_name?: string;
  fish_species?: string;
  fish_category?: string;
  grade?: string;
  min_stock_qty?: number;
  batch_no: string;
  barcode_code: string;
  qty_on_hand: number;
  qty_reserved: number;
  unit: string;
  avg_unit_cost: number;
  harvest_date?: string | null;
  expiry_date?: string | null;
  last_movement_at: string;
}

export interface StockMovementRecord {
  id: string;
  movement_no: string;
  movement_date: string;
  movement_type: MovementType;
  warehouse_id: string;
  warehouse_name?: string;
  product_sku: string;
  product_name: string;
  batch_no: string;
  barcode_code?: string;
  qty_delta: number;
  unit: string;
  balance_before: number;
  balance_after: number;
  unit_cost: number;
  reference_type: string;
  reference_no: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface InboundItemInput {
  product_sku: string;
  product_name: string;
  batch_no: string;
  barcode_code?: string;
  qty: number;
  unit: string;
  unit_cost: number;
  grade?: string;
  temperature_c?: number;
  harvest_date?: string;
  expiry_date?: string;
}

export interface InboundHeaderRecord {
  id: string;
  inbound_no: string;
  inbound_date: string;
  warehouse_id: string;
  warehouse_name?: string;
  supplier_id?: string;
  supplier_name: string;
  vessel_name?: string;
  landing_port?: string;
  qc_status: 'LOLOS_QC' | 'KARANTINA' | 'DITOLAK';
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  total_qty: number;
  total_value: number;
  notes?: string;
  created_by: string;
  posted_at?: string;
  items: InboundItemInput[];
}

export interface BarcodeLabelRecord {
  id: string;
  barcode_code: string;
  product_sku: string;
  product_name: string;
  warehouse_id?: string;
  warehouse_name?: string;
  batch_no: string;
  pack_weight_kg: number;
  grade: string;
  harvest_date?: string | null;
  expiry_date?: string | null;
  print_count: number;
  last_printed_at?: string | null;
  created_by?: string;
  created_at?: string;
}

export interface TransferItemInput {
  product_sku: string;
  product_name: string;
  batch_no: string;
  qty: number;
  unit: string;
}

export interface StockTransferRecord {
  id: string;
  transfer_no: string;
  transfer_date: string;
  source_warehouse_id: string;
  source_warehouse_name?: string;
  dest_warehouse_id: string;
  dest_warehouse_name?: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  total_qty: number;
  notes?: string;
  created_by: string;
  posted_at?: string;
  items: TransferItemInput[];
}

export interface SalesOrderItemInput {
  product_sku: string;
  product_name: string;
  batch_no: string;
  qty: number;
  unit: string;
  unit_price: number;
}

export interface SalesOrderRecord {
  id: string;
  sales_no: string;
  sales_date: string;
  warehouse_id: string;
  warehouse_name?: string;
  customer_id?: string;
  customer_name: string;
  sales_channel: 'B2B_GROSIR' | 'EKSPOR' | 'MBG_KOPERASI' | 'RETAIL_MITRA';
  payment_method: string;
  status: 'DRAFT' | 'CONFIRMED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
  payment_status: 'BELUM_LUNAS' | 'DP' | 'LUNAS';
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  ledger_transaction_no?: string | null;
  notes?: string;
  created_by: string;
  items: SalesOrderItemInput[];
}

export interface OutboundItemInput {
  product_sku: string;
  product_name: string;
  batch_no: string;
  qty: number;
  unit: string;
}

export interface OutboundHeaderRecord {
  id: string;
  outbound_no: string;
  outbound_date: string;
  warehouse_id: string;
  warehouse_name?: string;
  outbound_type: 'SALES_DELIVERY' | 'SAMPLE_QC' | 'SPOILAGE_SHRINK' | 'INTERNAL_USE';
  sales_no?: string;
  recipient_name: string;
  vehicle_no?: string;
  driver_name?: string;
  delivery_note_no?: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  total_qty: number;
  notes?: string;
  created_by: string;
  posted_at?: string;
  items: OutboundItemInput[];
}

export interface StockOpnameItemInput {
  product_sku: string;
  product_name: string;
  batch_no: string;
  system_qty: number;
  physical_qty: number;
  variance_qty: number;
  unit: string;
  reason?: string;
}

export interface StockOpnameRecord {
  id: string;
  opname_no: string;
  opname_date: string;
  warehouse_id: string;
  warehouse_name?: string;
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED';
  total_items: number;
  total_variance_qty: number;
  notes?: string;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  items: StockOpnameItemInput[];
}

export interface InventorySchemaStatus {
  ready: boolean;
  source: 'SUPABASE' | 'LOCAL_OFFLINE';
  missingTables: string[];
  checkedAt: string;
  message: string;
}

export interface InventoryDashboardSummary {
  totalOnHandKg: number;
  totalInventoryValue: number;
  totalActiveSkus: number;
  totalInboundQty: number;
  totalOutboundQty: number;
  totalSalesRevenue: number;
  totalSalesOrders: number;
  lowStockAlerts: Array<{
    sku_code: string;
    sku_name: string;
    warehouse_name: string;
    qty_on_hand: number;
    min_stock_qty: number;
    unit: string;
  }>;
  expiringSoonLots: Array<{
    sku_code: string;
    sku_name: string;
    batch_no: string;
    warehouse_name: string;
    qty_on_hand: number;
    expiry_date: string;
    days_remaining: number;
  }>;
  warehouseUtilization: Array<{
    warehouse_id: string;
    warehouse_code: string;
    warehouse_name: string;
    warehouse_type: WarehouseType;
    target_temp_c: number;
    qty_on_hand: number;
    capacity_kg: number;
    utilization_pct: number;
  }>;
}
