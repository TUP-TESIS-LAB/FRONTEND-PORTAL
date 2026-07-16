# Probar la PWA + push desde un celular real

## Requisitos (una sola vez)
1. `npx web-push generate-vapid-keys` → guardar el par de claves.
2. Exportar en el entorno donde corre el backend:
   ```bash
   export PORTAL_PUSH_VAPID_PUBLIC_KEY="<publicKey>"
   export PORTAL_PUSH_VAPID_PRIVATE_KEY="<privateKey>"
   export PORTAL_PUSH_VAPID_SUBJECT="mailto:dev@laboratorio.local"
   ```
   La clave privada NUNCA se commitea.
3. Instalar cloudflared: `sudo apt install cloudflared` (o descargar el binario de Cloudflare).

## Cada sesión de prueba
1. Backend levantado en :8080 (docker compose + ./mvnw spring-boot:run) con las env vars de arriba.
2. `npm run serve:pwa` → sirve el build de producción (SW activo) en :8081 proxeando /api y /public.
3. `cloudflared tunnel --url http://localhost:8081` → copia la URL https://<random>.trycloudflare.com
   (TLS válido, gratis, sin cuenta: sin warnings de certificado).
4. En el celular: abrir `https://<random>.trycloudflare.com/?tenant=<slug>` —
   el `?tenant=` es OBLIGATORIO la primera vez (en hosts de túnel el subdominio
   random no es un slug; el tenant queda persistido en localStorage y la PWA
   instalada, que abre sin query, lo reutiliza) →
   menú del navegador → "Agregar a pantalla de inicio" → abrir la PWA instalada.
5. Login como paciente/responsable → en el dashboard tocar "Activar notificaciones" → aceptar el permiso.
6. Desde el front administrativo: firmar un resultado o estudio del paciente.
7. El push llega al celular aunque la PWA esté cerrada. Tocarlo abre /estudios.

## Restricciones conocidas
- iOS: requiere 16.4+ y la PWA INSTALADA en la pantalla de inicio (Safari no recibe push en pestaña).
- Android/Chrome: recibe con el navegador cerrado.
- La URL del quick tunnel cambia en cada arranque (para demo estable, follow-up de hosting).
- En `ng serve` (dev) el SW está deshabilitado: el push solo se prueba con este flujo.
