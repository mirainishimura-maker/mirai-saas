-- ═══════════════════════════════════════════════════════════════════
-- Mirai · VERIFICACIÓN — el bloqueo previo al piloto
--
-- Estas dos comprobaciones se corren DESPUÉS de instalar y ANTES de que
-- entre un solo paciente real. Las dos tienen que devolver CERO FILAS.
--
-- No son una recomendación. Si alguna devuelve algo, hay historias
-- clínicas alcanzables por quien no debe, y no se entrega.
-- ═══════════════════════════════════════════════════════════════════


-- ── 1. ¿Quedó alguna función abierta? ────────────────────────────────
--
-- Postgres concede EXECUTE a PUBLIC en toda función nueva, y PostgREST
-- publica como RPC lo que viva en el esquema public. Si `clave_notas`
-- aparece acá, la llave de cifrado está a una llamada de distancia de
-- cualquiera que abra la web.
--
-- ESPERADO: cero filas.

select
    p.proname as funcion,
    coalesce(r.rolname, 'PUBLIC') as quien_puede_ejecutarla
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on true
left join pg_roles r on r.oid = a.grantee
where n.nspname = 'public'
  and p.proname in (
    'clave_notas', 'registrar_acceso', 'purgar_registro_viejo', 'crear_perfil_terapeuta'
  )
  and a.privilege_type = 'EXECUTE'
  and (a.grantee = 0 or r.rolname in ('anon', 'authenticated'));


-- ── 2. ¿Está RLS activo y forzado en todas las tablas? ───────────────
--
-- ESPERADO: cero filas.

select
    c.relname as tabla,
    c.relrowsecurity as rls_activo,
    c.relforcerowsecurity as rls_forzado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'therapists', 'patients', 'clinical_sessions', 'appointments',
    'financial_transactions', 'alliance_maps', 'administrative_buffer', 'access_log'
  )
  and (c.relrowsecurity = false or c.relforcerowsecurity = false);


-- ── 3. ¿Hay alguna política sin WITH CHECK donde debería tenerla? ────
--
-- Una política de escritura sin WITH CHECK deja insertar filas con el
-- therapist_id de otra persona.
--
-- ESPERADO: cero filas.

select
    schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and cmd in ('ALL', 'INSERT', 'UPDATE')
  and with_check is null;


-- ═══════════════════════════════════════════════════════════════════
-- ── 4. LA PRUEBA DE LAS DOS CUENTAS ─────────────────────────────────
--
-- Las tres consultas de arriba miran la configuración. Esta mira el
-- comportamiento, que es lo que de verdad importa, y no se puede hacer
-- desde el SQL Editor: hay que hacerla desde la app, con dos sesiones.
--
--   1. Crear dos cuentas de prueba: A y B.
--   2. Con A, crear una paciente y escribirle una nota.
--   3. Copiar el id de esa nota.
--   4. Entrar con B y, desde la consola del navegador, intentar leerla:
--
--        await window.supabase
--          .from('clinical_sessions')
--          .select('*')
--          .eq('id', 'EL-ID-DE-LA-NOTA-DE-A')
--
--      Tiene que devolver un array VACÍO. No un error de permisos: vacío.
--      B no debería ni enterarse de que esa fila existe.
--
--   5. Con B, probar también la función de lectura:
--
--        await window.supabase.rpc('leer_notas', { p_patient_id: null })
--
--      Solo debe devolver las notas de B.
--
--   6. Borrar las dos cuentas de prueba antes de entregar.
--
-- Si el paso 4 devuelve datos, se para todo.
-- ═══════════════════════════════════════════════════════════════════
