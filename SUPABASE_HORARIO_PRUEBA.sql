-- ================================================================
-- Horario de prueba para la CUENTA DE PRUEBAS (nunca la de Samuel)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================
-- Llena el horario de las próximas 6 semanas para probar las vistas
-- "Semana" y "Mes" (incluye el mes que viene). Solo toca el horario:
-- no cambia clientes, cobros ni citas. Reemplaza los cupos que tenga
-- la cuenta de pruebas. Se puede correr las veces que quieras.

DO $$
DECLARE
  correo     TEXT := 'prueba@gmail.com';   -- cuenta de pruebas
  uid        UUID;
  ahora      TIMESTAMP := now() AT TIME ZONE 'America/Caracas';
  hoy        DATE := (now() AT TIME ZONE 'America/Caracas')::date;
  tipo_slots TEXT;
  duraciones INT[] := ARRAY[45, 60, 40, 60];
  inicios    TIME[] := ARRAY['09:00', '10:30', '14:00', '16:00'];
  o INT; k INT; j INT; n INT; dur INT;
  f DATE; ini TIME; ocupado BOOLEAN;
  cupos JSONB;
  total INT := 0;
BEGIN
  IF correo = 'ss7barbershop@gmail.com' THEN
    RAISE EXCEPTION 'Esa es la cuenta de Samuel. Este script es solo para la cuenta de pruebas.';
  END IF;
  SELECT id INTO uid FROM auth.users WHERE email = correo;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No existe una cuenta con el correo %', correo;
  END IF;

  -- Las 7 filas de la semana (por si la cuenta todavía no las tiene)
  IF NOT EXISTS (SELECT 1 FROM disponibilidad WHERE user_id = uid) THEN
    INSERT INTO disponibilidad (user_id, dia, orden, abierto, cupos)
    SELECT uid, d, o2 - 1, true, 0
    FROM unnest(ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']) WITH ORDINALITY AS t(d, o2);
  END IF;

  -- slots puede ser json o jsonb: se usa el tipo real de la columna
  SELECT data_type INTO tipo_slots FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'disponibilidad' AND column_name = 'slots';

  -- Una fila por día de la semana (0 = lunes … 6 = domingo), con los cupos de todas sus fechas
  FOR o IN 0..6 LOOP
    cupos := '[]'::jsonb;

    IF o <> 6 THEN  -- los domingos quedan cerrados
      FOR k IN 0..41 LOOP
        f := hoy + k;
        CONTINUE WHEN extract(isodow FROM f)::int - 1 <> o;
        CONTINUE WHEN k % 11 = 5;   -- algunos días sin cupos

        -- Hoy empieza en la próxima hora para que no salgan todos como "pasó"
        IF k = 0 THEN
          ini := least(date_trunc('hour', ahora)::time + INTERVAL '1 hour', TIME '20:00');
        ELSE
          ini := inicios[1 + (k % 4)];
        END IF;

        n := 3 + (k % 3);           -- entre 3 y 5 cupos por día
        FOR j IN 0..n - 1 LOOP
          dur := duraciones[1 + ((k + j) % 4)];
          EXIT WHEN ini + make_interval(mins => dur) > TIME '22:00' OR ini + make_interval(mins => dur) < ini;
          ocupado := (j = 1 AND k % 2 = 0);   -- algunos ya ocupados
          cupos := cupos || jsonb_build_array(jsonb_build_object(
            'id',        gen_random_uuid(),
            'dia_fecha', to_char(f, 'YYYY-MM-DD'),
            'inicio',    to_char(ini, 'HH24:MI'),
            'fin',       to_char(ini + make_interval(mins => dur), 'HH24:MI'),
            'ocupado',   ocupado,
            'fecha',     CASE WHEN ocupado THEN to_char(f, 'YYYY-MM-DD') END
          ));
          total := total + 1;
          ini := ini + make_interval(mins => dur);
        END LOOP;
      END LOOP;
    END IF;

    EXECUTE format(
      'UPDATE disponibilidad SET abierto = %L, slots = %L::%s, updated_at = now() WHERE user_id = %L AND orden = %s',
      o <> 6, cupos::text, tipo_slots, uid, o);
  END LOOP;

  RAISE NOTICE 'Listo: % cupos de prueba en las próximas 6 semanas para %', total, correo;
END $$;
