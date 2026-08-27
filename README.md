# Mirai

SaaS ético para psicólogos clínicos independientes. Historia clínica narrativa,
agenda que cuida la energía y finanzas planteadas como "cuánto aire te queda".

Construido sobre los prototipos de `Downloads/Saas` (Stitch) y el blueprint técnico
que venía con ellos, respetando el sistema de diseño **Mirai Calm System**.

---

## Cómo levantarlo

```bash
npm install
npm run dev     # http://localhost:3000
```

`npm run build && npm start` para la versión de producción.

---

## En qué punto está

**Versión navegable.** Todas las pantallas funcionan de verdad: se crean pacientes,
se escriben notas, se agenda, se marcan sesiones atendidas y los números financieros
se recalculan solos. Lo que **no** hay todavía es backend: el estado vive en
`localStorage`, en el navegador de quien abre la app.

Sirve para dos cosas concretas:

1. Usar el flujo completo durante unos días y descubrir qué falta antes de escribir
   una sola línea de backend.
2. Enseñarlo. Se abre y se recorre sin configurar nada.

---

## Mapa del código

```
app/
  layout.jsx              Fuentes (Source Serif 4 + Hanken Grotesk) y el proveedor de datos
  globals.css             Mirai Calm System completo, en tokens de Tailwind v4
  page.jsx                Redirige a /refugio
  bienvenida/             Landing pública
  (app)/
    layout.jsx            Shell con barra lateral y panel de pendientes
    refugio/              Panel de inicio: las sesiones de hoy, nada más
    pacientes/            Directorio + perfil (historia, mapa de alianza, ficha)
    calendario/           Vistas día / semana / mes y agendado
    notas/                Buscador de notas + el lienzo de enfoque
    oxigeno/              Panel financiero y árbol de la riqueza
    ajustes/              Tarifas, techo clínico e interruptores de comportamiento
    ayuda/                Recorrido y explicación de las decisiones raras

components/
  shell.jsx               Navegación, modo calma
  panel-pendientes.jsx    El buffer administrativo (sin badges, a propósito)
  mapa-alianza.jsx        Mapa de conceptualización arrastrable
  arbol.jsx               Árbol de la riqueza en SVG, alimentado por números reales
  ui.jsx                  Piezas compartidas (chips, tarjetas, campos)
  modal.jsx

lib/
  fecha.js                Fechas SIEMPRE locales (Perú es UTC-5; toISOString corre el día)
  seed.js                 Datos de ejemplo, con la forma exacta de las tablas de Postgres
  store.jsx              *La única capa de datos*. Todo pasa por useMirai()
```

### La pieza que importa para el futuro

Ninguna pantalla sabe de dónde salen los datos: todas consumen `useMirai()`.
Para migrar a Supabase se reescribe `lib/store.jsx` y se borra `lib/seed.js`.
Las pantallas no se tocan. Por eso los campos se llaman `patient_id`,
`raw_narrative`, `inferred_risk_level` y no en español: son los nombres de las
columnas del esquema de abajo.

---

## Lo que falta para atender pacientes reales

En este orden.

### 1. Cuentas y base de datos (Supabase)

El SQL ya está corregido respecto al blueprint original: incluye la tabla
`administrative_buffer` que faltaba, cifrado real de las notas y `WITH CHECK` en
todas las políticas (sin eso, una terapeuta podría insertar filas con el
`therapist_id` de otra).

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.therapists (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    professional_license TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'PEN' NOT NULL,
    tarifa_sesion NUMERIC(12,2) DEFAULT 75.00,
    target_salary_monthly NUMERIC(12,2) DEFAULT 3000.00,
    monthly_fixed_costs NUMERIC(12,2) DEFAULT 800.00,
    sesiones_semanales_sostenibles INT DEFAULT 20,
    porcentaje_semilla INT DEFAULT 10,
    friccion_reflexiva BOOLEAN DEFAULT TRUE
);

CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES public.therapists(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone_number TEXT,
    date_of_birth DATE,
    alliance_status VARCHAR(50) DEFAULT 'Rapport' NOT NULL,
    treatment_modality VARCHAR(50) DEFAULT 'TCC' NOT NULL,
    frecuencia VARCHAR(20) DEFAULT 'Semanal' NOT NULL,
    inferred_risk_level VARCHAR(20) DEFAULT 'Low' NOT NULL,
    motivo TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.clinical_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    therapist_id UUID REFERENCES public.therapists(id) ON DELETE CASCADE NOT NULL,
    session_date DATE DEFAULT CURRENT_DATE NOT NULL,
    raw_narrative_encrypted BYTEA NOT NULL,   -- pgp_sym_encrypt, nunca texto plano
    inferred_risk_level VARCHAR(20) DEFAULT 'Low' NOT NULL,
    treatment_modality VARCHAR(50) DEFAULT 'TCC' NOT NULL,
    tags TEXT[],
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES public.therapists(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    dia DATE NOT NULL,
    inicio TIME NOT NULL,
    fin TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'Scheduled' NOT NULL,
    modalidad VARCHAR(20) DEFAULT 'Presencial' NOT NULL,
    intensidad VARCHAR(20) DEFAULT 'Normal' NOT NULL,
    foco TEXT,
    whatsapp_notified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES public.therapists(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,   -- Income | Expense
    category VARCHAR(50) NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.alliance_maps (
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE PRIMARY KEY,
    therapist_id UUID REFERENCES public.therapists(id) ON DELETE CASCADE NOT NULL,
    mapa JSONB NOT NULL DEFAULT '{"nodes":[],"links":[]}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.administrative_buffer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES public.therapists(id) ON DELETE CASCADE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

RLS en las siete tablas, con `USING` **y** `WITH CHECK`:

```sql
ALTER TABLE public.therapists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_maps           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_buffer   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "propio perfil" ON public.therapists FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- y la misma forma, con therapist_id, para las otras seis tablas
```

### 2. Cifrado de las notas

`raw_narrative_encrypted` se escribe y se lee con `pgp_sym_encrypt` /
`pgp_sym_decrypt` desde funciones RPC en Supabase, con la clave en una variable de
entorno del proyecto. La clave **nunca** viaja al navegador.

Consecuencia a tener en cuenta desde ahora: el buscador de `/notas` hoy busca dentro
del texto. Sobre contenido cifrado eso no se puede hacer con `LIKE`. O se busca solo
por etiquetas y fechas, o se guarda un índice aparte de términos no sensibles.
Es una decisión de producto, no un detalle técnico.

### 3. Recordatorios de WhatsApp

Evolution API, no Twilio: es la misma infraestructura que ya corre en los otros bots.
Variables `EVOLUTION_API_URL` y `EVOLUTION_API_TOKEN`, y un endpoint
`app/api/whatsapp/route.ts` que dispara los recordatorios de las citas del día
siguiente. El consentimiento del paciente se registra al crearlo.

### 4. Lo que queda abierto a decidir

- **Fricción reflexiva:** hoy es un interruptor en Ajustes, encendido por defecto.
  Tras usarla unas semanas se decide si se queda fija, ajustable o se elimina.
- **Multi-terapeuta:** el esquema ya lo soporta, la interfaz todavía asume una sola
  persona. Cuando haya una segunda cuenta hay que agregar registro y planes.
- **Búsqueda sobre notas cifradas:** ver punto 2.

---

## Decisiones de diseño que parecen errores y no lo son

| Se ve como | Es |
|---|---|
| El botón de guardar tarda 2 segundos | La fricción reflexiva: tiempo para releer antes de cerrar la nota |
| La campana está tachada y no tiene número | Cero urgencia: lo administrativo espera en el panel de pendientes |
| El inicio no tiene gráficos ni KPIs | La pantalla de inicio muestra personas con nombre, no métricas |
| Los huecos de la agenda dicen "espacio de calma" | Un hueco no es tiempo desperdiciado |
| El modo calma quita todo el color menos el rojo de riesgo alto | Ahí el color es información clínica, no decoración |
| Las finanzas se llaman "oxígeno clínico" | Es lo que mide: cuánto aire queda para seguir atendiendo bien |
