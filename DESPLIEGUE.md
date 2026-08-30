# Poner Mirai en línea

Orden estricto. El paso 4 es un bloqueo: si falla, no se sigue.

## 0 · Antes de todo lo demás: 2FA

Quince minutos, y pesan más que todo el SQL de este repo junto.

La llave `service_role` de Supabase se salta RLS por completo: abre todas las
historias clínicas de todas las cuentas. No está en el código — está detrás de
la contraseña del panel. Lo mismo Vercel, lo mismo GitHub. Y las tres se
recuperan por correo, así que el correo es la llave maestra de las tres.

| Dónde | Ruta |
|---|---|
| Gmail | Cuenta → Seguridad → Verificación en dos pasos |
| Supabase | Account Settings → Security → Enable MFA |
| Vercel | Account Settings → Authentication → Two-Factor |
| GitHub | Settings → Password and authentication |

Con app de autenticación, no con SMS. Y guardar los códigos de respaldo en el
gestor de contraseñas, no en el correo: si pierdes el teléfono y los códigos
están en el Gmail que ya no puedes abrir, quedaste fuera de tu propio producto.

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

**Hasta dónde llega este cifrado.** Protege contra un respaldo robado, contra
un `select` con la llave anónima y contra quien mire la tabla por dentro: ahí
solo hay bytes. No protege contra quien tenga la `service_role`, porque la
llave vive en el Vault del mismo proyecto. Es la frontera correcta para un
producto que se pueda usar — si la llave la tuviera solo el psicólogo, olvidar
la contraseña sería perder las historias de sus pacientes — pero es la frontera,
y hay que saber decirla en voz alta cuando un cliente pregunte.

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

## 6 · Cerrar el registro

En Supabase → Authentication → Sign In / Providers:

- **Confirm email: activado.** Sin esto cualquiera se registra con un correo
  que no es suyo.
- **Allow new users to sign up: DESACTIVADO.** Mientras Mirai se venda a uno
  por uno, las cuentas las creas tú desde Authentication → Users → Invite. Eso
  cierra el abuso de bots sin CAPTCHA ni código, y de paso decide quién entra,
  que es exactamente lo que quieres mientras no exista el control de suscripción.
- **SMTP propio** (Resend o similar). El correo por defecto de Supabase tiene
  un límite de unos pocos envíos por hora: la invitación no llegaría.

Cuando llegue el día de abrir el registro al público, se reactiva y se le
agrega Turnstile — el widget en el formulario y el token en `signUp`.

## 7 · Monitoreo

`/api/salud` responde `200 {"estado":"ok"}` solo si Supabase contesta de
verdad. Si el proyecto está pausado o caído, devuelve **503**. No expone ni una
fila: solo si responde y cuánto tardó.

Registrar esa URL en un monitor gratuito (UptimeRobot, BetterStack) cada 5
minutos, con aviso al correo y al teléfono. Esto es lo que evita repetir los
33 días caídos sin que nadie lo notara.

## 8 · Respaldos, y probar que sirven

El plan gratuito **no tiene respaldos**. Con Pro hay copia diaria.

La parte que casi nadie hace: **restaurar una vez, antes del piloto.** Crear un
proyecto de prueba, restaurar ahí la copia y comprobar que una nota se lee
descifrada. Un respaldo que nunca se restauró no es un respaldo, y el día que
lo necesites no es el día de descubrir que la llave del Vault no viajaba con él.

El escenario más probable de pérdida no es un atacante: es un `delete` mal
escrito o un proyecto pausado.

## Lo que cuesta

| | |
|---|---|
| Supabase Pro | $25/mes — el plan gratis pausa el proyecto a los 7 días de inactividad y no da respaldos |
| Vercel Pro | $20/mes — el plan Hobby **prohíbe el uso comercial** |

Gratis se aguanta mientras sea el consultorio propio. Desde el primer cliente
que paga, los dos planes son obligatorios: uno por contrato, el otro porque un
proyecto pausado con historias clínicas dentro no es una opción.
