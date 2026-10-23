-- ================================================================
-- Páginas públicas siempre de Samuel + links de prueba por cuenta
-- Ejecutar en: Supabase Dashboard → SQL Editor (todo de una vez)
-- ================================================================
-- /horario y /registro sin marca  → cuenta de Samuel (ss7barbershop@gmail.com)
-- /horario?b=<id> y /registro?b=<id> → esa cuenta (por ejemplo la de pruebas)

-- 1. ¿Qué cuenta usa un link? La que pide (si existe) o la de Samuel
CREATE OR REPLACE FUNCTION cuenta_publica(p_barbero UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM auth.users WHERE id = p_barbero),
    (SELECT id FROM auth.users WHERE email = 'ss7barbershop@gmail.com' LIMIT 1)
  )
$$;
-- Solo la usan las funciones de abajo, no se llama desde la página
REVOKE ALL ON FUNCTION cuenta_publica(UUID) FROM PUBLIC, anon, authenticated;

-- 2. Horario público: siempre el de Samuel (o el de la cuenta del link)
CREATE OR REPLACE FUNCTION horario_publico(p_barbero UUID DEFAULT NULL)
RETURNS SETOF disponibilidad
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM disponibilidad WHERE user_id = cuenta_publica(p_barbero) ORDER BY orden
$$;
REVOKE ALL ON FUNCTION horario_publico(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION horario_publico(UUID) TO anon, authenticated;

-- 3. Registro por QR: igual que antes, pero guarda en la cuenta del link
DROP FUNCTION IF EXISTS registrar_cliente_publico(TEXT, TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION registrar_cliente_publico(
  p_nombre           TEXT,
  p_apellido         TEXT,
  p_telefono         TEXT,
  p_fecha_nacimiento DATE DEFAULT NULL,
  p_barbero          UUID DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid        UUID := cuenta_publica(p_barbero);
  v_nombre   TEXT := initcap(btrim(p_nombre));
  v_apellido TEXT := initcap(btrim(p_apellido));
  v_telefono TEXT := btrim(p_telefono);
BEGIN
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

REVOKE ALL ON FUNCTION registrar_cliente_publico(TEXT, TEXT, TEXT, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_cliente_publico(TEXT, TEXT, TEXT, DATE, UUID) TO anon, authenticated;
