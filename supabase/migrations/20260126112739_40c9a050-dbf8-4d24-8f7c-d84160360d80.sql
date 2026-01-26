-- Agregar columna para motivo de no facturación
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS not_invoiced_reason text;