# Poner Mirai en línea

Orden estricto. El paso 4 es un bloqueo: si falla, no se sigue.

## 1 · Proyecto de Supabase nuevo

`supabase.com` → New project.

- Nombre: `mirai`
- Región: **South America (São Paulo)** — la latencia se siente al guardar una nota.
- Guardar la contraseña de la base de datos en el gestor.

**Proyecto exclusivo.** No el que comparten los bots: cualquier servicio con
esa llave anónima queda a una política mal escrita de una historia clínica.

## 2 · La llave de cifrado

Se genera una vez, se guarda en el gestor de contraseñas **antes** de pegarla,
y no vuelve a aparecer en ningún archivo de este repo.

```
openssl rand -base64 48
```

En el SQL Editor:

```sql
select vault.create_secret(
  'la-cadena-generada',
  'mirai_clave_notas',
  'Llave de cifrado de las narrativas clínicas de Mirai'
);
```

Si esta llave se pierde, las notas ya escritas no se recuperan. Eso es lo que
significa que estén cifradas de verdad.

## 3 · Instalar el esquema

SQL Editor → pegar `supabase/instalar-todo.sql` entero → Run.

Va después de la llave: sin ella el cifrado falla.

## 4 · Verificar — BLOQUEO

Correr `supabase/verificar.sql`. **Las tres consultas devuelven cero filas.**
Si alguna devuelve algo, hay historias clínicas alcanzables por quien no debe.

Y la prueba de aislamiento, que el SQL no puede hacer sola:

1. Crear dos cuentas, A y B.
2. Con A: un paciente y una nota.
3. Con B: leer esa nota por su id → **cero filas**, no un error de permisos.
   B no debería enterarse de que la fila existe.
4. Con B: `insert` en `patients` con el `therapist_id` de A → falla por `WITH CHECK`.

## 5 · Vercel

Settings → API del proyecto de Supabase, y de ahí salen las dos variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

La `service_role` **no** va acá. Nada con prefijo `NEXT_PUBLIC_` es secreto:
viaja al navegador de cualquiera.

```
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod
```

Sin esas dos variables la app arranca en modo muestra (datos en el navegador,
sin base de datos). Útil para enseñarla; inservible para atender.

## 6 · Cerrar la puerta de atrás

En Supabase → Authentication:

- **Confirmación de correo activada.** Sin esto cualquiera se registra con un
  correo que no es suyo.
- **SMTP propio** (Resend o similar). El correo por defecto de Supabase tiene
  un límite de unos pocos envíos por hora: el primer psicólogo que se registre
  no recibiría su confirmación.

## Lo que cuesta

| | |
|---|---|
| Supabase Pro | $25/mes — el plan gratis pausa el proyecto a los 7 días de inactividad y no da respaldos |
| Vercel Pro | $20/mes — el plan Hobby **prohíbe el uso comercial** |

Gratis se aguanta mientras sea el consultorio propio. Desde el primer cliente
que paga, los dos planes son obligatorios: uno por contrato, el otro porque un
proyecto pausado con historias clínicas dentro no es una opción.
