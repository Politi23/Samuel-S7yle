-- ================================================================
-- Registro por QR: preguntar para quién es (hijo, hija, familiar)
-- Ejecutar en: Supabase Dashboard → SQL Editor (todo de una vez)
-- ================================================================
-- Agrega a clientes: parentesco y representante (nombre del papá o mamá).
-- Mantiene todo lo anterior: links por cuenta, sin duplicados (mismo
-- número + mismo nombre), familias con el mismo número.

-- 0. Parentesco: para quién es el registro y quién es su papá/mamá
--    parentesco: NULL = la persona dueña del número; 'hijo', 'hija' o 'familiar'
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS parentesco    TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS representante TEXT;

-- Nombre completo sin mayúsculas, acentos ni espacios de más
CREATE OR REPLACE FUNCTION nombre_normal(n TEXT, a TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(regexp_replace(lower(translate(coalesce(n, '') || ' ' || coalesce(a, ''),
                                             'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g'))
$$;

-- Teléfono reducido a sus dígitos, con el +58 cambiado por 0
CREATE OR REPLACE FUNCTION solo_digitos(t TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(regexp_replace(coalesce(t, ''), '\D', '', 'g'), '^58(4)', '0\1')
$$;

-- Registro por QR
DROP FUNCTION IF EXISTS registrar_cliente_publico(TEXT, TEXT, TEXT, DATE);
DROP FUNCTION IF EXISTS registrar_cliente_publico(TEXT, TEXT, TEXT, DATE, UUID);

CREATE OR REPLACE FUNCTION registrar_cliente_publico(
  p_nombre           TEXT,
  p_apellido         TEXT,
  p_telefono         TEXT,
  p_fecha_nacimiento DATE DEFAULT NULL,
  p_barbero          UUID DEFAULT NULL,
  p_parentesco       TEXT DEFAULT NULL,
  p_representante    TEXT DEFAULT NULL
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
  v_parentesco    TEXT := nullif(lower(btrim(coalesce(p_parentesco, ''))), '');
  v_representante TEXT := initcap(btrim(coalesce(p_representante, '')));
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
  IF v_parentesco IS NOT NULL AND v_parentesco NOT IN ('hijo', 'hija', 'familiar') THEN
    RAISE EXCEPTION 'Parentesco inválido';
  END IF;
  IF v_parentesco IS NULL THEN
    v_representante := NULL;
  ELSIF v_representante !~ '^[[:alpha:] ''-]{2,80}$' THEN
    RAISE EXCEPTION 'Nombre del papá o mamá inválido';
  END IF;

  -- Un registro a la vez por número: si llegan dos iguales al mismo tiempo
  -- (doble toque), el segundo espera y ve que el primero ya lo guardó
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || ':' || solo_digitos(v_telefono), 0));

  -- Si esa misma persona ya está registrada con ese número, no duplicar.
  -- Un mismo número sí puede tener varias personas (papá e hijos, hermanos).
  -- Compara solo los dígitos del número (0414-1234567 = +58 414 1234567) y el
  -- nombre sin mayúsculas ni acentos (José Pérez = jose perez).
  IF EXISTS (SELECT 1 FROM clientes c
             WHERE c.user_id = uid
               AND solo_digitos(c.telefono) = solo_digitos(v_telefono)
               AND nombre_normal(c.nombre, c.apellido) = nombre_normal(v_nombre, v_apellido)) THEN
    RETURN 'existe';
  END IF;

  -- Freno contra abuso: máximo 30 registros por QR cada 10 minutos
  IF (SELECT count(*) FROM clientes c
      WHERE c.user_id = uid AND c.origen = 'qr' AND c.created_at > now() - INTERVAL '10 minutes') >= 30 THEN
    RAISE EXCEPTION 'Demasiados registros, intenta en unos minutos';
  END IF;

  INSERT INTO clientes (user_id, nombre, apellido, telefono, fecha_nacimiento, origen, parentesco, representante)
  VALUES (uid, v_nombre, v_apellido, v_telefono, p_fecha_nacimiento, 'qr', v_parentesco, v_representante);

  RETURN 'creado';
END $$;

REVOKE ALL ON FUNCTION registrar_cliente_publico(TEXT, TEXT, TEXT, DATE, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_cliente_publico(TEXT, TEXT, TEXT, DATE, UUID, TEXT, TEXT) TO anon, authenticated;
