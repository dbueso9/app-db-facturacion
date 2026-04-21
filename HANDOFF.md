# HANDOFF — DB Consulting Facturación

## Estado actual
App de facturación en producción con autenticación completa, base de datos propia y deploy verificado.

**Producción:** https://db-consulting-facturas.vercel.app  
**Repositorio:** https://github.com/dbueso9/app-db-facturacion

---

## Stack
- **Framework:** Next.js 16.2 (App Router, Turbopack)
- **UI:** shadcn/ui con **Base UI** (no Radix UI) + Tailwind CSS v4
- **Auth:** Supabase Auth + `@supabase/ssr` (sesiones en cookies)
- **Persistencia:** Supabase Postgres (proyecto `omiodzulmcytponkhras` — exclusivo de esta app)
- **Deploy:** Vercel (equipo `dbueso9s-projects`, projectId `prj_Zvyznizyv7wKhJvkrCLbdYVfziMj`) — auto-deploy en cada push a `main`
- **Forms:** React Hook Form + Zod
- **PDF:** html2canvas + jsPDF (cliente) | jsPDF texto (servidor)
- **Email:** Resend (`resend` npm)
- **Excel:** xlsx (para parsear tasa de cambio BCH)
- **Modo:** Dark mode fijo (clase `dark` en `<html>`)

> **IMPORTANTE — Base UI:**
> - `Button` NO tiene prop `asChild` — usar `render={<Link href="..." />}`
> - `Select.onValueChange` recibe `(value: string | null) => void`

> **IMPORTANTE — Next.js 16:**
> - El archivo de proxy/middleware se llama `src/proxy.ts` (no `middleware.ts`)
> - La función exportada debe llamarse `proxy`, no `middleware`

---

## Usuarios de acceso

| Usuario | Contraseña | Rol | Email interno |
|---------|-----------|-----|---------------|
| `admin` | `admin123` | Administrador | admin@dbconsulting.hn |
| `asistente` | `asis123` | Asistente | asistente@dbconsulting.hn |

El login mapea el nombre de usuario al email internamente en `src/app/login/actions.ts`.  
Los usuarios viven en Supabase Auth del proyecto `omiodzulmcytponkhras`.

---

## Estructura de archivos clave

```
src/
├── proxy.ts                    # Protección de rutas — redirige a /login si no hay sesión
├── lib/
│   ├── supabase.ts             # createServerClient(), createAuthClient(), getCurrentUser()
│   ├── email/
│   │   └── factura-html.ts     # ★ NUEVO: Template HTML para correos de facturas
│   ├── actions/
│   │   ├── clientes.ts         # getClientes, getCliente, saveCliente (con código DBC-XXX)
│   │   ├── contratos.ts        # ★ NUEVO: getContratos, saveContrato, toggleActivo,
│   │   │                       #   calcularMontoContrato, descripcionFacturaContrato
│   │   ├── email.ts            # ★ NUEVO: enviarFactura, enviarFacturasAgrupadas (Resend)
│   │   ├── facturas.ts         # getFacturas, getFactura, saveFactura (ampliado),
│   │   │                       #   updateEstadoFactura, deleteFactura, crearNumeroFactura
│   │   ├── servicios.ts        # getServicios, saveServicio, deleteServicio
│   │   └── tasa-cambio.ts      # ★ NUEVO: getTasaCambio() — BCH Excel, cache 1h
│   ├── empresa.ts              # Datos fiscales fijos (CAI, RTN, rangos, ISV)
│   ├── types.ts                # Tipos (ampliados: MetodoPago, Contrato, TipoContrato)
│   └── utils.ts                # formatLempiras, formatFecha, generarId
├── components/
│   └── navbar.tsx              # Sticky nav con logo, usuario activo, badge de rol, logout
└── app/
    ├── layout.tsx
    ├── login/
    │   ├── page.tsx
    │   └── actions.ts
    ├── page.tsx / dashboard-client.tsx
    ├── facturas/
    │   ├── page.tsx
    │   ├── facturas-client.tsx         # ★ Muestra nombreProyecto bajo el cliente
    │   ├── nueva/
    │   │   ├── page.tsx                # ★ Carga tasa de cambio BCH
    │   │   └── nueva-client.tsx        # ★ Campos: nombreProyecto, metodoPago, vigencia 28d
    │   └── [id]/
    │       ├── page.tsx
    │       ├── factura-detalle-client.tsx  # ★ Layout SAR, modal Enviar Correo, PDF mejorado
    │       └── editar/
    │           ├── page.tsx
    │           └── editar-client.tsx   # ★ Columnas de líneas corregidas
    ├── clientes/
    │   ├── page.tsx
    │   ├── clientes-client.tsx         # ★ Columna código, link a detalle
    │   └── [id]/                       # ★ NUEVO
    │       ├── page.tsx                # Carga cliente + contratos + facturas + tasa
    │       └── cliente-detalle-client.tsx  # Resumen, contratos, historial, envío masivo
    └── servicios/
        ├── page.tsx
        └── servicios-client.tsx
scripts/
├── setup-users.mjs
├── nuevo-proyecto-supabase.sql
└── ...
migrations/                         # ★ NUEVO (archivos .sql en raíz del proyecto)
├── migration_metodo_pago.sql       # ADD COLUMN metodo_pago
├── migration_tasa_cambio.sql       # ADD COLUMN tasa_cambio
└── migration_fase3.sql             # ADD COLUMN codigo (clientes), nombre_proyecto (facturas),
                                    # CREATE TABLE dbc_contratos
```

---

## Base de datos (Supabase `omiodzulmcytponkhras`)

| Tabla | Descripción | Nuevas columnas |
|---|---|---|
| `dbc_clientes` | Clientes con RTN, dirección, correo, teléfono | `codigo TEXT UNIQUE` (DBC-001) |
| `dbc_servicios` | Catálogo de servicios | — |
| `dbc_facturas` | Facturas con `cliente_data` JSONB | `metodo_pago`, `tasa_cambio`, `nombre_proyecto` |
| `dbc_lineas_factura` | Líneas con FK CASCADE DELETE | — |
| `dbc_contratos` | ★ NUEVA: contratos de servicio por cliente | cliente_id, tipo, valor_base, fecha_inicio, etc. |

### Migraciones pendientes de ejecutar (si no se han ejecutado)
Ejecutar en orden en Supabase SQL Editor:
1. `migration_metodo_pago.sql`
2. `migration_tasa_cambio.sql`
3. `migration_fase3.sql` ← la más importante, incluye `dbc_contratos`

RLS habilitada — solo usuarios autenticados tienen acceso.

---

## Variables de entorno

`.env.local` y en Vercel (producción):

```
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXX   # ★ NUEVA — obtener en resend.com
NEXT_PUBLIC_APP_URL=https://db-consulting-facturas.vercel.app

NEXT_PUBLIC_SUPABASE_URL=https://omiodzulmcytponkhras.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Resend — configuración pendiente:**
1. Crear cuenta en resend.com → obtener API Key
2. Agregar dominio `dbconsulting.hn` y añadir registros DNS
3. Mientras no esté verificado, cambiar `from` en `src/lib/actions/email.ts` a `onboarding@resend.dev`

---

## Datos fiscales (empresa.ts)

| Campo | Valor |
|---|---|
| Empresa | DB Consulting |
| RTN | 04011980003740 |
| CAI | 3E9D56-B1EC3B-C89DE0-63BE03-0909C5-42 |
| Rango desde | N.000-001-04-00000101 |
| Rango hasta | N.000-001-04-00000150 |
| Límite emisión | 12/09/2026 |
| ISV | 15% (automático) |
| Dirección | Res. San Roberto de Sula, San Pedro Sula, Honduras C.A. |
| Correo | dbconsulting.hn@gmail.com |
| Teléfono | 504 99787849 |

---

## Funcionalidades implementadas

### ✅ Base (pre-existente)
- Autenticación completa (login/logout, sesiones en cookies, proxy de rutas)
- Perfiles: admin y asistente
- Dashboard con métricas (total facturado, cobrado, pendientes, CAI disponible)
- Lista de facturas con búsqueda, filtro por estado/fecha y paginación (10/página)
- Crear/editar/eliminar facturas con líneas libres y catálogo de servicios
- ISV 15% calculado automáticamente
- Vista de factura imprimible + exportar PDF (html2canvas + jsPDF)
- Cambiar estado: Borrador / Emitida / Pagada / Anulada
- CRUD completo de clientes y catálogo de servicios

### ✅ Fase 1 — Correcciones y SAR (2026-04-21)
- **Fix error "Invalid input: expected string, received undefined en cliente"** — `clienteId: ""` en defaultValues del formulario
- **Columnas alineadas** en la tabla de líneas del formulario (header y body ahora coinciden: 5+2+3+2)
- **Cliente y RTN "parados"** — sección del cliente rediseñada con grid 2 columnas: etiqueta arriba (uppercase tracking-wide), valor abajo en negrita
- **Requisitos fiscales SAR Honduras completos** en el documento:
  - RTN del emisor y del cliente prominentes y separados
  - Aviso "La factura sin RTN del adquiriente no genera crédito fiscal" (siempre visible en footer; también inline si el cliente no tiene RTN)
  - CAI, rango y fecha límite en layout de 2 columnas
  - Tabla con `table-fixed` + colgroup para alineación perfecta
  - Totales con recuadro negro para "Total a Pagar"
- **Branding:** "Sistema de Facturación desarrollado por DB Consulting © 2025" en el pie
- **Vigencia 28 días** (cambiado de 30 → 28)

### ✅ Fase 2 — Tasa de Cambio BCH (2026-04-21)
- `getTasaCambio()` en `src/lib/actions/tasa-cambio.ts`: fetch del Excel BCH, parseo con `xlsx`, cache 1 hora
- URL: `https://www.bch.hn/estadisticos/GIE/LIBTipo de cambio/Precio Promedio Diario del Dólar.xlsx`
- Banner azul en formulario "Nueva Factura" con Compra y Venta del día
- Tasa `venta` guardada en la factura al momento de emisión (`tasa_cambio` en BD)
- Mostrada en el documento de factura como referencia histórica

### ✅ Fase 3 — Código de Cliente, Proyectos, Contratos (2026-04-21)
- **Código de cliente:** campo `codigo` (`DBC-001`, `DBC-002`…) — auto-generado si se deja vacío; badge en lista; la migración genera códigos para clientes existentes
- **Página de detalle del cliente** `/clientes/[id]`:
  - Resumen financiero: total facturado, nº facturas, contratos activos
  - Gestión de **servicios contratados** con 4 tipos:
    - **Mantenimiento/Soporte:** 17% del valor base anual; primer año proporcional al mes de inicio
    - **Hosting:** valor mensual fijo
    - **Proyecto/App:** valor mensual fijo
    - **Otro:** libre
  - Botón **"Facturar"** por contrato — genera factura automáticamente con descripción, monto calculado, vigencia 28d y tasa de cambio
  - Toggle activo/inactivo por contrato
  - Historial completo de facturas del cliente
- **Nombre de Proyecto en Factura:**
  - Campo `nombreProyecto` (opcional) en formulario de nueva factura
  - Visible en lista de facturas (subtítulo bajo cliente)
  - En encabezado del documento de factura
  - **Nombre del PDF:** `{NombreProyecto} - {Cliente} - {Fecha}.pdf`
- **Métodos de Pago:** campo `metodoPago` (transferencia / cheque / efectivo) en formulario y documento

### ✅ Fase 4 — Envío de Facturas por Correo (2026-04-21)
- **Resend** como proveedor de email (`src/lib/actions/email.ts`)
- Template HTML completo en `src/lib/email/factura-html.ts`: diseño profesional con header negro, datos SAR, tabla de servicios, totales, aviso RTN, CAI, tasa de cambio
- **Envío individual** desde `/facturas/[id]`:
  - Botón "Enviar Correo" en barra de controles
  - Modal con: Para (pre-llenado con correo del cliente), Asunto (pre-llenado), Mensaje opcional
  - Feedback visual de éxito/error inline
- **Envío masivo agrupado** desde `/clientes/[id]`:
  - Checkbox por factura en el historial
  - Botón "Enviar por Correo" agrupa todas las facturas seleccionadas en un solo correo
  - Modal con selección interactiva de facturas, destinatario y mensaje
  - Las facturas viajan como secciones separadas dentro del mismo correo HTML

---

## Pendiente de implementar (próximas fases)

### ✅ Fase 5 — Reportería y Dashboard por Servicio (2026-04-21)
- **Recharts** instalado como librería de gráficas
- **Dashboard mejorado:**
  - Gráfica de barras: ingresos facturado vs cobrado últimos 6 meses
  - Cards: contratos activos por tipo de servicio con colores
  - Top 5 clientes con barra de progreso cobrado/total
  - Botón "Reportes" en header del dashboard
- **Nueva página `/reportes`:**
  - Selector de año (todos los años con facturas)
  - Resumen del año: total facturado, cobrado, por cobrar
  - Gráfica mensual interactiva — clic en barra filtra facturas de ese mes
  - Tabla de facturas del mes seleccionado
  - Reporte por cliente: facturas, facturado, cobrado, pendiente, % con barra
  - Tabla de detalle mensual — clic en fila filtra facturas
- **Navbar:** link "Reportes" agregado

### ✅ Fase 6 — Cotizaciones (2026-04-21)
- Nueva tabla `dbc_cotizaciones` + `dbc_lineas_cotizacion` (`migration_fase6.sql`)
- CRUD completo: lista, crear, ver detalle, editar (solo borrador), eliminar
- Numeración automática `COT-001`, `COT-002`...
- Estados: borrador → enviada → aceptada / rechazada
- **Convertir en Factura** — un clic genera factura emitida con todos los datos; cotización queda marcada como aceptada con link a la factura
- Edición bloqueada si la cotización ya fue convertida
- Métrica de monto aceptado en la lista
- Link "Cotizaciones" agregado al navbar

### Fase 7 — Funcionalidades avanzadas
- [ ] Sincronización offline/online (Service Workers + IndexedDB)
- [ ] Nuevos CAI — UI para actualizar rango cuando se agote
- [ ] Control de acceso por rol (asistente no puede eliminar ni anular)
- [ ] Sistemas adicionales (agenda, CRM, contable) — proyectos separados

### Configuraciones pendientes (manuales)
- [ ] Ejecutar `migration_fase3.sql` en Supabase SQL Editor (si no se ha hecho)
- [ ] Configurar `RESEND_API_KEY` en `.env.local` y en Vercel env vars
- [ ] Agregar dominio `dbconsulting.hn` en Resend y actualizar DNS
- [ ] Actualizar `NEXT_PUBLIC_APP_URL` en Vercel con la URL de producción
- [ ] Limpiar tablas `dbc_*` de mugdpos (ver pendiente original abajo)

---

## Pendiente original
- [ ] **Limpiar tablas `dbc_*` de mugdpos** — ejecutar en SQL Editor de `bekolkmrxxbygbqauotb`:
  ```sql
  DROP TABLE IF EXISTS dbc_lineas_factura;
  DROP TABLE IF EXISTS dbc_facturas;
  DROP TABLE IF EXISTS dbc_clientes;
  DROP TABLE IF EXISTS dbc_servicios;
  ```

---

## Cómo retomar desarrollo

```bash
cd "espacio-de-trabajo-claude - App Fact DB/db-consulting-facturas"
npm run dev
# → http://localhost:3000
# Login: admin / admin123
```

## Cómo hacer deploy

```bash
git push  # Vercel despliega automáticamente desde main
```

---

## QA realizado

| Área | Sesión | Estado |
|---|---|---|
| Build de producción (`npm run build`) | 2026-04-20 | ✅ |
| TypeScript sin errores | 2026-04-21 | ✅ |
| Fix error clienteId undefined | 2026-04-21 | ✅ |
| Alineación tabla líneas formulario | 2026-04-21 | ✅ |
| Layout SAR factura Honduras | 2026-04-21 | ✅ |
| Tasa de cambio BCH (fetch + parse Excel) | 2026-04-21 | ✅ |
| Contratos + cálculo mantenimiento 17% | 2026-04-21 | ✅ |
| Envío de correo Resend (from: onboarding@resend.dev) | 2026-04-21 | ✅ |
| Migraciones SQL Supabase | 2026-04-21 | ✅ |
| Variables de entorno Vercel (RESEND_API_KEY, NEXT_PUBLIC_APP_URL) | 2026-04-21 | ✅ |
| Reportería Fase 5 (dashboard + /reportes) | 2026-04-21 | ✅ |
