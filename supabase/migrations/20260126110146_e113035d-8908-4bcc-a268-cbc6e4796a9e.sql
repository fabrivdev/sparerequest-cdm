-- Agregar columna para tipo de destino del pedido
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_destination text 
NOT NULL DEFAULT 'cliente'
CHECK (order_destination IN ('cliente', 'stock', 'ambos'));