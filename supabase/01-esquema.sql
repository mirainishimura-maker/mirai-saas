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
    tarifa_sesion numeric(12, 2) not null default 75 check (tarifa_sesion >= 0),
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
