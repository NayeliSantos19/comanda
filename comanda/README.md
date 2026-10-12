# Comanda

Sistema de pedidos por QR para restaurantes: el cliente escanea el código de su mesa, pide desde el celular y la cocina recibe el pedido al instante. El cliente ve en vivo cuando lo están preparando, puede llamar al mesero o pedir la cuenta con un toque, y el personal cobra y libera la mesa.

Proyecto de portafolio · React + Vite + Tailwind + Supabase (Postgres, Auth y Realtime).

## Qué hace

| Pantalla | Ruta | Para quién |
|---|---|---|
| **Mesa** | `/mesa/:codigo` | Clientes (desde el QR): menú por categorías, carrito con notas por plato, seguimiento del pedido, total de la mesa, llamar al mesero, pedir la cuenta |
| **Cocina** | `/cocina` 🔒 | Cocina: pedidos en columnas (Nuevos → En preparación → Listos), alerta sonora y reloj de espera por colores |
| **Mesas** | `/mesas` 🔒 | Meseros/caja: cuentas abiertas, llamados, cobrar y liberar mesa, QR de cada mesa para imprimir |
| **Menú** | `/menu` 🔒 | Encargado: platos, precios, categorías y botón de "agotado" |

### Decisiones técnicas que vale la pena contar

- **El cliente no puede inventar precios:** el navegador solo manda `plato_id` y cantidad; `crear_pedido()` toma el precio de la base de datos, valida que el plato siga disponible y calcula el total.
- **QR con código aleatorio:** la URL es `/mesa/a8f3k2…`, no `/mesa/3`, así nadie pide a otra mesa cambiando un número. Si una foto del QR circula, se genera un código nuevo y el anterior deja de servir.
- **RLS estricto:** el menú es público, pero los clientes no pueden leer ni escribir las tablas `mesas` y `pedidos`; todo pasa por funciones `security definer` que reciben el código de la mesa. Solo el personal autenticado ve todos los pedidos.
- **Copia del precio en cada pedido:** `pedido_items` guarda nombre y precio del momento, así cambiar el menú no altera cuentas ya abiertas.
- **Números sin duplicados:** `#001, #002…` se calculan en Postgres con un candado por día.
- **Tiempo real donde importa:** la cocina y las mesas usan Supabase Realtime (con respaldo cada 30 s). El cliente, que no tiene sesión, consulta cada 4 s.
- **Freno contra spam:** máximo 5 pedidos de una mesa esperando a cocina y 20 unidades por plato.
- **Fotos de platos con Supabase Storage:** el personal sube la foto desde `/menu`; la app la reduce en el navegador (máx. 900 px, JPG) antes de subirla, y solo usuarios autenticados pueden escribir en la carpeta.
- **Sonido sin archivos:** los timbres se generan con Web Audio; el celular del cliente vibra cuando su pedido está listo.

## Cómo correrlo localmente

1. Instala las dependencias:
   ```
   npm install
   ```
2. Crea un proyecto en [Supabase](https://supabase.com) y en **SQL Editor** corre `supabase-schema.sql` (crea tablas, seguridad, funciones, un menú salvadoreño de ejemplo y 7 mesas).
   Después corre también `supabase-fotos.sql` (agrega las fotos de los platos y la carpeta de Storage para subir las tuyas desde `/menu`).
3. Copia `.env.example` a `.env` y llena tus claves de Supabase (Settings → API).
4. Crea una cuenta para el personal en **Authentication → Users → Add user**.
5. Arranca:
   ```
   npm run dev
   ```
6. Abre `http://localhost:5173/mesa/demo` en una pestaña (cliente) y `/cocina` en otra (personal).

## Modo demo

- La **Mesa 1** tiene el código fijo `demo` (protegido por un trigger para que nadie lo cambie), así la portada siempre puede abrirla.
- Si defines `VITE_DEMO_EMAIL` y `VITE_DEMO_PASSWORD` (y creas esa cuenta en Supabase), la portada muestra **"Probar como cocina"**.

## Deploy en Vercel

Importa el repo, agrega las variables de `.env` en *Settings → Environment Variables* y listo. `vercel.json` ya redirige todas las rutas a `index.html`.
