-- BarberShop Samuel S7tyle — SQL Setup
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- 1. Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  apellido    TEXT NOT NULL DEFAULT '',
  cedula      TEXT,
  telefono    TEXT,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de ingresos
CREATE TABLE IF NOT EXISTS ingresos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_nombre  TEXT NOT NULL,
  fecha           DATE NOT NULL,
  concepto        TEXT,
  monto           NUMERIC NOT NULL,
  moneda          TEXT NOT NULL DEFAULT 'USD',
  metodo_pago     TEXT,
  tasa_bcv        NUMERIC,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de citas
CREATE TABLE IF NOT EXISTS citas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_nombre  TEXT NOT NULL,
  fecha           DATE NOT NULL,
  hora            TEXT,
  motivo          TEXT,
  estado          TEXT DEFAULT 'pendiente',
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de egresos
CREATE TABLE IF NOT EXISTS egresos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL,
  categoria   TEXT NOT NULL,
  descripcion TEXT,
  monto       NUMERIC NOT NULL,
  moneda      TEXT NOT NULL DEFAULT 'USD',
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. Habilitar Row Level Security en todas las tablas
ALTER TABLE clientes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE egresos   ENABLE ROW LEVEL SECURITY;

-- 6. Políticas: solo usuarios autenticados pueden ver y modificar sus datos
CREATE POLICY "auth_all_clientes"  ON clientes  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_ingresos"  ON ingresos  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_citas"     ON citas     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all_egresos"   ON egresos   FOR ALL USING (auth.role() = 'authenticated');
