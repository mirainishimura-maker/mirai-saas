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
drop policy if exists "terapeuta gestiona sus movimientos" on public.financial_transactions;
create policy "terapeuta gestiona sus movimientos"
    on public.financial_transactions for all
    to authenticated
    using (auth.uid() = therapist_id)
    with check (auth.uid() = therapist_id);

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
