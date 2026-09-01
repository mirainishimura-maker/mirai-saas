-- ─────────────────────────────────────────────────────────────────────
-- Notaluma · 06 · Planes (F0 del mapa Premium)
--
-- Tres niveles: base (lo de hoy), premium (práctica individual con
-- agenda pública, embudo y mensajes), consultorio (equipo).
--
-- LA REGLA DE SEGURIDAD DE ESTE ARCHIVO: la columna `plan` la puede
-- LEER su dueña, pero no ESCRIBIRLA. Si el update genérico del perfil
-- pudiera tocarla, cualquiera con sesión se auto-ascendería a premium
-- con una llamada PATCH. Postgres resuelve esto con privilegios POR
-- COLUMNA: se revoca UPDATE de toda la tabla y se concede columna por
-- columna, dejando `plan` fuera. Los cambios de plan se hacen con la
-- llave de servicio (o desde el SQL Editor), nunca desde el navegador.
--
-- Se ejecuta en el SQL Editor, DESPUÉS de instalar-todo.sql.
-- Es idempotente: correrlo dos veces no rompe nada.
-- ─────────────────────────────────────────────────────────────────────

-- El plan de la cuenta. 'base' por defecto: nadie nace premium.
alter table public.therapists
    add column if not exists plan varchar(20) not null default 'base'
        check (plan in ('base', 'premium', 'consultorio'));

-- El horario semanal que alimentará la agenda abierta (F1).
-- Formato: {"1":[9,10,16], "2":[15,16]} — 1=lunes … 7=domingo, horas 0-23.
alter table public.therapists
    add column if not exists horario_semanal jsonb not null default '{}'::jsonb;

-- Privilegios por columna: todo lo editable del perfil, MENOS `plan`.
revoke update on public.therapists from authenticated;
grant update (
    full_name,
    professional_license,
    base_currency,
    tarifa_sesion,
    target_salary_monthly,
    monthly_fixed_costs,
    sesiones_semanales_sostenibles,
    porcentaje_semilla,
    friccion_reflexiva,
    modo_calma,
    horario_semanal,
    updated_at
) on public.therapists to authenticated;

-- ── Cómo asignar un plan (manual, desde el SQL Editor) ───────────────
-- Las tablas tienen FORCE ROW LEVEL SECURITY, así que hasta el editor
-- necesita saltarse RLS a propósito para tocar filas ajenas:
--
--   set role service_role;
--   update public.therapists set plan = 'premium'
--    where id = (select id from auth.users where email = 'correo@dominio.com');
--   reset role;
--
-- Verificación rápida de este archivo (debe devolver UNA fila,
-- privilegio UPDATE sobre la columna plan: CERO):
--
--   select count(*) as updates_sobre_plan
--   from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'therapists'
--     and column_name = 'plan' and privilege_type = 'UPDATE'
--     and grantee in ('authenticated', 'anon', 'PUBLIC');
