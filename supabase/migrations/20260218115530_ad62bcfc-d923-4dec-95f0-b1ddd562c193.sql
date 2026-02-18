
-- =============================================
-- TRANSFER MODULE: 6 new tables
-- =============================================

-- 1. branch_stock: Current stock per item per branch
CREATE TABLE public.branch_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand text NOT NULL,
  product_code text NOT NULL,
  product_name text NOT NULL,
  branch text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand, product_code, branch)
);

ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock"
  ON public.branch_stock FOR SELECT
  TO authenticated
  USING (true);

-- 2. branch_sales: Historical sales per item, branch, month
CREATE TABLE public.branch_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand text NOT NULL,
  product_code text NOT NULL,
  branch text NOT NULL,
  year_month text NOT NULL,
  quantity_sold integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand, product_code, branch, year_month)
);

ALTER TABLE public.branch_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales"
  ON public.branch_sales FOR SELECT
  TO authenticated
  USING (true);

-- 3. stock_upload_log: Upload tracking
CREATE TABLE public.stock_upload_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  upload_type text NOT NULL,
  records_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_upload_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view upload logs"
  ON public.stock_upload_log FOR SELECT
  TO authenticated
  USING (true);

-- 4. transfers: Main transfer requests table
CREATE TABLE public.transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_user_id uuid NOT NULL,
  requester_branch text NOT NULL,
  source_branch text NOT NULL,
  brand text NOT NULL,
  product_code text NOT NULL,
  product_name text NOT NULL,
  requested_quantity integer NOT NULL,
  approved_quantity integer,
  dispatched_quantity integer,
  received_quantity integer,
  priority text NOT NULL DEFAULT 'normal',
  observation text,
  status text NOT NULL DEFAULT 'Pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all transfers"
  ON public.transfers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own transfers"
  ON public.transfers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_user_id);

CREATE POLICY "Users can update related transfers"
  ON public.transfers FOR UPDATE
  TO authenticated
  USING (true);

CREATE TRIGGER update_transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. transfer_status_log: Audit trail
CREATE TABLE public.transfer_status_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id uuid NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid NOT NULL,
  changed_by_name text NOT NULL,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view status logs"
  ON public.transfer_status_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert status logs"
  ON public.transfer_status_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. transfer_alerts: Delay alerts
CREATE TABLE public.transfer_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id uuid NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
  ON public.transfer_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update alerts"
  ON public.transfer_alerts FOR UPDATE
  TO authenticated
  USING (true);

-- Enable realtime for transfers and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfer_alerts;
