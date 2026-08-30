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
