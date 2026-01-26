-- Add estimated delivery date column to orders table
ALTER TABLE orders ADD COLUMN estimated_delivery_date DATE NULL;