-- ─────────────────────────────────────────────────────────────────────
-- Notaluma · 07 · Agenda abierta (F1 del mapa Premium)
--
-- El enlace público /agendar/<token>: catálogo de servicios, cálculo de
-- horarios libres y pre-reserva. Tres decisiones de diseño:
--
-- 1. El público NUNCA toca las tablas. Todo pasa por tres funciones
--    security definer con el token como llave. La llave anónima solo
--    puede ejecutar esas tres; las tablas le están revocadas.
-- 2. Una reserva web NO es una cita. Aterriza en web_bookings como
--    pre-reserva y espera confirmación en el panel — nada aparece en la
--    agenda clínica sin que su dueño lo decida. (En Ítaca el paciente
--    nuevo también entraba como "pendiente, confirmar".)
-- 3. El cupo se revalida DENTRO de la reserva, con candado. Dos personas
--    pidiendo el mismo horario a la vez: una lo aparta, la otra recibe
--    "justo tomaron ese horario".
--
-- Se ejecuta DESPUÉS de 06-planes.sql. Idempotente.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Catálogo de servicios ─────────────────────────────────────────
-- El precio al paciente y la duración REAL (una sesión de pareja de 90
-- minutos existe — el bug de Ítaca de asumir 1 hora no viaja acá).
-- servicio_id será, en Consultorio, la base de la liquidación por FK.

create table if not exists public.services (
    id uuid primary key default gen_random_uuid(),
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    nombre text not null,
    descripcion text not null default '',
    precio numeric(12, 2) not null default 0 check (precio >= 0),
    duracion_min int not null default 60 check (duracion_min between 15 and 240),
    reservable_web boolean not null default true,
    activo boolean not null default true,
    orden int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_services_therapist on public.services (therapist_id, orden);

alter table public.services enable row level security;
alter table public.services force row level security;

drop policy if exists "terapeuta gestiona sus servicios" on public.services;
create policy "terapeuta gestiona sus servicios"
    on public.services for all
    to authenticated
    using (auth.uid() = therapist_id)
    with check (auth.uid() = therapist_id);

revoke all on public.services from anon;
grant select, insert, update, delete on public.services to authenticated;

drop trigger if exists tocar_services on public.services;
create trigger tocar_services before update on public.services
    for each row execute function public.tocar_updated_at();

-- ── 2. Pre-reservas del enlace público ───────────────────────────────

create table if not exists public.web_bookings (
    id uuid primary key default gen_random_uuid(),
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    servicio_id uuid references public.services(id) on delete set null,
    servicio_nombre text not null default '',   -- snapshot: si el servicio se borra, la reserva se entiende igual
    nombre text not null,
    telefono text not null,
    correo text not null default '',
    motivo text not null default '',
    inicio timestamptz not null,
    duracion_min int not null default 60,
    estado varchar(15) not null default 'pendiente'
        check (estado in ('pendiente', 'confirmada', 'rechazada')),
    cita_id uuid references public.appointments(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_web_bookings_therapist
    on public.web_bookings (therapist_id, estado, inicio);

-- Dos envíos del mismo horario no pueden quedar pendientes a la vez.
create unique index if not exists uq_web_bookings_slot
    on public.web_bookings (therapist_id, inicio) where estado = 'pendiente';

alter table public.web_bookings enable row level security;
alter table public.web_bookings force row level security;

-- El dueño las ve y las resuelve. NADIE las inserta por la API de tablas:
-- solo la función reservar_web, que corre como definer.
drop policy if exists "terapeuta ve sus reservas" on public.web_bookings;
create policy "terapeuta ve sus reservas"
    on public.web_bookings for select
    to authenticated
    using (auth.uid() = therapist_id);

drop policy if exists "terapeuta resuelve sus reservas" on public.web_bookings;
create policy "terapeuta resuelve sus reservas"
    on public.web_bookings for update
    to authenticated
    using (auth.uid() = therapist_id)
    with check (auth.uid() = therapist_id);

revoke all on public.web_bookings from anon, authenticated;
grant select, update on public.web_bookings to authenticated;

-- ── 3. El token del enlace y el interruptor ──────────────────────────

alter table public.therapists
    add column if not exists token_agenda text unique,
    add column if not exists agenda_abierta boolean not null default false;

-- agenda_abierta sí se edita desde el navegador; token_agenda NO (se
-- genera con la función de abajo). Recordar: 06 dejó privilegios POR
-- COLUMNA, así que cada columna editable se concede explícitamente.
grant update (agenda_abierta) on public.therapists to authenticated;

create or replace function public.generar_token_agenda()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_token text;
begin
    if auth.uid() is null then
        raise exception 'sin sesión';
    end if;
    v_token := replace(gen_random_uuid()::text, '-', '');
    update public.therapists set token_agenda = v_token where id = auth.uid();
    return v_token;
end;
$$;

revoke all on function public.generar_token_agenda() from public, anon, authenticated;
grant execute on function public.generar_token_agenda() to authenticated;

-- ── 4. ¿Este horario está ocupado? (interna, nadie la invoca) ────────
-- Un horario choca si se solapa con una cita no cancelada o con otra
-- pre-reserva pendiente. Se compara en hora de Lima, el mismo reloj del
-- horario semanal.

create or replace function public.slot_ocupado(
    p_therapist uuid,
    p_inicio timestamptz,
    p_dur int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_dia date := (p_inicio at time zone 'America/Lima')::date;
    v_hora time := (p_inicio at time zone 'America/Lima')::time;
    v_fin time := v_hora + make_interval(mins => p_dur);
begin
    return exists (
        select 1 from public.appointments a
        where a.therapist_id = p_therapist
          and a.dia = v_dia
          and a.status <> 'Cancelled'
          and a.inicio < v_fin
          and a.fin > v_hora
    ) or exists (
        select 1 from public.web_bookings b
        where b.therapist_id = p_therapist
          and b.estado = 'pendiente'
          and b.inicio < p_inicio + make_interval(mins => p_dur)
          and b.inicio + make_interval(mins => b.duracion_min) > p_inicio
    );
end;
$$;

revoke all on function public.slot_ocupado(uuid, timestamptz, int)
    from public, anon, authenticated;

-- ── 5. Lo que ve el público ──────────────────────────────────────────

create or replace function public.agenda_publica(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_t record;
begin
    select id, full_name into v_t
    from public.therapists
    where token_agenda = p_token and agenda_abierta = true and token_agenda is not null;
    if not found then
        return null;   -- token malo o agenda cerrada: mismo silencio en ambos casos
    end if;
    return jsonb_build_object(
        'nombre', v_t.full_name,
        'servicios', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', s.id, 'nombre', s.nombre, 'descripcion', s.descripcion,
                'precio', s.precio, 'duracion_min', s.duracion_min
            ) order by s.orden, s.created_at)
            from public.services s
            where s.therapist_id = v_t.id and s.activo and s.reservable_web
        ), '[]'::jsonb)
    );
end;
$$;

-- Slots libres de los próximos 14 días para un servicio.
-- Base: therapists.horario_semanal {"1":[9,10,16], ...} con 1=lunes…7=domingo
-- (isodow de Postgres), horas enteras de Lima. Se descuentan citas,
-- pre-reservas y todo lo que empiece a menos de 30 minutos de ahora.

create or replace function public.slots_publicos(p_token text, p_servicio uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_t record;
    v_dur int;
    v_horario jsonb;
    v_dia date;
    v_hora int;
    v_slot timestamptz;
    v_salida jsonb := '[]'::jsonb;
    d int;
    h jsonb;
begin
    select id, horario_semanal into v_t
    from public.therapists
    where token_agenda = p_token and agenda_abierta = true and token_agenda is not null;
    if not found then return null; end if;

    select duracion_min into v_dur
    from public.services
    where id = p_servicio and therapist_id = v_t.id and activo and reservable_web;
    if not found then return null; end if;

    v_horario := coalesce(v_t.horario_semanal, '{}'::jsonb);

    for d in 0..13 loop
        v_dia := ((now() at time zone 'America/Lima')::date) + d;
        for h in select * from jsonb_array_elements(
            coalesce(v_horario -> extract(isodow from v_dia)::int::text, '[]'::jsonb)
        ) loop
            v_hora := h::text::int;
            -- que la sesión no cruce la medianoche
            continue when v_hora < 0 or v_hora > 23 or (v_hora * 60 + v_dur) > 1440;
            v_slot := (v_dia::text || ' ' || lpad(v_hora::text, 2, '0') || ':00')::timestamp
                      at time zone 'America/Lima';
            continue when v_slot < now() + interval '30 minutes';
            continue when public.slot_ocupado(v_t.id, v_slot, v_dur);
            v_salida := v_salida || to_jsonb(v_slot);
        end loop;
    end loop;
    return v_salida;
end;
$$;

-- La pre-reserva. Revalida el cupo con candado de transacción: si dos
-- personas piden el mismo horario a la vez, la segunda recibe ocupado=true.

create or replace function public.reservar_web(
    p_token text,
    p_servicio uuid,
    p_inicio timestamptz,
    p_nombre text,
    p_telefono text,
    p_correo text default '',
    p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_t record;
    v_s record;
    v_id uuid;
begin
    select id into v_t
    from public.therapists
    where token_agenda = p_token and agenda_abierta = true and token_agenda is not null;
    if not found then
        return jsonb_build_object('ok', false, 'motivo', 'enlace');
    end if;

    select id, nombre, duracion_min into v_s
    from public.services
    where id = p_servicio and therapist_id = v_t.id and activo and reservable_web;
    if not found then
        return jsonb_build_object('ok', false, 'motivo', 'servicio');
    end if;

    if length(trim(p_nombre)) < 2 or length(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g')) < 6 then
        return jsonb_build_object('ok', false, 'motivo', 'datos');
    end if;
    if p_inicio < now() + interval '30 minutes' then
        return jsonb_build_object('ok', false, 'motivo', 'ocupado');
    end if;

    -- el candado: mismo terapeuta + mismo horario = misma llave
    perform pg_advisory_xact_lock(hashtext(v_t.id::text || p_inicio::text));

    if public.slot_ocupado(v_t.id, p_inicio, v_s.duracion_min) then
        return jsonb_build_object('ok', false, 'motivo', 'ocupado');
    end if;

    insert into public.web_bookings
        (therapist_id, servicio_id, servicio_nombre, nombre, telefono, correo, motivo, inicio, duracion_min)
    values
        (v_t.id, v_s.id, v_s.nombre, trim(p_nombre), trim(p_telefono),
         trim(coalesce(p_correo, '')), trim(coalesce(p_motivo, '')), p_inicio, v_s.duracion_min)
    returning id into v_id;

    -- El aviso aterriza en el panel de pendientes: sin campanas, esperando.
    insert into public.administrative_buffer (therapist_id, event_type, payload)
    values (v_t.id, 'reserva_web', jsonb_build_object(
        'texto', 'Reserva del enlace: ' || trim(p_nombre) || ' · ' || v_s.nombre,
        'reserva_id', v_id, 'nombre', trim(p_nombre),
        'inicio', p_inicio, 'servicio', v_s.nombre
    ));

    return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ── 6. Los permisos que hacen público lo público, y nada más ─────────

revoke all on function public.agenda_publica(text) from public, anon, authenticated;
revoke all on function public.slots_publicos(text, uuid) from public, anon, authenticated;
revoke all on function public.reservar_web(text, uuid, timestamptz, text, text, text, text)
    from public, anon, authenticated;

grant execute on function public.agenda_publica(text) to anon, authenticated;
grant execute on function public.slots_publicos(text, uuid) to anon, authenticated;
grant execute on function public.reservar_web(text, uuid, timestamptz, text, text, text, text)
    to anon, authenticated;

-- ── Verificación (debe devolver UNA fila: BIEN) ──────────────────────
-- Lo único que el rol anónimo puede ejecutar en public son las tres
-- funciones del enlace. Si aparece cualquier otra, se cierra antes de seguir.
--
--   select case when array_agg(p.proname order by p.proname)
--                    = array['agenda_publica','reservar_web','slots_publicos']
--               then 'BIEN' else 'MAL: ' || string_agg(p.proname, ', ') end as anon_ejecuta
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on true
--   left join pg_roles r on r.oid = a.grantee
--   where n.nspname = 'public' and a.privilege_type = 'EXECUTE'
--     and (a.grantee = 0 or r.rolname = 'anon');
