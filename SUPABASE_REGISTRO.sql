-- ================================================================
-- Auto-registro de clientes por QR (página pública /registro)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================
-- La tabla clientes sigue cerrada al público (RLS). Los clientes se
-- registran solo a través de esta función, que valida los datos y
-- los guarda en la cuenta del barbero.

-- 1. Marcar de dónde vino cada cliente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'manual';

-- 2. Función pública de registro
CREATE OR REPLACE FUNCTION registrar_cliente_publico(
  p_nombre           TEXT,
  p_apellido         TEXT,
  p_telefono         TEXT,
  p_fecha_nacimiento DATE DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid      UUID;
  v_nombre   TEXT := initcap(btrim(p_nombre));
  v_apellido TEXT := initcap(btrim(p_apellido));
  v_telefono TEXT := btrim(p_telefono);
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'ss7barbershop@gmail.com' LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Registro no disponible';
  END IF;

  -- Validaciones (las mismas reglas que el formulario de la app)
  IF v_nombre IS NULL OR v_nombre !~ '^[[:alpha:] ''-]{2,50}$' THEN
    RAISE EXCEPTION 'Nombre inválido';
  END IF;
  IF v_apellido IS NULL OR v_apellido !~ '^[[:alpha:] ''-]{2,50}$' THEN
    RAISE EXCEPTION 'Apellido inválido';
  END IF;
  IF v_telefono IS NULL OR v_telefono !~ '^04(12|22|14|16|24|26)-[0-9]{7}$' THEN
    RAISE EXCEPTION 'Teléfono inválido';
  END IF;
  IF p_fecha_nacimiento IS NOT NULL
     AND (p_fecha_nacimiento > current_date OR p_fecha_nacimiento < current_date - INTERVAL '110 years') THEN
    RAISE EXCEPTION 'Fecha de nacimiento inválida';
  END IF;

  -- Si ya está registrado con ese teléfono, no duplicar
  IF EXISTS (SELECT 1 FROM clientes c WHERE c.user_id = uid AND c.telefono = v_telefono) THEN
    RETURN 'existe';
  END IF;

  -- Freno contra abuso: máximo 30 registros por QR cada 10 minutos
  IF (SELECT count(*) FROM clientes c
      WHERE c.user_id = uid AND c.origen = 'qr' AND c.created_at > now() - INTERVAL '10 minutes') >= 30 THEN
    RAISE EXCEPTION 'Demasiados registros, intenta en unos minutos';
  END IF;

  INSERT INTO clientes (user_id, nombre, apellido, telefono, fecha_nacimiento, origen)
  VALUES (uid, v_nombre, v_apellido, v_telefono, p_fecha_nacimiento, 'qr');

  RETURN 'creado';
END $$;

-- 3. Permisos: cualquiera puede llamar la función, nadie más toca la tabla
REVOKE ALL ON FUNCTION registrar_cliente_publico(TEXT, TEXT, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_cliente_publico(TEXT, TEXT, TEXT, DATE) TO anon, authenticated;
