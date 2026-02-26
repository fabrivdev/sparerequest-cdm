
ALTER TABLE public.transfers
  ADD COLUMN transfer_destination text NOT NULL DEFAULT 'stock',
  ADD COLUMN client_name text,
  ADD COLUMN remission_number text,
  ADD COLUMN invoice_number text,
  ADD COLUMN is_invoiced boolean,
  ADD COLUMN not_invoiced_reason text;
