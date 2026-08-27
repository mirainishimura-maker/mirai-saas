# Base de datos de Mirai

Cinco archivos, en este orden. Se ejecutan en el **SQL Editor** de Supabase,
pegando el contenido de cada uno y dándole a *Run*.

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `01-esquema.sql` | Crea las tablas y el disparador que da de alta el perfil al registrarse. |
| 2 | `02-rls.sql` | Aísla los datos: cada terapeuta solo ve los suyos, y Postgres lo impone. |
| 3 | `03-cifrado.sql` | Cifra las narrativas clínicas y expone las funciones para leerlas y exportarlas. |
| 4 | `04-auditoria.sql` | Registra quién abrió qué historia y cuándo. |
| 5 | `05-operaciones.sql` | Atender una sesión y cobrarla como una sola operación. |

## Antes del paso 3: crear la llave

El cifrado no funciona sin una llave, y la llave no está en este repo a
propósito. Se crea una sola vez:

```sql
select vault.create_secret(
  'pega-aquí-una-cadena-larga-y-aleatoria',
  'mirai_clave_notas',
  'Llave de cifrado de las narrativas clínicas de Mirai'
);
```

Para generar la cadena: `openssl rand -base64 48`.

**Guárdala también en un gestor de contraseñas, fuera de Supabase.** Si se
pierde, las notas ya escritas no se recuperan: eso es lo que significa que
estén cifradas de verdad.

## El proyecto de Supabase tiene que ser nuevo

No reutilizar el proyecto compartido con los bots. Ahí conviven servicios que
tienen esa llave anónima, y entre ellos y una tabla de historias clínicas
solo habría una política mal escrita. Un proyecto exclusivo cuesta lo mismo y
elimina esa clase entera de accidentes.

## Cómo comprobar que el aislamiento funciona

No basta con que el SQL se ejecute sin errores. Antes de que entre un solo
paciente real, la prueba es esta:

1. Crear **dos** cuentas de prueba, A y B.
2. Con A, crear un paciente y escribirle una nota.
3. Con la sesión de B, intentar leer esa nota por su id.
4. Debe devolver **cero filas**, no un error de permisos: B no debería ni
   enterarse de que esa fila existe.
5. Con B, intentar `insert` en `patients` poniendo el `therapist_id` de A.
   Debe fallar por la política `WITH CHECK`.

Si el paso 4 devuelve datos, hay algo mal en `02-rls.sql` y no se sigue
adelante.

### Y comprobar los permisos de las funciones

Postgres concede `EXECUTE` a `PUBLIC` en toda función nueva, y PostgREST
publica como RPC lo que viva en el esquema `public`. Una revocación que se
olvide de `PUBLIC` no cierra nada, aunque lo parezca: el rol anónimo hereda
el permiso igual. Esta consulta tiene que devolver **cero filas**:

```sql
select p.proname, coalesce(r.rolname, 'PUBLIC') as quien_puede_ejecutar
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
```

`grantee = 0` es `PUBLIC`. Si `clave_notas` aparece en esa lista, la llave
de cifrado está a una llamada de distancia de cualquiera que tenga la llave
anónima, y esa llave viaja en el navegador de todo el mundo.

## Lo que este esquema NO resuelve

- **Respaldos.** Supabase los hace, pero un respaldo que nunca se restauró no
  es un respaldo. Hay que probar una restauración antes del piloto.
- **La búsqueda dentro de las notas.** Sobre texto cifrado no se puede buscar:
  el buscador queda limitado a las etiquetas. Por eso las etiquetas van en
  claro, y por eso no deben llevar nombres ni datos identificables.
- **El acceso físico.** Si alguien se sienta en la laptop con la sesión
  abierta, entra. Eso se cubre con cierre de sesión por inactividad, en la app.
