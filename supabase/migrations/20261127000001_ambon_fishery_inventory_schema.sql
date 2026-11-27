-- ==============================================================================
-- KOPSIM MANDIRI: OPERASIONAL BISNIS — INVENTORY & PERIKANAN AMBON
-- Migration: 20261127000001_ambon_fishery_inventory_schema.sql
-- Principle: EXTEND EXISTING SYSTEM, NOT REBUILD (Non-Destructive & RLS-Enabled)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PERLUASAN NON-DESTRUKTIF TABEL MASTER EXISTING (public.products)
-- ==============================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit VARCHAR(30) DEFAULT 'Kg';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_price NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fish_species VARCHAR(120) DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fish_category VARCHAR(80) DEFAULT 'Pelagis Besar';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage_type VARCHAR(40) DEFAULT 'FROZEN';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode VARCHAR(120);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_qty NUMERIC(14, 2) DEFAULT 100.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin_region VARCHAR(100) DEFAULT 'Ambon & Maluku';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
  ON public.products (barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

-- Seed / Upsert tambahan katalog produk perikanan Ambon ke public.products (Idempotent)
INSERT INTO public.products (
  id, sku_code, sku_name, group_id, group_name, subgroup, brand, grade,
  packaging, availability, moq, supply_capacity, unit, default_price,
  fish_species, fish_category, storage_type, barcode, min_stock_qty, origin_region, is_active
)
VALUES
  ('PRD-AMB-01', 'SKU-AMB-TUNA-YL', 'Tuna Sirip Kuning Loin Beku (Yellowfin Loin)', 'GRP-IKAN', 'TRADING IKAN', 'Ikan Pelagis Besar', 'Kopsim Bahari Ambon', 'Grade A Sashimi', 'Vacuum Pack Carton 20kg', 'Tersedia', 20, '25 Ton / Bulan', 'Kg', 82000, 'Thunnus albacares (Yellowfin Tuna)', 'Pelagis Besar', 'FROZEN', '8997001001014', 250, 'Pelabuhan Perikanan Nusantara Ambon', TRUE),
  ('PRD-AMB-02', 'SKU-AMB-CAKALANG', 'Ikan Cakalang Beku Utuh (Skipjack Whole Round)', 'GRP-IKAN', 'TRADING IKAN', 'Ikan Pelagis', 'Kopsim Bahari Ambon', 'Export Grade A', 'Blok Karung / Master Box 25kg', 'Tersedia', 50, '40 Ton / Bulan', 'Kg', 28500, 'Katsuwonus pelamis (Cakalang)', 'Pelagis', 'FROZEN', '8997001001021', 500, 'Laut Banda / Ambon', TRUE),
  ('PRD-AMB-03', 'SKU-AMB-TONGKOL', 'Ikan Tongkol Komo Beku (Eastern Little Tuna)', 'GRP-IKAN', 'TRADING IKAN', 'Ikan Pelagis', 'Kopsim Bahari Ambon', 'Grade A', 'Master Box 20kg', 'Tersedia', 40, '30 Ton / Bulan', 'Kg', 24000, 'Euthynnus affinis (Tongkol)', 'Pelagis', 'FROZEN', '8997001001038', 400, 'Perairan Ambon & Seram', TRUE),
  ('PRD-AMB-04', 'SKU-AMB-KAKAP', 'Kakap Merah Ambon Utuh / Fillet (Red Snapper)', 'GRP-IKAN', 'TRADING IKAN', 'Ikan Demersal / Karang', 'Kopsim Bahari Ambon', 'Super Export', 'Vacuum IQF 10kg', 'Tersedia', 20, '12 Ton / Bulan', 'Kg', 95000, 'Lutjanus malabaricus (Kakap Merah)', 'Demersal & Karang', 'FROZEN', '8997001001045', 150, 'Pulau Ambon & Lease', TRUE),
  ('PRD-AMB-05', 'SKU-AMB-KERAPU', 'Ikan Kerapu Sunu / Macan Segar Dingin', 'GRP-IKAN', 'TRADING IKAN', 'Ikan Demersal / Karang', 'Kopsim Bahari Ambon', 'Grade A Chilled', 'Styrofoam Box + Ice 25kg', 'Tersedia', 25, '8 Ton / Bulan', 'Kg', 115000, 'Plectropomus leopardus (Kerapu)', 'Demersal & Karang', 'CHILLED', '8997001001052', 100, 'Teluk Ambon & Tulehu', TRUE),
  ('PRD-AMB-06', 'SKU-AMB-LAYANG', 'Ikan Layang Benggol / Momar Ambon Beku', 'GRP-IKAN', 'TRADING IKAN', 'Ikan Pelagis Kecil', 'Kopsim Bahari Ambon', 'Grade A', 'Karton Block 10kg', 'Tersedia', 50, '35 Ton / Bulan', 'Kg', 21000, 'Decapterus spp. (Layang / Momar)', 'Pelagis Kecil', 'FROZEN', '8997001001069', 500, 'Teluk Ambon', TRUE),
  ('PRD-AMB-07', 'SKU-AMB-CUMI', 'Cumi-Cumi Loligo Maluku Beku (Whole Cleaned)', 'GRP-IKAN', 'TRADING IKAN', 'Cephalopoda', 'Kopsim Bahari Ambon', 'Export Grade', 'Master Carton 10kg', 'Tersedia', 20, '15 Ton / Bulan', 'Kg', 78000, 'Loligo spp. (Cumi Maluku)', 'Cephalopoda', 'FROZEN', '8997001001076', 200, 'Laut Seram & Ambon', TRUE),
  ('PRD-AMB-08', 'SKU-AMB-TENGGIRI', 'Ikan Tenggiri Papan Beku (Spanish Mackerel)', 'GRP-IKAN', 'TRADING IKAN', 'Ikan Pelagis Besar', 'Kopsim Bahari Ambon', 'Grade A', 'Polybag + Karton 20kg', 'Tersedia', 20, '10 Ton / Bulan', 'Kg', 72000, 'Scomberomorus commerson (Tenggiri)', 'Pelagis Besar', 'FROZEN', '8997001001083', 150, 'Perairan Maluku Tengah', TRUE)
ON CONFLICT (sku_code) DO UPDATE SET
  fish_species = COALESCE(NULLIF(public.products.fish_species, ''), EXCLUDED.fish_species),
  fish_category = COALESCE(NULLIF(public.products.fish_category, ''), EXCLUDED.fish_category),
  storage_type = COALESCE(NULLIF(public.products.storage_type, ''), EXCLUDED.storage_type),
  barcode = COALESCE(NULLIF(public.products.barcode, ''), EXCLUDED.barcode),
  min_stock_qty = COALESCE(public.products.min_stock_qty, EXCLUDED.min_stock_qty),
  origin_region = COALESCE(NULLIF(public.products.origin_region, ''), EXCLUDED.origin_region),
  unit = COALESCE(NULLIF(public.products.unit, ''), EXCLUDED.unit),
  default_price = CASE WHEN COALESCE(public.products.default_price, 0) = 0 THEN EXCLUDED.default_price ELSE public.products.default_price END;

-- ==============================================================================
-- 2. GUDANG & COLD STORAGE PERIKANAN AMBON (inventory_warehouses)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_warehouses (
  id VARCHAR(50) PRIMARY KEY DEFAULT ('WH-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  warehouse_code VARCHAR(40) NOT NULL UNIQUE,
  warehouse_name VARCHAR(180) NOT NULL,
  warehouse_type VARCHAR(40) NOT NULL DEFAULT 'COLD_STORAGE' CHECK (warehouse_type IN ('COLD_STORAGE', 'ABF_FREEZER', 'CHILLER', 'TRANSIT_PORT', 'DRY_PACKAGING')),
  location VARCHAR(255) NOT NULL DEFAULT 'Ambon, Maluku',
  target_temp_c NUMERIC(5, 1) DEFAULT -20.0,
  capacity_kg NUMERIC(14, 2) NOT NULL DEFAULT 50000.00 CHECK (capacity_kg > 0),
  pic_name VARCHAR(150) DEFAULT '',
  pic_phone VARCHAR(60) DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.inventory_warehouses (id, warehouse_code, warehouse_name, warehouse_type, location, target_temp_c, capacity_kg, pic_name, pic_phone)
VALUES
  ('WH-AMB-CS01', 'AMB-CS-01', 'Cold Storage Utama PPN Tantui Ambon', 'COLD_STORAGE', 'Kompleks PPN Tantui, Ambon, Maluku', -22.0, 120000.00, 'Kepala Gudang Ambon', '0811-4700-101'),
  ('WH-AMB-ABF1', 'AMB-ABF-01', 'Ruang Air Blast Freezer (ABF) Tantui', 'ABF_FREEZER', 'PPN Tantui Blok B, Ambon, Maluku', -35.0, 35000.00, 'Operator ABF Ambon', '0811-4700-102'),
  ('WH-AMB-CHL1', 'AMB-CHL-01', 'Chiller Transit Dermaga & Grading', 'CHILLER', 'Dermaga Pendaratan Ikan Ambon', 2.0, 25000.00, 'Koordinator QC Dermaga', '0811-4700-103'),
  ('WH-AMB-DRY1', 'AMB-DRY-01', 'Gudang Kemasan, Es & Logistik Kering', 'DRY_PACKAGING', 'Area Gudang Logistik KOPSIM Ambon', 24.0, 40000.00, 'Admin Logistik Ambon', '0811-4700-104')
ON CONFLICT (warehouse_code) DO NOTHING;

-- ==============================================================================
-- 3. SALDO STOK AUTHORITATIVE & LEDGER MUTASI IMMUTABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id VARCHAR(50) NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  product_sku VARCHAR(50) NOT NULL,
  batch_no VARCHAR(80) NOT NULL DEFAULT 'BATCH-GENERAL',
  barcode_code VARCHAR(120) NOT NULL DEFAULT '',
  qty_on_hand NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (qty_on_hand >= 0),
  qty_reserved NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (qty_reserved >= 0),
  unit VARCHAR(30) NOT NULL DEFAULT 'Kg',
  avg_unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (avg_unit_cost >= 0),
  harvest_date DATE,
  expiry_date DATE,
  last_movement_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_balance_slot UNIQUE (warehouse_id, product_sku, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_stock_balances_sku ON public.inventory_stock_balances (product_sku);
CREATE INDEX IF NOT EXISTS idx_stock_balances_barcode ON public.inventory_stock_balances (barcode_code);
CREATE INDEX IF NOT EXISTS idx_stock_balances_wh ON public.inventory_stock_balances (warehouse_id);

CREATE TABLE IF NOT EXISTS public.inventory_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_no VARCHAR(60) NOT NULL UNIQUE,
  movement_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('INBOUND', 'OUTBOUND', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALES_OUT', 'OPNAME_ADJUSTMENT')),
  warehouse_id VARCHAR(50) NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL DEFAULT '',
  batch_no VARCHAR(80) NOT NULL DEFAULT 'BATCH-GENERAL',
  barcode_code VARCHAR(120) DEFAULT '',
  qty_delta NUMERIC(14, 2) NOT NULL,
  unit VARCHAR(30) NOT NULL DEFAULT 'Kg',
  balance_before NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  balance_after NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (balance_after >= 0),
  unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  reference_type VARCHAR(40) NOT NULL,
  reference_no VARCHAR(80) NOT NULL,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_sku_date ON public.inventory_stock_movements (product_sku, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_wh_date ON public.inventory_stock_movements (warehouse_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON public.inventory_stock_movements (reference_type, reference_no);

-- ==============================================================================
-- 4. MODUL 3: PENERIMAAN BARANG (INBOUND)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_inbound_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_no VARCHAR(60) NOT NULL UNIQUE,
  inbound_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id VARCHAR(50) NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  supplier_id TEXT DEFAULT '',
  supplier_name VARCHAR(255) NOT NULL,
  vessel_name VARCHAR(150) DEFAULT '',
  landing_port VARCHAR(150) DEFAULT 'PPN Tantui Ambon',
  qc_status VARCHAR(30) NOT NULL DEFAULT 'LOLOS_QC' CHECK (qc_status IN ('LOLOS_QC', 'KARANTINA', 'DITOLAK')),
  status VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
  total_qty NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_value NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'ADMIN',
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_inbound_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_id UUID NOT NULL REFERENCES public.inventory_inbound_headers(id) ON DELETE CASCADE,
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  batch_no VARCHAR(80) NOT NULL,
  barcode_code VARCHAR(120) DEFAULT '',
  qty NUMERIC(14, 2) NOT NULL CHECK (qty > 0),
  unit VARCHAR(30) NOT NULL DEFAULT 'Kg',
  unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
  line_total NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  grade VARCHAR(60) DEFAULT 'Grade A',
  temperature_c NUMERIC(5, 1) DEFAULT -18.0,
  harvest_date DATE,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. MODUL 5: BARCODE LABELS REGISTRY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_barcode_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_code VARCHAR(120) NOT NULL UNIQUE,
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  warehouse_id VARCHAR(50) REFERENCES public.inventory_warehouses(id) ON DELETE SET NULL,
  batch_no VARCHAR(80) NOT NULL DEFAULT 'BATCH-GENERAL',
  pack_weight_kg NUMERIC(10, 2) DEFAULT 10.00,
  grade VARCHAR(60) DEFAULT 'Grade A',
  harvest_date DATE,
  expiry_date DATE,
  print_count INT NOT NULL DEFAULT 0,
  last_printed_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. MODUL 6: MUTASI BARANG ANTAR GUDANG (TRANSFERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no VARCHAR(60) NOT NULL UNIQUE,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_warehouse_id VARCHAR(50) NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  dest_warehouse_id VARCHAR(50) NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('DRAFT', 'COMPLETED', 'CANCELLED')),
  total_qty NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'ADMIN',
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_transfer_diff_wh CHECK (source_warehouse_id <> dest_warehouse_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  batch_no VARCHAR(80) NOT NULL,
  qty NUMERIC(14, 2) NOT NULL CHECK (qty > 0),
  unit VARCHAR(30) NOT NULL DEFAULT 'Kg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. MODUL 7: PENJUALAN / SALES CONTROL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_no VARCHAR(60) NOT NULL UNIQUE,
  sales_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id VARCHAR(50) NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  customer_id TEXT DEFAULT '',
  customer_name VARCHAR(255) NOT NULL,
  sales_channel VARCHAR(40) NOT NULL DEFAULT 'B2B_GROSIR' CHECK (sales_channel IN ('B2B_GROSIR', 'EKSPOR', 'MBG_KOPERASI', 'RETAIL_MITRA')),
  payment_method VARCHAR(80) NOT NULL DEFAULT 'Bank BSI',
  status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('DRAFT', 'CONFIRMED', 'DISPATCHED', 'COMPLETED', 'CANCELLED')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'LUNAS' CHECK (payment_status IN ('BELUM_LUNAS', 'DP', 'LUNAS')),
  subtotal_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  ledger_transaction_no VARCHAR(60) UNIQUE,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.inventory_sales_orders(id) ON DELETE CASCADE,
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  batch_no VARCHAR(80) NOT NULL DEFAULT 'BATCH-GENERAL',
  qty NUMERIC(14, 2) NOT NULL CHECK (qty > 0),
  unit VARCHAR(30) NOT NULL DEFAULT 'Kg',
  unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. MODUL 8: PENGELUARAN BARANG (OUTBOUND)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_outbound_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_no VARCHAR(60) NOT NULL UNIQUE,
  outbound_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id VARCHAR(50) NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  outbound_type VARCHAR(30) NOT NULL DEFAULT 'SALES_DELIVERY' CHECK (outbound_type IN ('SALES_DELIVERY', 'SAMPLE_QC', 'SPOILAGE_SHRINK', 'INTERNAL_USE')),
  sales_no VARCHAR(60),
  recipient_name VARCHAR(255) NOT NULL,
  vehicle_no VARCHAR(60) DEFAULT '',
  driver_name VARCHAR(120) DEFAULT '',
  delivery_note_no VARCHAR(80) DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
  total_qty NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'ADMIN',
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_outbound_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_id UUID NOT NULL REFERENCES public.inventory_outbound_headers(id) ON DELETE CASCADE,
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  batch_no VARCHAR(80) NOT NULL DEFAULT 'BATCH-GENERAL',
  qty NUMERIC(14, 2) NOT NULL CHECK (qty > 0),
  unit VARCHAR(30) NOT NULL DEFAULT 'Kg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 9. MODUL 9: STOCK OPNAME (AUDIT STOK FISIK VS SISTEM)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_stock_opnames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_no VARCHAR(60) NOT NULL UNIQUE,
  opname_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id VARCHAR(50) NOT NULL REFERENCES public.inventory_warehouses(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'CANCELLED')),
  total_items INT NOT NULL DEFAULT 0,
  total_variance_qty NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'ADMIN',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_stock_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id UUID NOT NULL REFERENCES public.inventory_stock_opnames(id) ON DELETE CASCADE,
  product_sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  batch_no VARCHAR(80) NOT NULL DEFAULT 'BATCH-GENERAL',
  system_qty NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  physical_qty NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (physical_qty >= 0),
  variance_qty NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  unit VARCHAR(30) NOT NULL DEFAULT 'Kg',
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 10. ATOMIC RPC FUNCTION: SINGLE SOURCE OF TRUTH UNTUK MUTASI STOK
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.inventory_apply_stock_movement(
  p_movement_no TEXT,
  p_movement_type TEXT,
  p_warehouse_id TEXT,
  p_product_sku TEXT,
  p_product_name TEXT,
  p_batch_no TEXT,
  p_barcode_code TEXT,
  p_qty_delta NUMERIC,
  p_unit TEXT,
  p_unit_cost NUMERIC,
  p_reference_type TEXT,
  p_reference_no TEXT,
  p_notes TEXT DEFAULT '',
  p_harvest_date DATE DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_created_by TEXT DEFAULT 'ADMIN'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch TEXT := COALESCE(NULLIF(TRIM(p_batch_no), ''), 'BATCH-GENERAL');
  v_balance_before NUMERIC(14, 2) := 0;
  v_balance_after NUMERIC(14, 2) := 0;
  v_existing_avg_cost NUMERIC(15, 2) := 0;
  v_new_avg_cost NUMERIC(15, 2) := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Otorisasi ditolak: Hanya ADMIN yang dapat melakukan mutasi stok inventory.';
  END IF;

  IF p_qty_delta = 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'balance_after', 0);
  END IF;

  INSERT INTO public.inventory_stock_balances (
    warehouse_id, product_sku, batch_no, barcode_code, qty_on_hand, unit, avg_unit_cost, harvest_date, expiry_date
  )
  VALUES (
    p_warehouse_id, p_product_sku, v_batch, COALESCE(p_barcode_code, ''), 0, COALESCE(NULLIF(p_unit, ''), 'Kg'), GREATEST(COALESCE(p_unit_cost, 0), 0), p_harvest_date, p_expiry_date
  )
  ON CONFLICT (warehouse_id, product_sku, batch_no) DO NOTHING;

  SELECT qty_on_hand, avg_unit_cost
  INTO v_balance_before, v_existing_avg_cost
  FROM public.inventory_stock_balances
  WHERE warehouse_id = p_warehouse_id
    AND product_sku = p_product_sku
    AND batch_no = v_batch
  FOR UPDATE;

  v_balance_after := v_balance_before + p_qty_delta;

  IF v_balance_after < 0 THEN
    RAISE EXCEPTION 'Stok tidak mencukupi untuk SKU % batch % di gudang % (tersedia: %, diminta: %).',
      p_product_sku, v_batch, p_warehouse_id, v_balance_before, ABS(p_qty_delta);
  END IF;

  IF p_qty_delta > 0 AND COALESCE(p_unit_cost, 0) > 0 AND v_balance_after > 0 THEN
    v_new_avg_cost := ROUND(((v_balance_before * v_existing_avg_cost) + (p_qty_delta * p_unit_cost)) / v_balance_after, 2);
  ELSE
    v_new_avg_cost := CASE WHEN v_existing_avg_cost > 0 THEN v_existing_avg_cost ELSE COALESCE(p_unit_cost, 0) END;
  END IF;

  UPDATE public.inventory_stock_balances
  SET
    qty_on_hand = v_balance_after,
    avg_unit_cost = v_new_avg_cost,
    barcode_code = COALESCE(NULLIF(p_barcode_code, ''), barcode_code),
    harvest_date = COALESCE(p_harvest_date, harvest_date),
    expiry_date = COALESCE(p_expiry_date, expiry_date),
    last_movement_at = now(),
    updated_at = now()
  WHERE warehouse_id = p_warehouse_id
    AND product_sku = p_product_sku
    AND batch_no = v_batch;

  INSERT INTO public.inventory_stock_movements (
    movement_no, movement_date, movement_type, warehouse_id, product_sku, product_name,
    batch_no, barcode_code, qty_delta, unit, balance_before, balance_after,
    unit_cost, reference_type, reference_no, notes, created_by
  )
  VALUES (
    p_movement_no, now(), p_movement_type, p_warehouse_id, p_product_sku, COALESCE(p_product_name, p_product_sku),
    v_batch, COALESCE(p_barcode_code, ''), p_qty_delta, COALESCE(NULLIF(p_unit, ''), 'Kg'), v_balance_before, v_balance_after,
    COALESCE(v_new_avg_cost, 0), p_reference_type, p_reference_no, COALESCE(p_notes, ''), COALESCE(p_created_by, 'ADMIN')
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'avg_unit_cost', v_new_avg_cost
  );
END;
$$;

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) UNTUK SELURUH TABEL INVENTORY
-- ==============================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'inventory_warehouses',
    'inventory_stock_balances',
    'inventory_stock_movements',
    'inventory_inbound_headers',
    'inventory_inbound_items',
    'inventory_barcode_labels',
    'inventory_transfers',
    'inventory_transfer_items',
    'inventory_sales_orders',
    'inventory_sales_order_items',
    'inventory_outbound_headers',
    'inventory_outbound_items',
    'inventory_stock_opnames',
    'inventory_stock_opname_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Dir and Admin read %s" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Dir and Admin read %s" ON public.%I FOR SELECT TO authenticated USING (public.is_director_or_admin());',
      t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS "Admin write %s" ON public.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY "Admin write %s" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());',
      t, t
    );
  END LOOP;
END $$;
