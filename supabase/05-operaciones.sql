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
