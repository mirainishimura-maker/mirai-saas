-- ═══════════════════════════════════════════════════════════════════
-- Mirai · INSTALACIÓN COMPLETA
--
-- Pega esto ENTERO en el SQL Editor de Supabase y dale a Run.
-- Es la unión de 01, 02, 04, 05 y 03, en el orden en que se necesitan.
--
-- ANTES de correr esto hay que haber creado la llave del Vault.
-- Si no está creada, el cifrado falla. Ver PASO 1 del README.
-- ═══════════════════════════════════════════════════════════════════


-- ┌───────────────────────────────────────────────────────────────
-- │ 01-esquema.sql
-- └───────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────
-- Mirai · 01 · Esquema
--
-- Se ejecuta UNA vez, en un proyecto de Supabase NUEVO y exclusivo para
-- Mirai. No reutilizar el proyecto compartido con los bots: cualquier
-- servicio que tenga esa llave anónima queda a un paso de una tabla de
-- historias clínicas, y ese paso es una política mal escrita.
--
-- Orden: 01-esquema → 02-rls → 03-cifrado → 04-auditoria
-- ─────────────────────────────────────────────────────────────────────

-- pgcrypto va al esquema 'extensions', que es donde Supabase pone las suyas.
-- Los identificadores usan gen_random_uuid(), que es de pg_catalog desde
-- Postgres 13 y no necesita extensión ninguna.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- 1. TERAPEUTAS ───────────────────────────────────────────────────────
-- Extiende auth.users. Una fila por cuenta; el id ES el de Supabase Auth.
create table if not exists public.therapists (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null default '',
    professional_license text,
    base_currency varchar(3) not null default 'PEN',
    -- Mayor que cero, no solo no negativa: financial_transactions.amount
    -- exige > 0, y una tarifa en cero haría fallar el cobro y revertiría el
    -- 'atendida' entero al marcar una sesión.
    tarifa_sesion numeric(12, 2) not null default 75 check (tarifa_sesion > 0),
    target_salary_monthly numeric(12, 2) not null default 3000 check (target_salary_monthly >= 0),
    monthly_fixed_costs numeric(12, 2) not null default 800 check (monthly_fixed_costs >= 0),
    sesiones_semanales_sostenibles int not null default 20
        check (sesiones_semanales_sostenibles between 1 and 60),
    porcentaje_semilla int not null default 10 check (porcentaje_semilla between 0 and 100),
    friccion_reflexiva boolean not null default true,
    modo_calma boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Al registrarse una cuenta se crea su perfil solo. Sin esto, una terapeuta
-- recién registrada entra a una app que no sabe quién es.
create or replace function public.crear_perfil_terapeuta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.therapists (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
    on conflict (id) do nothing;
    return new;
end;
$$;

-- La invoca el disparador, no el cliente: mismo cuidado que en el resto de
-- funciones definer, o PostgREST la publica como RPC.
revoke all on function public.crear_perfil_terapeuta() from public, anon, authenticated;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
    after insert on auth.users
    for each row execute function public.crear_perfil_terapeuta();

-- 2. PACIENTES ────────────────────────────────────────────────────────
create table if not exists public.patients (
    id uuid primary key default gen_random_uuid(),
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    first_name text not null,
    last_name text not null default '',
    email text,
    phone_number text,
    date_of_birth date,
    alliance_status varchar(30) not null default 'Rapport'
        check (alliance_status in ('Rapport', 'Autoexploración', 'Experimentos', 'Alta')),
    treatment_modality varchar(30) not null default 'TCC',
    frecuencia varchar(20) not null default 'Semanal',
    inferred_risk_level varchar(10) not null default 'Low'
        check (inferred_risk_level in ('Low', 'Medium', 'High')),
    motivo text not null default '',
    -- Notas de contacto, NO clínicas: horarios, preferencias, acuerdos.
    -- Lo clínico va cifrado en clinical_sessions.
    notes text not null default '',
    archivado boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_patients_therapist on public.patients (therapist_id);
create index if not exists idx_patients_riesgo
    on public.patients (therapist_id, inferred_risk_level)
    where inferred_risk_level = 'High';

-- 3. SESIONES CLÍNICAS ────────────────────────────────────────────────
-- La narrativa NUNCA se guarda en claro. Solo entra y sale por las
-- funciones de 03-cifrado.sql, que descifran del lado del servidor.
create table if not exists public.clinical_sessions (
    id uuid primary key default gen_random_uuid(),
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    patient_id uuid not null references public.patients(id) on delete cascade,
    session_date date not null default current_date,
    raw_narrative_encrypted bytea not null,
    treatment_modality varchar(30) not null default 'TCC',
    inferred_risk_level varchar(10) not null default 'Low'
        check (inferred_risk_level in ('Low', 'Medium', 'High')),
    -- Las etiquetas van en claro a propósito: son el único modo de buscar
    -- dentro de un historial cifrado. Por eso no deben llevar datos
    -- identificables, y la interfaz lo advierte.
    tags text[] not null default '{}',
    is_completed boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_paciente
    on public.clinical_sessions (patient_id, session_date desc);
create index if not exists idx_sessions_tags on public.clinical_sessions using gin (tags);

-- 4. CITAS ────────────────────────────────────────────────────────────
create table if not exists public.appointments (
    id uuid primary key default gen_random_uuid(),
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    patient_id uuid not null references public.patients(id) on delete cascade,
    dia date not null,
    inicio time not null,
    fin time not null,
    status varchar(20) not null default 'Scheduled'
        check (status in ('Scheduled', 'Completed', 'Cancelled', 'No Show')),
    modalidad varchar(20) not null default 'Presencial',
    intensidad varchar(10) not null default 'Normal'
        check (intensidad in ('Baja', 'Normal', 'Alta')),
    foco text not null default '',
    whatsapp_notified boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- La misma invariante que valida la app, pero acá no se puede saltar
    -- desde ningún cliente.
    constraint horario_coherente check (fin > inicio)
);

create index if not exists idx_appointments_dia on public.appointments (therapist_id, dia);

-- 5. MOVIMIENTOS ──────────────────────────────────────────────────────
create table if not exists public.financial_transactions (
    id uuid primary key default gen_random_uuid(),
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    patient_id uuid references public.patients(id) on delete set null,
    appointment_id uuid references public.appointments(id) on delete cascade,
    amount numeric(12, 2) not null check (amount > 0),
    transaction_type varchar(10) not null check (transaction_type in ('Income', 'Expense')),
    category varchar(50) not null,
    transaction_date date not null default current_date,
    created_at timestamptz not null default now()
);

-- Una cita atendida genera un cobro y solo uno.
create unique index if not exists idx_cobro_unico_por_cita
    on public.financial_transactions (appointment_id)
    where appointment_id is not null;
create index if not exists idx_transactions_fecha
    on public.financial_transactions (therapist_id, transaction_date desc);

-- 6. MAPAS DE ALIANZA ─────────────────────────────────────────────────
create table if not exists public.alliance_maps (
    patient_id uuid primary key references public.patients(id) on delete cascade,
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    contenido jsonb not null default '{"nodes": [], "links": []}'::jsonb,
    updated_at timestamptz not null default now()
);

-- 7. BUFFER ADMINISTRATIVO ────────────────────────────────────────────
create table if not exists public.administrative_buffer (
    id uuid primary key default gen_random_uuid(),
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    event_type varchar(50) not null,
    payload jsonb not null default '{}'::jsonb,
    read boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_buffer_therapist
    on public.administrative_buffer (therapist_id, created_at desc);

-- updated_at automático ───────────────────────────────────────────────
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

do $$
declare t text;
begin
    foreach t in array array[
        'therapists', 'patients', 'clinical_sessions', 'appointments', 'alliance_maps'
    ] loop
        execute format(
            'drop trigger if exists tocar_%1$s on public.%1$s;
             create trigger tocar_%1$s before update on public.%1$s
             for each row execute function public.tocar_updated_at();', t
        );
    end loop;
end;
$$;


-- ┌───────────────────────────────────────────────────────────────
-- │ 02-rls.sql
-- └───────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────
-- Mirai · 02 · Row Level Security
--
-- Sin esto, la llave anónima que viaja en el navegador de cualquiera lee
-- la tabla entera de historias clínicas. Con esto, cada consulta la filtra
-- Postgres por el usuario del token, antes de devolver una sola fila.
--
-- Cada política lleva USING y WITH CHECK:
--   USING       → qué filas puede VER y tocar.
--   WITH CHECK  → qué filas puede DEJAR escritas.
-- Sin WITH CHECK, una terapeuta podría insertar una fila con el
-- therapist_id de otra, o mover un paciente suyo a la cuenta ajena.
-- ─────────────────────────────────────────────────────────────────────

alter table public.therapists            enable row level security;
alter table public.patients              enable row level security;
alter table public.clinical_sessions     enable row level security;
alter table public.appointments          enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.alliance_maps         enable row level security;
alter table public.administrative_buffer enable row level security;

-- Y que ni el dueño de la tabla se las salte por accidente.
alter table public.therapists            force row level security;
alter table public.patients              force row level security;
alter table public.clinical_sessions     force row level security;
alter table public.appointments          force row level security;
alter table public.financial_transactions force row level security;
alter table public.alliance_maps         force row level security;
alter table public.administrative_buffer force row level security;

-- Perfil ──────────────────────────────────────────────────────────────
drop policy if exists "terapeuta ve su perfil" on public.therapists;
create policy "terapeuta ve su perfil"
    on public.therapists for select
    to authenticated
    using (auth.uid() = id);

drop policy if exists "terapeuta edita su perfil" on public.therapists;
create policy "terapeuta edita su perfil"
    on public.therapists for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- El perfil lo crea el trigger de registro, no el cliente: por eso no hay
-- política de insert ni de delete. Dar de baja una cuenta se hace borrando
-- el usuario en auth.users, y el on delete cascade limpia todo lo demás.

-- Pacientes ───────────────────────────────────────────────────────────
drop policy if exists "terapeuta gestiona sus pacientes" on public.patients;
create policy "terapeuta gestiona sus pacientes"
    on public.patients for all
    to authenticated
    using (auth.uid() = therapist_id)
    with check (auth.uid() = therapist_id);

-- Sesiones clínicas ───────────────────────────────────────────────────
-- Además del dueño, se exige que el paciente sea suyo: sin esta segunda
-- condición se podría colgar una nota del paciente de otra terapeuta.
drop policy if exists "terapeuta gestiona sus sesiones" on public.clinical_sessions;
create policy "terapeuta gestiona sus sesiones"
    on public.clinical_sessions for all
    to authenticated
    using (auth.uid() = therapist_id)
    with check (
        auth.uid() = therapist_id
        and exists (
            select 1 from public.patients p
            where p.id = patient_id and p.therapist_id = auth.uid()
        )
    );

-- Citas ───────────────────────────────────────────────────────────────
drop policy if exists "terapeuta gestiona su agenda" on public.appointments;
create policy "terapeuta gestiona su agenda"
    on public.appointments for all
    to authenticated
    using (auth.uid() = therapist_id)
    with check (
        auth.uid() = therapist_id
        and exists (
            select 1 from public.patients p
            where p.id = patient_id and p.therapist_id = auth.uid()
        )
    );

-- Movimientos ─────────────────────────────────────────────────────────
-- Además del dueño, se exige que el paciente y la cita referidos sean
-- suyos. Sin esto, una terapeuta podría crear un movimiento propio
-- apuntando a la cita de otra: como idx_cobro_unico_por_cita es único y
-- global, esa fila ocuparía el hueco y le bloquearía el cobro legítimo a
-- la otra.
drop policy if exists "terapeuta gestiona sus movimientos" on public.financial_transactions;
create policy "terapeuta gestiona sus movimientos"
    on public.financial_transactions for all
    to authenticated
    using (auth.uid() = therapist_id)
    with check (
        auth.uid() = therapist_id
        and (
            patient_id is null
            or exists (
                select 1 from public.patients p
                where p.id = patient_id and p.therapist_id = auth.uid()
            )
        )
        and (
            appointment_id is null
            or exists (
                select 1 from public.appointments a
                where a.id = appointment_id and a.therapist_id = auth.uid()
            )
        )
    );

-- Mapas ───────────────────────────────────────────────────────────────
drop policy if exists "terapeuta gestiona sus mapas" on public.alliance_maps;
create policy "terapeuta gestiona sus mapas"
    on public.alliance_maps for all
    to authenticated
    using (auth.uid() = therapist_id)
    with check (
        auth.uid() = therapist_id
        and exists (
            select 1 from public.patients p
            where p.id = patient_id and p.therapist_id = auth.uid()
        )
    );

-- Buffer administrativo ───────────────────────────────────────────────
drop policy if exists "terapeuta ve su buffer" on public.administrative_buffer;
create policy "terapeuta ve su buffer"
    on public.administrative_buffer for select
    to authenticated
    using (auth.uid() = therapist_id);

drop policy if exists "terapeuta marca su buffer" on public.administrative_buffer;
create policy "terapeuta marca su buffer"
    on public.administrative_buffer for update
    to authenticated
    using (auth.uid() = therapist_id)
    with check (auth.uid() = therapist_id);

-- Nadie escribe el buffer desde el navegador: lo llenan procesos del
-- servidor (recordatorios, pagos) con la llave de servicio.

-- Cerrar la puerta de atrás ───────────────────────────────────────────
-- El rol anon es el de quien NO ha iniciado sesión. No tiene nada que
-- hacer en ninguna de estas tablas.
revoke all on public.therapists            from anon;
revoke all on public.patients              from anon;
revoke all on public.clinical_sessions     from anon;
revoke all on public.appointments          from anon;
revoke all on public.financial_transactions from anon;
revoke all on public.alliance_maps         from anon;
revoke all on public.administrative_buffer from anon;


-- ┌───────────────────────────────────────────────────────────────
-- │ 04-auditoria.sql
-- └───────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────
-- Mirai · 04 · Registro de accesos
--
-- Una historia clínica no solo se protege: se rinde cuentas de ella. Este
-- registro responde a "¿quién abrió esta historia y cuándo?", que es la
-- pregunta que aparece el día que algo se cuestiona.
--
-- Nadie puede editarlo ni borrarlo, ni siquiera la terapeuta dueña de los
-- datos: un registro que el interesado puede modificar no sirve de nada.
-- Ella sí puede leer el suyo, porque es su propia actividad.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.access_log (
    id bigserial primary key,
    therapist_id uuid not null references public.therapists(id) on delete cascade,
    accion varchar(20) not null,
    session_id uuid,
    patient_id uuid,
    ocurrido_el timestamptz not null default now()
);

create index if not exists idx_access_log_therapist
    on public.access_log (therapist_id, ocurrido_el desc);

alter table public.access_log enable row level security;
alter table public.access_log force row level security;

drop policy if exists "terapeuta lee su registro" on public.access_log;
create policy "terapeuta lee su registro"
    on public.access_log for select
    to authenticated
    using (auth.uid() = therapist_id);

-- Sin políticas de insert, update ni delete a propósito: escribe la función
-- de abajo, que corre como definer, y nadie lo modifica después.
revoke all on public.access_log from anon, authenticated;
grant select on public.access_log to authenticated;

create or replace function public.registrar_acceso(
    p_accion varchar,
    p_session_id uuid default null,
    p_patient_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        return;
    end if;
    insert into public.access_log (therapist_id, accion, session_id, patient_id)
    values (auth.uid(), p_accion, p_session_id, p_patient_id);
end;
$$;

-- Esta es la revocación que hace que el registro valga algo. Sin quitársela
-- a PUBLIC, cualquiera con sesión podría invocarla por RPC y fabricar
-- accesos que nunca ocurrieron, que es justo lo contrario de una auditoría.
-- Las funciones de 03-cifrado.sql la siguen llamando porque se ejecutan
-- como su propietario, no como quien las invoca.
revoke all on function public.registrar_acceso(varchar, uuid, uuid)
    from public, anon, authenticated;

-- Purga: el registro crece para siempre si nadie lo corta. Dos años es un
-- plazo razonable para una consulta pequeña; ajustar si hace falta.
-- La ejecuta una tarea programada con la llave de servicio, nunca la app.
create or replace function public.purgar_registro_viejo()
returns void
language sql
security definer
set search_path = ''
as $$
    delete from public.access_log where ocurrido_el < now() - interval '2 years';
$$;

revoke all on function public.purgar_registro_viejo() from public, anon, authenticated;
grant execute on function public.purgar_registro_viejo() to service_role;


-- ┌───────────────────────────────────────────────────────────────
-- │ 05-operaciones.sql
-- └───────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────
-- Mirai · 05 · Operaciones que tienen que pasar enteras o no pasar
--
-- Marcar una sesión como atendida son dos cosas a la vez: cambiar el
-- estado de la cita y registrar su cobro. Hechas por separado desde el
-- navegador, una conexión que se corta en medio deja una sesión atendida
-- que nadie cobró, o un cobro de una sesión que no consta atendida.
--
-- Dentro de una función son una sola operación: o pasan las dos o no pasa
-- ninguna.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.atender_cita(
    p_cita_id uuid,
    p_status varchar
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_terapeuta uuid := auth.uid();
    v_cita public.appointments%rowtype;
    v_tarifa numeric(12, 2);
begin
    if v_terapeuta is null then
        raise exception 'Hay que iniciar sesión';
    end if;

    if p_status not in ('Scheduled', 'Completed', 'Cancelled', 'No Show') then
        raise exception 'Ese no es un estado de sesión válido';
    end if;

    select * into v_cita
    from public.appointments
    where id = p_cita_id and therapist_id = v_terapeuta;

    if not found then
        raise exception 'Esa sesión no existe o no es tuya';
    end if;

    update public.appointments set status = p_status where id = p_cita_id;

    if p_status = 'Completed' then
        select tarifa_sesion into v_tarifa from public.therapists where id = v_terapeuta;

        insert into public.financial_transactions (
            therapist_id, patient_id, appointment_id, amount,
            transaction_type, category, transaction_date
        )
        values (
            v_terapeuta, v_cita.patient_id, p_cita_id, v_tarifa,
            'Income', 'Sesión', v_cita.dia
        )
        on conflict (appointment_id) where appointment_id is not null
        do update set amount = excluded.amount, transaction_date = excluded.transaction_date;
    else
        -- Deshacer el "atendida" deshace su cobro: si no, marcar por error
        -- una sesión deja plata que nunca entró en el panel.
        delete from public.financial_transactions where appointment_id = p_cita_id;
    end if;
end;
$$;

revoke all on function public.atender_cita(uuid, varchar) from public, anon, authenticated;
grant execute on function public.atender_cita(uuid, varchar) to authenticated;


-- ┌───────────────────────────────────────────────────────────────
-- │ 03-cifrado.sql
-- └───────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────
-- Mirai · 03 · Cifrado de la narrativa clínica
--
-- La regla: la llave de cifrado NUNCA llega al navegador. Vive en el Vault
-- de Supabase y solo la leen estas funciones, que corren en el servidor.
-- El cliente llama a guardar_nota() y leer_notas(); nunca hace select
-- directo sobre raw_narrative_encrypted, que para él es un montón de bytes.
--
-- DOS COSAS QUE PARECEN DETALLE Y NO LO SON:
--
-- 1. `revoke ... from public`. Postgres concede EXECUTE a PUBLIC en toda
--    función nueva, y los privilegios efectivos son la unión de los del rol
--    y los de PUBLIC. Revocar solo de `anon` no quita nada. Como estas
--    funciones viven en el esquema public, PostgREST las publica como RPC
--    alcanzables con la llave anónima: sin revocar de PUBLIC, clave_notas()
--    devolvería la llave de cifrado a cualquiera que la invoque.
--
-- 2. `set search_path = ''`. Fija la resolución de nombres, para que nadie
--    pueda colar un objeto propio que suplante a una tabla o a una función.
--    Obliga a cualificar todo con su esquema, que es justo lo que se quiere.
--
-- ANTES de ejecutar este archivo, crear la llave (una vez, en el SQL
-- Editor, con una cadena larga y aleatoria que NO se guarde en el repo):
--
--   select vault.create_secret(
--     'pega-aquí-una-cadena-larga-y-aleatoria',
--     'mirai_clave_notas',
--     'Llave de cifrado de las narrativas clínicas de Mirai'
--   );
--
-- Generarla, por ejemplo, con:  openssl rand -base64 48
-- Si esa llave se pierde, las notas ya escritas no se recuperan. Guardarla
-- también en un gestor de contraseñas, fuera de Supabase.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.clave_notas()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select decrypted_secret from vault.decrypted_secrets where name = 'mirai_clave_notas';
$$;

-- La llave no la invoca nadie desde fuera: solo las funciones de abajo, que
-- se ejecutan como su propietario y por eso no necesitan permiso explícito.
revoke all on function public.clave_notas() from public, anon, authenticated;

-- Guardar ─────────────────────────────────────────────────────────────
create or replace function public.guardar_nota(
    p_patient_id uuid,
    p_narrativa text,
    p_modalidad varchar default 'TCC',
    p_riesgo varchar default 'Low',
    p_tags text[] default '{}',
    p_fecha date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_terapeuta uuid := auth.uid();
    v_id uuid;
begin
    if v_terapeuta is null then
        raise exception 'Hay que iniciar sesión para escribir una nota';
    end if;

    -- security definer se salta RLS, así que la pertenencia se comprueba a
    -- mano. Sin esto, cualquiera con sesión podría escribir en la historia
    -- de un paciente ajeno pasando su id.
    if not exists (
        select 1 from public.patients
        where id = p_patient_id and therapist_id = v_terapeuta
    ) then
        raise exception 'Ese paciente no es tuyo';
    end if;

    if coalesce(trim(p_narrativa), '') = '' then
        raise exception 'Una nota vacía no se guarda';
    end if;

    insert into public.clinical_sessions (
        therapist_id, patient_id, session_date, raw_narrative_encrypted,
        treatment_modality, inferred_risk_level, tags
    )
    values (
        v_terapeuta, p_patient_id, p_fecha,
        extensions.pgp_sym_encrypt(p_narrativa, public.clave_notas()),
        p_modalidad, p_riesgo, p_tags
    )
    returning id into v_id;

    if p_riesgo = 'High' then
        update public.patients
        set inferred_risk_level = 'High'
        where id = p_patient_id and therapist_id = v_terapeuta;
    end if;

    perform public.registrar_acceso('escribir', v_id, p_patient_id);
    return v_id;
end;
$$;

-- Leer ────────────────────────────────────────────────────────────────
create or replace function public.leer_notas(p_patient_id uuid default null)
returns table (
    id uuid,
    patient_id uuid,
    session_date date,
    raw_narrative text,
    treatment_modality varchar,
    inferred_risk_level varchar,
    tags text[],
    created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_terapeuta uuid := auth.uid();
    v_clave text;
begin
    if v_terapeuta is null then
        raise exception 'Hay que iniciar sesión para leer notas';
    end if;

    -- Una sola lectura de la llave para toda la consulta, no una por fila.
    v_clave := public.clave_notas();

    perform public.registrar_acceso('leer', null, p_patient_id);

    return query
    select
        s.id,
        s.patient_id,
        s.session_date,
        extensions.pgp_sym_decrypt(s.raw_narrative_encrypted, v_clave),
        s.treatment_modality,
        s.inferred_risk_level,
        s.tags,
        s.created_at
    from public.clinical_sessions s
    where s.therapist_id = v_terapeuta
      and (p_patient_id is null or s.patient_id = p_patient_id)
    order by s.session_date desc, s.created_at desc;
end;
$$;

-- Editar ──────────────────────────────────────────────────────────────
create or replace function public.editar_nota(
    p_id uuid,
    p_narrativa text,
    p_riesgo varchar default null,
    p_tags text[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_terapeuta uuid := auth.uid();
begin
    if v_terapeuta is null then
        raise exception 'Hay que iniciar sesión';
    end if;

    -- Igual que al crearla: editar una nota hasta dejarla vacía sería
    -- borrar su contenido por la puerta de atrás.
    if coalesce(trim(p_narrativa), '') = '' then
        raise exception 'Una nota vacía no se guarda';
    end if;

    update public.clinical_sessions
    set raw_narrative_encrypted = extensions.pgp_sym_encrypt(p_narrativa, public.clave_notas()),
        inferred_risk_level = coalesce(p_riesgo, inferred_risk_level),
        tags = coalesce(p_tags, tags)
    where id = p_id and therapist_id = v_terapeuta;

    if not found then
        raise exception 'Esa nota no existe o no es tuya';
    end if;

    perform public.registrar_acceso('editar', p_id, null);
end;
$$;

-- Exportar ────────────────────────────────────────────────────────────
-- Su historia clínica tiene que poder salir de Mirai. Esto es lo que la
-- protege a ella si el servicio desaparece, y lo que hace razonable
-- confiarle los datos en primer lugar.
--
-- Cada subconsulta filtra por paciente Y por terapeuta. Que el paciente sea
-- suyo ya se comprobó arriba, así que el segundo filtro hoy es redundante.
-- Va igual porque security definer se salta RLS: esta es la única función
-- que devuelve historias en claro, y es el último sitio donde conviene
-- depender de que una comprobación de más arriba siga estando ahí mañana.
create or replace function public.exportar_historia(p_patient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_terapeuta uuid := auth.uid();
    v_clave text;
    v_salida jsonb;
begin
    if v_terapeuta is null then
        raise exception 'Hay que iniciar sesión';
    end if;

    if not exists (
        select 1 from public.patients
        where id = p_patient_id and therapist_id = v_terapeuta
    ) then
        raise exception 'Ese paciente no es tuyo';
    end if;

    v_clave := public.clave_notas();

    select jsonb_build_object(
        'exportado_el', now(),
        'paciente', to_jsonb(p) - 'therapist_id',
        'sesiones', coalesce((
            select jsonb_agg(jsonb_build_object(
                'fecha', s.session_date,
                'modalidad', s.treatment_modality,
                'riesgo', s.inferred_risk_level,
                'etiquetas', s.tags,
                'narrativa', extensions.pgp_sym_decrypt(s.raw_narrative_encrypted, v_clave)
            ) order by s.session_date)
            from public.clinical_sessions s
            where s.patient_id = p_patient_id and s.therapist_id = v_terapeuta
        ), '[]'::jsonb),
        'citas', coalesce((
            select jsonb_agg(jsonb_build_object(
                'dia', a.dia, 'inicio', a.inicio, 'fin', a.fin, 'estado', a.status
            ) order by a.dia)
            from public.appointments a
            where a.patient_id = p_patient_id and a.therapist_id = v_terapeuta
        ), '[]'::jsonb),
        'mapa', coalesce((
            select m.contenido from public.alliance_maps m
            where m.patient_id = p_patient_id and m.therapist_id = v_terapeuta
        ), '{}'::jsonb)
    )
    into v_salida
    from public.patients p
    where p.id = p_patient_id and p.therapist_id = v_terapeuta;

    perform public.registrar_acceso('exportar', null, p_patient_id);
    return v_salida;
end;
$$;

-- Permisos ────────────────────────────────────────────────────────────
-- Primero se le quita a PUBLIC (que es quien de verdad tiene el permiso
-- por defecto) y solo después se concede a quien debe tenerlo.
revoke all on function public.guardar_nota(uuid, text, varchar, varchar, text[], date)
    from public, anon, authenticated;
revoke all on function public.leer_notas(uuid) from public, anon, authenticated;
revoke all on function public.editar_nota(uuid, text, varchar, text[])
    from public, anon, authenticated;
revoke all on function public.exportar_historia(uuid) from public, anon, authenticated;

grant execute on function public.guardar_nota(uuid, text, varchar, varchar, text[], date)
    to authenticated;
grant execute on function public.leer_notas(uuid) to authenticated;
grant execute on function public.editar_nota(uuid, text, varchar, text[]) to authenticated;
grant execute on function public.exportar_historia(uuid) to authenticated;

