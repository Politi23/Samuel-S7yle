-- ================================================================
-- Datos de prueba para la CUENTA DE PRUEBAS (nunca la de Samuel)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================
-- Cuenta de pruebas: prueba@gmail.com (cámbialo abajo si usas otra).
-- Ejecuta todo. Se puede correr las veces que quieras: primero borra
--    lo que este script puso antes (lo marcado como "Dato de prueba").
-- Fechas relativas a hoy (hora de Caracas), así siempre hay datos de
-- hoy, de esta semana, de la semana pasada y de los últimos meses.

DO $$
DECLARE
  correo  TEXT := 'prueba@gmail.com';   -- cuenta de pruebas
  marca   CONSTANT TEXT := 'Dato de prueba';
  uid     UUID;
  hoy     DATE := (now() AT TIME ZONE 'America/Caracas')::date;
  tasa    NUMERIC := 990;
  cli     RECORD;
  ids     UUID[];
  nombres TEXT[];
  servicios TEXT[] := ARRAY['Corte de cabello','Corte de cabello','Corte + Barba','Corte + Barba','Cejas','Pigmentación','Colorimetría','Lavado'];
  precios   NUMERIC[] := ARRAY[8, 8, 12, 12, 4, 15, 25, 5];
  metodos_usd TEXT[] := ARRAY['Efectivo USD','Efectivo USD','Zelle','Binance / Cripto'];
  metodos_bs  TEXT[] := ARRAY['Pago Móvil','Pago Móvil','Efectivo Bs','Transferencia bancaria'];
  g INT; n INT; k INT; s INT; c INT;
  dia_hoy INT    := extract(isodow FROM hoy)::int - 1;          -- 0 = lunes
  dia_man INT    := extract(isodow FROM hoy + 1)::int - 1;
  tipo_slots TEXT;
BEGIN
  IF correo = 'ss7barbershop@gmail.com' THEN
    RAISE EXCEPTION 'Esa es la cuenta de Samuel. Este script es solo para la cuenta de pruebas.';
  END IF;
  SELECT id INTO uid FROM auth.users WHERE email = correo;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No existe una cuenta con el correo %', correo;
  END IF;

  -- Limpiar lo que este script puso antes
  DELETE FROM ingresos WHERE user_id = uid AND notas = marca;
  DELETE FROM citas    WHERE user_id = uid AND notas = marca;
  DELETE FROM egresos  WHERE user_id = uid AND notas = marca;
  DELETE FROM clientes WHERE user_id = uid AND notas = marca;

  -- ── Clientes (con cumpleaños hoy, mañana y en 4 días) ──
  INSERT INTO clientes (user_id, nombre, apellido, telefono, fecha_nacimiento, notas, origen, created_at) VALUES
    (uid, 'Carlos',  'Pérez',     '0414-5550101', ((hoy)     - INTERVAL '27 years')::date, marca, 'qr',     now()),
    (uid, 'Luis',    'Rodríguez', '0424-5550102', ((hoy + 1) - INTERVAL '31 years')::date, marca, 'manual', now() - INTERVAL '3 days'),
    (uid, 'Andrés',  'Gómez',     '0412-5550103', ((hoy + 4) - INTERVAL '22 years')::date, marca, 'qr',     now() - INTERVAL '10 days'),
    (uid, 'José',    'Martínez',  '0416-5550104', NULL,                                    marca, 'manual', now() - INTERVAL '40 days'),
    (uid, 'Miguel',  'Hernández', '0426-5550105', '1990-03-14',                            marca, 'manual', now() - INTERVAL '55 days'),
    (uid, 'Daniel',  'Silva',     '0414-5550106', '2001-07-02',                            marca, 'qr',     now() - INTERVAL '2 days'),
    (uid, 'Javier',  'Torres',    '0422-5550107', NULL,                                    marca, 'manual', now() - INTERVAL '70 days'),
    (uid, 'Kevin',   'Rojas',     '0424-5550108', '1999-11-30',                            marca, 'manual', now() - INTERVAL '20 days');

  SELECT array_agg(id ORDER BY created_at), array_agg(nombre || ' ' || apellido ORDER BY created_at)
    INTO ids, nombres FROM clientes WHERE user_id = uid AND notas = marca;

  -- ── Ingresos: últimos 75 días, 0 a 3 cobros por día; hoy siempre 2 ──
  FOR g IN 0..75 LOOP
    n := CASE WHEN g = 0 THEN 2 WHEN extract(isodow FROM hoy - g) = 7 THEN 0 ELSE floor(random() * 4)::int END;
    FOR k IN 1..n LOOP
      s := 1 + floor(random() * array_length(servicios, 1))::int;
      c := 1 + floor(random() * array_length(ids, 1))::int;
      IF random() < 0.7 THEN
        INSERT INTO ingresos (user_id, cliente_id, cliente_nombre, fecha, concepto, monto, moneda, metodo_pago, notas)
        VALUES (uid, ids[c], nombres[c], hoy - g, servicios[s], precios[s], 'USD',
                metodos_usd[1 + floor(random() * 4)::int], marca);
      ELSE
        INSERT INTO ingresos (user_id, cliente_id, cliente_nombre, fecha, concepto, monto, moneda, metodo_pago, tasa_bcv, notas)
        VALUES (uid, ids[c], nombres[c], hoy - g, servicios[s], round(precios[s] * tasa), 'Bs',
                metodos_bs[1 + floor(random() * 4)::int], tasa, marca);
      END IF;
    END LOOP;
  END LOOP;

  -- ── Citas: hoy, próximos 7 días, semana pasada (con estados) y meses atrás ──
  INSERT INTO citas (user_id, cliente_id, cliente_nombre, fecha, hora, motivo, estado, notas) VALUES
    (uid, ids[1], nombres[1], hoy,      '10:00', 'Corte + Barba',    'atendida',   marca),
    (uid, ids[2], nombres[2], hoy,      '16:00', 'Corte de cabello', 'pendiente',  marca),
    (uid, ids[3], nombres[3], hoy,      '18:30', 'Pigmentación',     'pendiente',  marca),
    (uid, ids[4], nombres[4], hoy + 1,  '11:00', 'Corte de cabello', 'pendiente',  marca),
    (uid, ids[5], nombres[5], hoy + 2,  '15:30', 'Cejas',            'pendiente',  marca),
    (uid, ids[6], nombres[6], hoy + 4,  '09:30', 'Colorimetría',     'pendiente',  marca),
    (uid, ids[7], nombres[7], hoy + 6,  '17:00', 'Corte + Barba',    'pendiente',  marca),
    (uid, ids[1], nombres[1], hoy - 5,  '10:00', 'Corte de cabello', 'atendida',   marca),
    (uid, ids[2], nombres[2], hoy - 6,  '14:00', 'Corte + Barba',    'atendida',   marca),
    (uid, ids[3], nombres[3], hoy - 7,  '16:00', 'Cejas',            'cancelada',  marca),
    (uid, ids[5], nombres[5], hoy - 8,  '11:30', 'Corte de cabello', 'no_asistio', marca),
    (uid, ids[8], nombres[8], hoy - 9,  '17:30', 'Pigmentación',     'atendida',   marca),
    (uid, ids[6], nombres[6], hoy - 20, '12:00', 'Corte de cabello', 'atendida',   marca),
    (uid, ids[4], nombres[4], hoy - 35, '15:00', 'Corte + Barba',    'atendida',   marca),
    (uid, ids[7], nombres[7], hoy - 50, '10:30', 'Colorimetría',     'atendida',   marca);

  -- ── Egresos: barbería y personales, este mes y el pasado ──
  INSERT INTO egresos (user_id, fecha, categoria, descripcion, monto, moneda, notas) VALUES
    (uid, hoy - 2,  'Alquiler local',                 'Mes en curso',        80,   'USD', marca),
    (uid, hoy - 5,  'Productos y suministros',        'Cera, gel y cuchillas', 3500, 'Bs',  marca),
    (uid, hoy - 9,  'Electricidad / Agua / Internet', 'Luz e internet',      1200, 'Bs',  marca),
    (uid, hoy - 1,  'Comida',                         '',                    15,   'USD', marca),
    (uid, hoy - 4,  'Gasolina',                       '',                    800,  'Bs',  marca),
    (uid, hoy - 33, 'Alquiler local',                 'Mes anterior',        80,   'USD', marca),
    (uid, hoy - 40, 'Equipos y herramientas',         'Máquina nueva',       45,   'USD', marca);

  -- ── Horario: cupos de hoy y mañana (el de las 6:30 de hoy tiene cita) ──
  IF NOT EXISTS (SELECT 1 FROM disponibilidad WHERE user_id = uid) THEN
    INSERT INTO disponibilidad (user_id, dia, orden, abierto, cupos)
    SELECT uid, d, o - 1, true, 0
    FROM unnest(ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']) WITH ORDINALITY AS t(d, o);
  END IF;

  -- slots puede ser json o jsonb: se usa el tipo real de la columna
  SELECT data_type INTO tipo_slots FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'disponibilidad' AND column_name = 'slots';

  EXECUTE format('UPDATE disponibilidad SET abierto = true, updated_at = now(), slots = %L::%s WHERE user_id = %L AND orden = %s',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'dia_fecha', hoy, 'inicio', '15:00', 'fin', '16:00', 'ocupado', false),
      jsonb_build_object('id', gen_random_uuid(), 'dia_fecha', hoy, 'inicio', '16:00', 'fin', '16:45', 'ocupado', false),
      jsonb_build_object('id', gen_random_uuid(), 'dia_fecha', hoy, 'inicio', '17:30', 'fin', '18:30', 'ocupado', true, 'fecha', hoy),
      jsonb_build_object('id', gen_random_uuid(), 'dia_fecha', hoy, 'inicio', '18:30', 'fin', '19:30', 'ocupado', false)
    )::text, tipo_slots, uid, dia_hoy);

  EXECUTE format('UPDATE disponibilidad SET abierto = true, updated_at = now(), slots = %L::%s WHERE user_id = %L AND orden = %s',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'dia_fecha', hoy + 1, 'inicio', '10:00', 'fin', '11:00', 'ocupado', false),
      jsonb_build_object('id', gen_random_uuid(), 'dia_fecha', hoy + 1, 'inicio', '11:00', 'fin', '12:00', 'ocupado', false),
      jsonb_build_object('id', gen_random_uuid(), 'dia_fecha', hoy + 1, 'inicio', '14:00', 'fin', '15:00', 'ocupado', false)
    )::text, tipo_slots, uid, dia_man);

  RAISE NOTICE 'Listo: datos de prueba cargados en %', correo;
END $$;
