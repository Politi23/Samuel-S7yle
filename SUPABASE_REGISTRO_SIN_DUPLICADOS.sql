-- ================================================================
-- Registro por QR: no permitir el mismo número dos veces
-- Ejecutar en: Supabase Dashboard → SQL Editor (todo de una vez)
-- ================================================================
-- - Compara solo los dígitos del teléfono (sin guiones, espacios ni +58).
-- - Si llegan dos registros del mismo número al mismo tiempo, solo uno se guarda.

-- Teléfono reducido a sus dígitos, con el +58 cambiado por 0
CREATE OR REPLACE FUNCTION solo_digitos(t TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(regexp_replace(coalesce(t, ''), '\D', '', 'g'), '^58(4)', '0\1')
$$;

-- Registro por QR (misma función de antes, con el control de duplicados)
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

  -- Un registro a la vez por número: si llegan dos iguales al mismo tiempo
  -- (doble toque), el segundo espera y ve que el primero ya lo guardó
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || ':' || solo_digitos(v_telefono), 0));

  -- Si ya está registrado con ese número, no duplicar (compara solo los
  -- dígitos: 0414-1234567, 04141234567 y +58 414 1234567 son el mismo)
  IF EXISTS (SELECT 1 FROM clientes c
             WHERE c.user_id = uid AND solo_digitos(c.telefono) = solo_digitos(v_telefono)) THEN
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
