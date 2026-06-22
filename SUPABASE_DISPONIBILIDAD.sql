-- ================================================================
-- Disponibilidad pública semanal
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS disponibilidad (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  dia         TEXT NOT NULL,
  orden       INT  NOT NULL,
  abierto     BOOLEAN DEFAULT true,
  cupos       INT  DEFAULT 0,
  hora_inicio TEXT DEFAULT '09:00',
  hora_fin    TEXT DEFAULT '18:00',
  nota        TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE disponibilidad ENABLE ROW LEVEL SECURITY;

-- Lectura pública (sin login) — para la página /horario
CREATE POLICY "public_read_disponibilidad" ON disponibilidad
  FOR SELECT USING (true);

-- Solo el dueño puede crear/editar/borrar
CREATE POLICY "user_insert_disponibilidad" ON disponibilidad
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_disponibilidad" ON disponibilidad
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_delete_disponibilidad" ON disponibilidad
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Seed: insertar los 7 días para ss7barbershop@gmail.com
DO $$
DECLARE uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'ss7barbershop@gmail.com' LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado. Verifica el email.';
  END IF;

  INSERT INTO disponibilidad (user_id, dia, orden, abierto, cupos, hora_inicio, hora_fin) VALUES
    (uid, 'Lunes',      0, true,  8, '09:00', '18:00'),
    (uid, 'Martes',     1, true,  8, '09:00', '18:00'),
    (uid, 'Miércoles',  2, true,  8, '09:00', '18:00'),
    (uid, 'Jueves',     3, true,  8, '09:00', '18:00'),
    (uid, 'Viernes',    4, true,  8, '09:00', '18:00'),
    (uid, 'Sábado',     5, true,  6, '09:00', '14:00'),
    (uid, 'Domingo',    6, false, 0, '09:00', '14:00')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Días inicializados para %', uid;
END $$;
