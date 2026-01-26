-- 1. Agregar columnas de facturación a la tabla orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_invoiced boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoiced_quantity integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_observation text;

-- 2. Crear tabla de configuración de proveedores
CREATE TABLE IF NOT EXISTS providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#888888',
  text_color text NOT NULL DEFAULT 'text-white',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insertar proveedores existentes
INSERT INTO providers (name, color, text_color) VALUES 
  ('CLAAS', '#B4C618', 'text-black'),
  ('HORSCH', '#A01B1B', 'text-white')
ON CONFLICT (name) DO NOTHING;

-- Habilitar RLS en providers
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Política de lectura para todos los usuarios autenticados
CREATE POLICY "Authenticated users can view providers" ON providers
FOR SELECT USING (true);

-- Política para admin (via service role)
CREATE POLICY "Service role can manage providers" ON providers
FOR ALL USING (true) WITH CHECK (true);