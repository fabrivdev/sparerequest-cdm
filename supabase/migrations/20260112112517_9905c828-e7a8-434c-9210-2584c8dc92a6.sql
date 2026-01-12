-- Renombrar columna price a price_aereo
ALTER TABLE products RENAME COLUMN price TO price_aereo;

-- Agregar columna para precio marítimo
ALTER TABLE products ADD COLUMN price_maritimo numeric NOT NULL DEFAULT 0;

-- Copiar precios existentes a marítimo como valor inicial
UPDATE products SET price_maritimo = price_aereo;