-- ================================================================
-- MIGRACIÓN: Datos por usuario (multi-tenant)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================
-- ORDEN:
--   1. Ejecuta el PASO 1 completo
--   2. Crea el nuevo usuario en Supabase (Authentication → Users)
--   3. Ejecuta el PASO 2 reemplazando el email del nuevo usuario
-- ================================================================


-- ================================================================
-- PASO 1: Agregar user_id, migrar datos existentes y actualizar RLS
-- ================================================================

-- Agregar columna user_id a cada tabla
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE citas    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE egresos  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Asignar los registros existentes al usuario s7yle@gmail.com
-- (para que no queden sin dueño mientras se crea el nuevo usuario)
UPDATE clientes SET user_id = (SELECT id FROM auth.users WHERE email = 's7yle@gmail.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE ingresos SET user_id = (SELECT id FROM auth.users WHERE email = 's7yle@gmail.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE citas    SET user_id = (SELECT id FROM auth.users WHERE email = 's7yle@gmail.com' LIMIT 1) WHERE user_id IS NULL;
UPDATE egresos  SET user_id = (SELECT id FROM auth.users WHERE email = 's7yle@gmail.com' LIMIT 1) WHERE user_id IS NULL;

-- Eliminar políticas antiguas (acceso global a cualquier autenticado)
DROP POLICY IF EXISTS "auth_all_clientes" ON clientes;
DROP POLICY IF EXISTS "auth_all_ingresos" ON ingresos;
DROP POLICY IF EXISTS "auth_all_citas"    ON citas;
DROP POLICY IF EXISTS "auth_all_egresos"  ON egresos;

-- Crear políticas por usuario: cada usuario solo ve y modifica sus propios datos
CREATE POLICY "user_clientes" ON clientes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ingresos" ON ingresos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_citas" ON citas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_egresos" ON egresos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ================================================================
-- PASO 2: Transferir datos al nuevo usuario
-- Ejecutar DESPUÉS de crear el nuevo usuario en Supabase.
-- Email del nuevo usuario: ss7barbershop@gmail.com
-- ================================================================

DO $$
DECLARE
  nuevo_id UUID;
  viejo_id UUID;
BEGIN
  SELECT id INTO nuevo_id FROM auth.users WHERE email = 'ss7barbershop@gmail.com' LIMIT 1;
  SELECT id INTO viejo_id FROM auth.users WHERE email = 's7yle@gmail.com' LIMIT 1;

  IF nuevo_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el nuevo usuario. Verifica que el email sea correcto.';
  END IF;

  UPDATE clientes SET user_id = nuevo_id WHERE user_id = viejo_id OR user_id IS NULL;
  UPDATE ingresos SET user_id = nuevo_id WHERE user_id = viejo_id OR user_id IS NULL;
  UPDATE citas    SET user_id = nuevo_id WHERE user_id = viejo_id OR user_id IS NULL;
  UPDATE egresos  SET user_id = nuevo_id WHERE user_id = viejo_id OR user_id IS NULL;

  RAISE NOTICE 'Listo. Todos los datos fueron transferidos al nuevo usuario (UUID: %)', nuevo_id;
END $$;
