/** @type {import('next').NextConfig} */

// Cabeceras de seguridad. Ninguna arregla un fallo de la aplicación: lo que
// hacen es limitar el daño de uno que se nos haya escapado.
const cabeceras = [
  // Nadie mete Mirai en un iframe. Sin esto, una página ajena la incrusta
  // invisible y le roba los clics a quien tenga la sesión abierta.
  { key: 'X-Frame-Options', value: 'DENY' },

  // El navegador respeta el tipo declarado y no adivina. Corta la clase de
  // ataque en que un archivo subido se acaba ejecutando como script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // La URL de una historia clínica lleva el id del paciente. Que no viaje
  // como 'referer' a ningún sitio de fuera.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Mirai no usa cámara, micrófono ni ubicación. Declararlo cierra la
  // puerta por si algún día un script inyectado lo intenta.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },

  // Un año de HTTPS obligatorio, sin excepción por subdominio.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },

  // La línea que más importa es connect-src: aunque alguien logre colar un
  // script, no puede mandar los datos a un servidor suyo, porque el
  // navegador solo le permite hablar con Supabase y con Mirai.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
]

const nextConfig = {
  reactStrictMode: true,

  // Que la versión de Next no se anuncie en cada respuesta.
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: cabeceras }]
  },
}

export default nextConfig
