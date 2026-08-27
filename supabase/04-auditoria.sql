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
set search_path = public
as $$
begin
    if auth.uid() is null then
        return;
    end if;
    insert into public.access_log (therapist_id, accion, session_id, patient_id)
    values (auth.uid(), p_accion, p_session_id, p_patient_id);
end;
$$;

revoke all on function public.registrar_acceso(varchar, uuid, uuid) from anon, authenticated;

-- Purga: el registro crece para siempre si nadie lo corta. Dos años es un
-- plazo razonable para una consulta pequeña; ajustar si hace falta.
create or replace function public.purgar_registro_viejo()
returns void
language sql
security definer
set search_path = public
as $$
    delete from public.access_log where ocurrido_el < now() - interval '2 years';
$$;
