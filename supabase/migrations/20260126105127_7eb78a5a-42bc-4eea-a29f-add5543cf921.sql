-- Drop the old check constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shipping_method_check;

-- Create new check constraint with 'terrestre' included
ALTER TABLE orders ADD CONSTRAINT orders_shipping_method_check 
CHECK (shipping_method IN ('aereo', 'maritimo', 'terrestre'));