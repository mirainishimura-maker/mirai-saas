-- ═══════════════════════════════════════════════════════════════════
-- Mirai · VERIFICACIÓN EN UNA SOLA CONSULTA
--
-- Pegar entero, un solo Run. Devuelve tres filas.
-- Las tres tienen que decir BIEN. Si alguna dice MAL, se para todo.
-- Es la misma comprobación de verificar.sql, resumida en un veredicto.
-- ═══════════════════════════════════════════════════════════════════

with funciones_abiertas as (
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on true
    left join pg_roles r on r.oid = a.grantee
    where n.nspname = 'public'
      and p.proname in (
        'clave_notas', 'registrar_acceso', 'purgar_registro_viejo', 'crear_perfil_terapeuta'
      )
      and a.privilege_type = 'EXECUTE'
      and (a.grantee = 0 or r.rolname in ('anon', 'authenticated'))
),
tablas_sin_rls as (
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'therapists', 'patients', 'clinical_sessions', 'appointments',
        'financial_transactions', 'alliance_maps', 'administrative_buffer', 'access_log'
      )
      and (c.relrowsecurity = false or c.relforcerowsecurity = false)
),
politicas_sin_candado as (
    select policyname
    from pg_policies
    where schemaname = 'public'
      and cmd in ('ALL', 'INSERT', 'UPDATE')
      and with_check is null
)
select '1 · funciones delicadas cerradas' as comprobacion,
       case when count(*) = 0 then 'BIEN'
            else 'MAL — abiertas: ' || string_agg(proname, ', ') end as resultado
from funciones_abiertas
union all
select '2 · aislamiento activo en las 8 tablas',
       case when count(*) = 0 then 'BIEN'
            else 'MAL — sin RLS: ' || string_agg(relname, ', ') end
from tablas_sin_rls
union all
select '3 · nadie puede escribir a nombre de otra',
       case when count(*) = 0 then 'BIEN'
            else 'MAL — políticas flojas: ' || string_agg(policyname, ', ') end
from politicas_sin_candado
order by comprobacion;
