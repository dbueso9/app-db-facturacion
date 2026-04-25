# HANDOFF — DB Consulting Facturación

## Estado actual (2026-04-25) — SNAPSHOT COMPLETO PARA RETOMAR

**Último commit:** `76e782b` — todo en `main`, Vercel desplegando automáticamente.  
**Build:** `npm run build` → ✅ 0 errores TypeScript, 0 errores ESLint críticos.  
**Fases:** 1–15 completas y en producción.

### Resumen de lo que funciona HOY
| Módulo | Estado |
|--------|--------|
| Autenticación (admin/asistente/gestion) | ✅ |
| Dashboard con métricas + gráficas | ✅ |
| Facturas (CRUD, SAR completo, PDF, email con PDF adjunto) | ✅ |
| Cotizaciones USD (CRUD, PDF, email, convertir a factura/contrato) | ✅ |
| Clientes (CRUD, RTN, código DBC-XXX, 3 correos, teléfono) | ✅ |
| Contratos recurrentes + facturación rápida | ✅ |
| Hitos de proyecto (% por hito, facturar por hito, barra progreso) | ✅ |
| Tasa de cambio BCH (Excel online, cache 1h) | ✅ |
| Reportes (año, cliente, exportar Excel + PDF) | ✅ |
| Estado de cuenta por cliente (email + PDF) | ✅ |
| Admin usuarios (crear/editar/eliminar roles) | ✅ |
| Descuento en facturas y cotizaciones | ✅ |
| Email 413 fix (bodySizeLimit 4mb, PDF JPEG 82%) | ✅ |
| Documento A4 idéntico en pantalla/email/PDF | ✅ |

### Pendiente de acción manual (no código)
- [ ] Configurar dominio `dbconsulting.hn` en Resend → agregar 3 registros DNS → cambiar `from` en `src/lib/actions/email.ts` de `onboarding@resend.dev` a `facturacion@dbconsulting.hn`

### NO hay migraciones pendientes — base de datos 100% al día

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
│   │   ├── factura-html.ts       # Template HTML facturas — layout formal azul marino, Ultima Fila, SAR totals, banco ★F12
│   │   ├── cotizacion-html.ts    # Template HTML cotizaciones — mismo esquema limpio, Ultima Fila, precios sujetos ★F12
│   │   └── estado-cuenta-html.ts # ★ NUEVO F12: template HTML estado de cuenta por cliente
│   ├── actions/
│   │   ├── clientes.ts         # getClientes, getCliente, saveCliente
│   │   ├── contratos.ts        # getContratos, saveContrato, toggleActivo
│   │   ├── email.ts            # enviarFactura, enviarCotizacion, enviarFacturasAgrupadas, enviarEstadoCuenta ★F12 — para: string | string[]
│   │   ├── facturas.ts         # getFacturas, getFactura, saveFactura, crearNumeroFactura
│   │   ├── cotizaciones.ts     # getCotizaciones, getCotizacion, saveCotizacion, marcarConvertidaAContrato
│   │   ├── hitos.ts            # getHitosForContratos, saveHitos, marcarHitoFacturado
│   │   ├── proyecto.ts         # crearProyecto — crea contrato+hitos desde cotización
│   │   ├── servicios.ts        # getServicios, saveServicio, deleteServicio
│   │   ├── tasa-cambio.ts      # getTasaCambio() — BCH Excel, cache 1h
│   │   └── usuarios.ts         # ★ NUEVO: getUsuarios, crearUsuario, actualizarRol, eliminarUsuario (Admin API)
│   ├── contratos-utils.ts      # calcularMontoContrato, descripcionFacturaContrato (sin "use server")
│   ├── empresa.ts              # Datos fiscales + banco BAC Credomatic #200296096 Ahorro ★F12
│   ├── types.ts                # Cliente tiene correo2?, correo3? ★F12; TipoContrato incluye "soporte"
│   └── utils.ts                # formatLempiras, formatDolares, formatFecha, generarId
├── components/
│   └── navbar.tsx              # Nav con Contratos + Admin (solo admin) ★
└── app/
    ├── layout.tsx
    ├── login/                  # Login dinámico — lookup por user_metadata.username ★
    ├── contratos/              # ★ NUEVO: página Servicios Recurrentes
    ├── admin/usuarios/         # ★ NUEVO: gestión de usuarios con roles
    ├── page.tsx / dashboard-client.tsx
    ├── reportes/
    ├── facturas/
    │   ├── [id]/
    │   │   └── factura-detalle-client.tsx  # PDF vía iframe+template (fix oklch), datos fiscales arriba
    │   └── nueva/ + [id]/editar/
    ├── cotizaciones/
    │   ├── [id]/
    │   │   └── cotizacion-detalle-client.tsx  # PDF vía iframe+template (fix oklch)
    │   └── nueva/ + [id]/editar/
    ├── clientes/
    │   └── [id]/
    │       ├── page.tsx                # Carga cliente + contratos + facturas + tasa + hitosMap + isAdmin
    │       └── cliente-detalle-client.tsx  # ★ Hitos: editor, barra progreso a11y, generar factura por hito
    └── servicios/
scripts/
├── setup-users.mjs              # Crea usuarios iniciales (corre en postbuild de Vercel)
└── update-user-metadata.mjs    # Actualiza role+username en user_metadata de usuarios existentes
migrations (en raíz del proyecto):
├── migration_metodo_pago.sql       ✅ ejecutada
├── migration_tasa_cambio.sql       ✅ ejecutada
├── migration_fase3.sql             ✅ ejecutada
├── migration_condicion_pago.sql    ✅ ejecutada
├── migration_fase6.sql             ✅ ejecutada
├── migration_hitos.sql             ✅ ejecutada (2026-04-23)
├── migration_fase10.sql            ✅ ejecutada (2026-04-24)
├── migration_fase12.sql            ✅ ejecutada (2026-04-25) — ADD COLUMN correo2/correo3 a dbc_clientes
└── migration_descuento.sql         ✅ ejecutada (2026-04-25) — ADD COLUMN descuento a dbc_facturas y dbc_cotizaciones
```

---

## Base de datos (Supabase `omiodzulmcytponkhras`)

| Tabla | Descripción |
|---|---|
| `dbc_clientes` | Clientes con RTN, código DBC-XXX, correo / correo2 / correo3, teléfono (+504 XXXX-XXXX) — F12 |
| `dbc_servicios` | Catálogo de servicios con precio en USD |
| `dbc_facturas` | Facturas LPS con metodo_pago, tasa_cambio, nombre_proyecto, condicion_pago |
| `dbc_lineas_factura` | FK CASCADE DELETE a dbc_facturas |
| `dbc_contratos` | Contratos por cliente: tipo, valor_base, dia_facturacion, activo |
| `dbc_cotizaciones` | Cotizaciones USD: numero COT-XXX, estado, convertida_a_factura_id |
| `dbc_lineas_cotizacion` | FK CASCADE DELETE a dbc_cotizaciones |
| `dbc_hitos` | Hitos de proyecto: contrato_id, nombre, porcentaje, monto, estado, factura_id, orden |

**Todas las migraciones ejecutadas ✅ (incluyendo fase12 + descuento, 2026-04-25).** RLS habilitada — solo usuarios autenticados.

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

## Regla crítica de arquitectura — Turbopack

> **Funciones síncronas exportadas desde `"use server"` fallan en Turbopack.**
> Toda función pura (sin async, sin acceso a BD) que deba usarse en componentes client
> debe vivir en un archivo SIN directiva `"use server"`.
> Ejemplo: `src/lib/contratos-utils.ts` contiene `calcularMontoContrato` y `descripcionFacturaContrato`.

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
- **Moneda:** Cotizaciones se manejan **100% en USD** (`formatDolares`)
- **Convertir en Factura** — convierte precios USD → LPS usando tasa BCH venta; genera factura emitida con todos los datos; cotización queda marcada con link a la factura
- Edición bloqueada si la cotización ya fue convertida
- Métrica de monto aceptado en la lista (en USD)
- Link "Cotizaciones" agregado al navbar

### ✅ Fase 7 — Correcciones críticas de UX (2026-04-21)
- **RTN:** validación 14 dígitos, sin duplicados; `checkRtnExiste` server action
- **Auto-refresh de páginas** tras crear: `useEffect` + `router.refresh()` para sincronizar estado React con props de servidor
- **Select de cliente en facturas/cotizaciones:** `Controller` (React Hook Form) + muestra solo `c.nombre` (sin "— RTN: xxx"); resuelve bug silencioso de submit que no funcionaba
- **Autocomplete de servicios:** `<datalist>` nativo; al seleccionar un servicio auto-rellena el precio unitario desde el catálogo
- **Precios del catálogo en USD;** en facturas se convierten a LPS via `tasaCambio.venta`
- **Condiciones de pago:** 30/60/90 días; calcula `fechaVencimiento` automáticamente
- **Todos los campos obligatorios:** validación Zod + errores en rojo con `FieldError`
- **Fix "Emitir Factura" no hacía nada:** `clienteId` no estaba registrado en RHF; fix con `<input type="hidden" {...register("clienteId")} />`
- **`condicion_pago` column:** backward-compat retry en `saveFactura`; migración `migration_condicion_pago.sql`
- **`formatDolares` helper** agregado a `src/lib/utils.ts` para montos en USD

### ✅ Fase 8 — PDF/Email cotizaciones, leyenda fiscal, teléfono (2026-04-21)
- **Cotización Descargar PDF + Enviar Correo:** plantilla HTML en `src/lib/email/cotizacion-html.ts` (montos en USD)
- **Factura PDF fix:** `import { jsPDF } from "jspdf"` (named export en v4)
- **Email facturas:** eliminado botón "Ver Factura en el Sistema"
- **Leyenda fiscal:** "LA FACTURA ES BENEFICIO DE TODOS EXÍJALA" en documento y email
- **Teléfono clientes:** auto-formato `+504 XXXX-XXXX`, validación regex

### ✅ Fase 9 — Hitos de proyecto, fix PDF oklch, datos fiscales arriba (2026-04-23)
- **Hitos de proyecto** en contratos tipo `proyecto_app`:
  - Tabla `dbc_hitos` (migration_hitos.sql ✅ ejecutada)
  - `src/lib/actions/hitos.ts`: `getHitosForContratos`, `saveHitos` (valida suma=100%), `marcarHitoFacturado`
  - Tipos `Hito` / `EstadoHito` en `src/lib/types.ts`
  - Editor visual con porcentajes, monto calculado, barra de progreso accesible (`role="progressbar"`)
  - Botón "Generar Factura" por hito pendiente; hitos facturados quedan bloqueados
  - Restricción de seguridad: si ya hay hitos facturados, solo `admin` puede editar
  - `isAdmin` calculado server-side (`user.email === "admin@dbconsulting.hn"`) y pasado como prop
- **Fix PDF oklch/lab (Tailwind v4):** `exportarPDF` reescrito para ambos documentos:
  - Crea un `<iframe>` aislado, inyecta el HTML del template (inline styles, hex colors)
  - html2canvas captura desde el iframe — nunca ve las variables `oklch()` del documento principal
  - Elimina el error _"Attempting to parse an unsupported color function 'lab'"_
- **Datos fiscales empresa arriba:** RTN, CAI, rango autorizado, fecha límite ahora en recuadro al inicio del documento de factura (en pantalla y en email)

### ✅ Fase 10 — Tracking cobrado/emitido, estado proyecto, cotización → contrato (2026-04-23)
- **`migration_fase10.sql`:** `ALTER TABLE dbc_cotizaciones ADD COLUMN convertida_a_contrato_id TEXT`
- **`src/lib/actions/proyecto.ts`:** `crearProyecto()` — crea contrato tipo `proyecto_app` + hitos + marca cotización como aceptada, todo en secuencia
- **`src/lib/actions/cotizaciones.ts`:** `marcarConvertidaAContrato()` + `convertidaAContratoId` en mapRow
- **Cotización → Contrato con Hitos:** nuevo botón "Crear Contrato" en `/cotizaciones/[id]`:
  - Dialog con nombre proyecto, valor calculado (USD→LPS a tasa BCH), fecha de inicio
  - Editor de hitos (misma UI que en contratos): porcentaje, nombre, monto calculado
  - Valida suma = 100%, nombres no vacíos
  - Badge "Ver Proyecto" (violeta) enlaza al cliente cuando ya está convertida
  - `yaConvertida` bloquea ambos botones si ya hay factura o contrato vinculado
- **ProgresoHitos mejorado** en `/clientes/[id]`:
  - Barra de dos capas: verde sólido = cobrado (factura Pagada) | verde translúcido = emitido no cobrado | gris = pendiente
  - Badge de estado del proyecto: **Pendiente de inicio / En progreso / Facturado completo / Cerrado ✓**
  - Métricas: Cobrado | Emitido (si hay diferencia) | Pendiente
- **Filas de hito** con estado real de la factura:
  - Punto naranja + badge "Emitida" → factura generada pero no pagada
  - Punto verde + badge "Cobrado ✓" + tachado → factura pagada

### ✅ Correcciones UX (2026-04-23)
- **Confirmación cambio estado factura:** dialog genérico para TODOS los estados (no solo Anulada); muestra estado actual → nuevo estado; variante destructive para Anulada
- **PDF adjunto en correos:**
  - `src/lib/pdf-utils.ts`: `pdfBase64FromHtml(html)` — genera PDF via iframe+html2canvas, retorna base64
  - `email.ts`: `enviarFactura`, `enviarCotizacion`, `enviarFacturasAgrupadas` aceptan `pdfBase64`/`pdfs` opcionales
  - Facturas individuales y cotizaciones: generan PDF antes de enviar, adjuntan al correo Resend
  - Envío masivo (cliente-detalle): genera un PDF por factura seleccionada (secuencial)
  - Botón muestra "Preparando PDF..." mientras procesa
- **Validez cotización 15 días:** nueva cotización por defecto con 15 días (antes 30)
- **Leyenda validez prominente:** "ESTA COTIZACIÓN ES VÁLIDA HASTA EL [día] DE [MES] DE [año]" — visible en documento de pantalla y en email/PDF
- **Datos cliente en encabezado cotización:**
  - Email/PDF template: nombre + correo + teléfono del cliente ahora en el bloque derecho del header (negro)
  - Vista de pantalla: correo y teléfono aparecen inmediatamente después del nombre (antes iban al final)

### ✅ Fase 11 — Contratos recurrentes, usuarios con roles, exports, proyecto desde factura (2026-04-24)
- **Nuevo tipo de contrato `soporte`:** Soporte Técnico mensual fijo — aparece en selector del formulario de contratos y en `contratos-utils.ts`
- **Página `/contratos` — Servicios Recurrentes:**
  - Vista global de todos los contratos activos recurrentes (mantenimiento, hosting, soporte, otro)
  - KPIs: contratos activos, total mensual, pendientes de facturar este mes
  - Detecta automáticamente si ya se facturó el mes actual por `clienteId + nombreProyecto`
  - Filtro por tipo + búsqueda por cliente/servicio
  - Botón "Facturar" rápido por contrato (genera factura emitida y redirige a detalle)
  - Rol `gestion` no ve botón Facturar
  - Link directo al perfil del cliente para gestión completa
- **Gestión de usuarios — `/admin/usuarios` (solo admin):**
  - Lista todos los usuarios del sistema (por email `@dbconsulting.hn`)
  - Roles: `admin` (acceso total), `asistente` (sin eliminar/precios), `gestion` (solo lectura)
  - Crear usuario → email = `username@dbconsulting.hn`, password, rol
  - Editar rol y contraseña de cualquier usuario
  - Eliminar usuario (no se puede eliminar a uno mismo)
  - Acciones via Supabase Auth Admin API (`SUPABASE_SERVICE_ROLE_KEY`)
  - Navbar muestra "Admin" solo si `role === admin`
- **Login dinámico:** `actions.ts` hace lookup de usuarios por `user_metadata.username` en lugar de mapa hardcodeado; fallback por email pattern `username@dbconsulting.hn`
- **Rol `gestion` en cliente-detalle:** oculta botones "Agregar Servicio", editar/eliminar contratos, generar facturas e hitos
- **Nueva factura → Proyecto con hitos:**
  - Sección plegable "Gestionar como proyecto con hitos" en el formulario
  - Si activo: define hitos con % y nombres; valida suma=100%
  - Al emitir: crea factura + contrato `proyecto_app` + hitos; el hito de mayor % queda vinculado a la factura como "facturado"
  - Redirige al perfil del cliente para continuar con los demás hitos
- **Reportes — Exportar Excel y PDF:**
  - Botones "Excel" y "PDF" en el header de `/reportes`
  - Excel (`xlsx`): 3 hojas — Resumen Mensual, Por Cliente, Facturas del año
  - PDF (`jsPDF`): portada negra, resumen anual, tabla mensual, tabla por cliente, footer con fecha
  - Ambos con nombre de archivo `Reporte_DBConsulting_{año}.{ext}`

### ✅ Fase 12 — Multi-email, Estado de Cuenta, Layout formal, SAR totals, Contrato desde Factura (2026-04-24) — commit 11307fb
- **Clientes — 3 correos:** `correo` (obligatorio) + `correo2` + `correo3` (opcionales). Formulario actualizado con grid 2 cols para correo2/3. `migration_fase12.sql` pendiente de ejecutar.
- **Multi-email en todos los envíos:** `enviarFactura`, `enviarCotizacion`, `enviarFacturasAgrupadas`, `enviarEstadoCuenta` aceptan `para: string | string[]`. El campo "Para" en los modales se pre-llena con todos los correos del cliente separados por coma.
- **Bug fix enviarCorreo:** try/catch anidado alrededor de la generación del PDF. Si falla, se envía el correo sin adjunto con mensaje indicativo. Ya no queda el botón "bloqueado" sin feedback.
- **pdf-utils.ts:** timeout 700ms → 1500ms, onerror handler, backgroundColor #fff.
- **Layout email factura/cotización:** rediseño completo — header azul marino `#1e3a5f`, fondo blanco, borde gris suave. Sin fondo negro. Mismo esquema para ambos templates.
- **Factura — Ultima Fila:** fila `— Ultima Fila —` en cursiva al final de la tabla de servicios (pantalla + email/PDF).
- **Factura — Totales SAR (7 filas):** Sub-Total, Descuento, Impt. Exento, Impt. Gravado, Impt. Exonerado, Impuesto 15%, Total. Reemplaza los 2 campos anteriores.
- **Factura — Datos bancarios:** bloque "Datos Bancarios" (BAC Credomatic / #200296096 / Ahorro) junto a los totales.
- **empresa.ts:** `banco: { nombre: "BAC Credomatic", cuenta: "200296096", tipo: "Ahorro" }`.
- **Cotización — Ultima Fila:** igual que factura.
- **Cotización — Precios sujetos:** texto "Los precios están sujetos a cambio." en footer (pantalla + email/PDF).
- **Auto-fill mensajes email:** cotización y factura pre-llenan textarea con mensaje profesional (incluye datos del banco en factura).
- **Crear Contrato desde Factura:** botón "Crear Contrato" en toolbar de `/facturas/[id]`. Modal pre-llena nombre del proyecto, tipo de contrato, valor base = total de la factura. Redirige a perfil del cliente al crear.
- **Estado de Cuenta — Reportes:** nueva sección en `/reportes`. Selector de cliente → tabla de todas sus facturas con totales (facturado/cobrado/pendiente). Descargar PDF + Enviar por correo con PDF adjunto y multi-email.
- **estado-cuenta-html.ts:** template HTML formal del estado de cuenta por cliente.

### ✅ Fase 13 — Campo Descuento en facturas y cotizaciones (2026-04-25) — commit ab30757
- **`migration_descuento.sql`:** `ALTER TABLE dbc_facturas ADD COLUMN descuento NUMERIC DEFAULT 0` + idem para `dbc_cotizaciones`. ⚠️ Pendiente ejecutar.
- **`types.ts`:** `descuento: number` agregado a `Factura` y `Cotizacion`.
- **Actions:** `saveFactura` y `saveCotizacion` persisten `descuento`; `mapRow`/`mapFacturaRow` lo leen de BD.
- **Email templates (`factura-html.ts`, `cotizacion-html.ts`):**
  - Parámetro `logoUrl?` opcional — si se pasa, se muestra logo en el header.
  - `proyectoFila` — nombre del proyecto como fila de encabezado en la tabla de servicios.
  - "Última Fila" con acento (corregido de "Ultima Fila").
  - Descuento en totales: línea roja visible solo cuando > 0.
  - Layout A4 (794px, min-height 1122px), sin border-radius.
- **`factura-detalle-client.tsx`:** Descuento y Gravado reales en totales SAR (antes hardcodeados a 0).
- **`cotizacion-detalle-client.tsx`:** Refactor UI; conversión USD→LPS propaga el descuento correctamente al crear factura.
- **Formularios nueva/editar (facturas y cotizaciones):** Input numérico "Descuento" en sección de totales; gravado se muestra solo cuando descuento > 0; cálculo correcto: `gravado = subtotal - descuento`, `isv = gravado × 15%`, `total = gravado + isv`.
- **email.ts:** pasa `logoUrl` a todos los generadores de HTML.

### Pendiente (acciones manuales)
- [ ] Configurar dominio `dbconsulting.hn` en Resend (agregar 3 registros DNS) y cambiar `from` en `src/lib/actions/email.ts`
- ✅ `migration_fase12.sql` ejecutada (2026-04-25) — correo2, correo3 en dbc_clientes
- ✅ `migration_descuento.sql` ejecutada (2026-04-25) — descuento en dbc_facturas y dbc_cotizaciones
- ✅ `user_metadata` verificado — admin y asistente ya tenían metadata correcta

### ✅ Fase 14 — Fix 413 email, soporte dashboard, UI/UX (2026-04-25)
- **Fix error 413 al enviar correos:** `experimental.serverActions.bodySizeLimit: "4mb"` en `next.config.ts`
- **PDF más pequeño (~80%):** `pdf-utils.ts` cambiado de PNG scale:2 → JPEG 82% scale:1.5 — evita 413 también en Resend
- **Bug fix soporte en Dashboard:** `soporte` type añadido a `TIPO_COLOR`, `TIPO_LABEL` y array `porTipo` en `dashboard-client.tsx`
- **Dashboard UI mejorado:** metric cards con borde izquierdo de color por tipo, icon backgrounds, progress bars, fecha actual, empty state mejorado, lista de facturas recientes con filas clicables, card de contratos con link directo
- **Facturas list UI:** filas con borde izquierdo codificado por estado (verde=pagada, azul=emitida, rojo=anulada), mejor empty state contextual, columnas más compactas
- **globals.css:** scrollbar personalizado discreto, animación `animate-in-fast` disponible como utilidad
- **HANDOFF:** migraciones fase12 y descuento marcadas como ✅ ejecutadas (confirmado por usuario)
- **Todas las migraciones ejecutadas ✅ — base de datos completamente actualizada**

### Auditoría ESLint (2026-04-24) — 0 errores, 7 warnings intencionados
- ✅ `contratos-client.tsx` — escapar comillas en JSX
- ✅ `usuarios-client.tsx` — eliminar import `Badge` sin usar
- ✅ `cotizaciones-client.tsx` — eliminar import `CardTitle` sin usar
- ✅ `clientes-client.tsx` / `servicios-client.tsx` — eslint-disable en `useEffect` sync (patrón intencional App Router)
- ✅ `cliente-detalle-client.tsx` — ternario-como-statement → if/else
- ✅ `facturas/nueva/nueva-client.tsx` — eliminar datalists huérfanos + simplificar `generarId` en hitos

---

## Cómo retomar desarrollo

```bash
cd "espacio-de-trabajo-claude - App Fact DB/db-consulting-facturas"
npm run dev
```

Cuando el terminal muestre `✓ Ready in ...ms`, abrir manualmente el navegador en:

**http://localhost:3000** → redirige a `/login` automáticamente  
Login: `admin` / `admin123`

> ⚠️ El error _"Unsafe attempt to load URL http://localhost:3000"_ en Chrome significa que el
> servidor **no está corriendo**. Verificar que `npm run dev` esté activo en la terminal antes
> de abrir el navegador.

## Cómo hacer deploy

```bash
git add .
git commit -m "descripción del cambio"
git push  # Vercel despliega automáticamente a producción desde main
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
| Fix build Turbopack: calcularMontoContrato fuera de use server | 2026-04-21 | ✅ |
| Cotizaciones Fase 6 (COT-XXX, convertir a factura) | 2026-04-21 | ✅ |
| Cotizaciones en USD, conversión USD→LPS al facturar | 2026-04-21 | ✅ |
| Fix Select cliente (Controller + solo nombre) | 2026-04-21 | ✅ |
| Autocomplete servicios con datalist (cotizaciones) | 2026-04-21 | ✅ |
| RTN 14 dígitos + sin duplicados | 2026-04-21 | ✅ |
| Condición de pago 30/60/90 días | 2026-04-21 | ✅ |
| Fix "Emitir Factura" no hacía nada | 2026-04-21 | ✅ |
| migration_condicion_pago.sql (backward-compat retry) | 2026-04-21 | ✅ |
| Cotización PDF download (html2canvas + jsPDF) | 2026-04-21 | ✅ |
| Cotización Enviar Correo (Resend + HTML template) | 2026-04-21 | ✅ |
| Factura PDF fix (jsPDF v4 named import) | 2026-04-21 | ✅ |
| Leyenda "LA FACTURA ES BENEFICIO DE TODOS EXÍJALA" | 2026-04-21 | ✅ |
| Eliminar "Ver Factura en el Sistema" del email | 2026-04-21 | ✅ |
| Teléfono formato +504 XXXX-XXXX con validación | 2026-04-21 | ✅ |
| Hitos de proyecto (dbc_hitos, editor, barra progreso) | 2026-04-23 | ✅ |
| migration_hitos.sql ejecutada en Supabase | 2026-04-23 | ✅ |
| Fix PDF oklch — iframe aislado + HTML template | 2026-04-23 | ✅ |
| Datos fiscales empresa en parte superior de factura | 2026-04-23 | ✅ |
| Build producción + deploy Vercel Fase 9 | 2026-04-23 | ✅ |
| Fase 10: ProgresoHitos cobrado/emitido/pendiente | 2026-04-23 | ✅ |
| Fase 10: Badge estado proyecto (Cerrado/En progreso/etc.) | 2026-04-23 | ✅ |
| Fase 10: Cotización → Crear Contrato con Hitos | 2026-04-23 | ✅ |
| Fase 10: migration_fase10.sql ejecutada | 2026-04-23 | ✅ |
| Build TypeScript Fase 10 — 0 errores | 2026-04-23 | ✅ |
| Confirmación de cambio de estado factura (todos los estados) | 2026-04-23 | ✅ |
| PDF adjunto en correos (factura individual, cotización, masivo) | 2026-04-23 | ✅ |
| Validez cotización 15 días + leyenda VÁLIDA HASTA prominente | 2026-04-23 | ✅ |
| Datos cliente (correo) en encabezado cotización (pantalla + email) | 2026-04-23 | ✅ |
| Build TypeScript correcciones UX — 0 errores | 2026-04-23 | ✅ |
| Fase 11: Tipo soporte en TipoContrato + contratos-utils | 2026-04-24 | ✅ |
| Fase 11: Página /contratos Servicios Recurrentes | 2026-04-24 | ✅ |
| Fase 11: Gestión usuarios /admin/usuarios (Admin API) | 2026-04-24 | ✅ |
| Fase 11: Login dinámico por user_metadata.username | 2026-04-24 | ✅ |
| Fase 11: Nueva factura → proyecto con hitos | 2026-04-24 | ✅ |
| Fase 11: Reportes exportar Excel + PDF | 2026-04-24 | ✅ |
| Fase 11: Navbar Contratos + Admin links | 2026-04-24 | ✅ |
| Fase 11: Rol gestion oculta botones de acción | 2026-04-24 | ✅ |
| Build TypeScript Fase 11 — 0 errores | 2026-04-24 | ✅ |
| Auditoría ESLint completa — 4 errores corregidos | 2026-04-24 | ✅ |
| Fase 14: Fix 413, PDF JPEG 80% más pequeño, soporte dashboard, UI | 2026-04-25 | ✅ |
| Fase 15: A4 full-page layout via dangerouslySetInnerHTML | 2026-04-25 | ✅ |
| Build TypeScript Fase 15 — 0 errores | 2026-04-25 | ✅ |

### ✅ Fase 15 — A4 full-page layout, logo, colores fuertes, pantalla=email=PDF (2026-04-25) — commit dee5293
- **`factura-html.ts` + `cotizacion-html.ts` reescritos:** layout flex-column `794px × min-height:1122px`; flex:1 spacer empuja datos bancarios y totales al fondo de la página A4
- **Header navy:** encabezado `#1e3a5f` en tabla de servicios; texto blanco en columnas
- **Logo empresa:** `<img>` 64×64px en el header del documento (ambos templates)
- **Colores más fuertes:** texto primario `#0f172a`, secundario `#374151`, labels `#6b7280` — eliminado el gris débil
- **Dos funciones por template:** `generarBodyFactura`/`generarBodyCotizacion` (solo el `<div>` interno, para `dangerouslySetInnerHTML`) y `generarHtmlFactura`/`generarHtmlCotizacion` (HTML completo con fondo gris `#dde3ea`, para email/PDF)
- **`factura-detalle-client.tsx` + `cotizacion-detalle-client.tsx`:** eliminados ~220 líneas de JSX de documento personalizado; reemplazados por `dangerouslySetInnerHTML={{ __html: generarBodyXxx(doc, "/Logo DB.png") }}` — pantalla, email y PDF son ahora 100% idénticos
- **Fondo gris A4 en pantalla:** `bg-[#dde3ea]` con el documento centrado y con sombra, simula vista de hoja real
- **PDF cotización:** actualizado a scale:1.5 + JPEG 82% (era scale:2 PNG)
