# HANDOFF — DB Consulting Facturación

## Estado actual
App de facturación en producción, completamente migrada a Supabase Postgres y desplegada en Vercel.

**Producción:** https://db-consulting-facturas.vercel.app
**Repositorio:** https://github.com/dbueso9/app-db-facturacion

---

## Stack
- **Framework:** Next.js 16.2 (App Router, Turbopack)
- **UI:** shadcn/ui con **Base UI** (no Radix UI) + Tailwind CSS v4
- **Persistencia:** Supabase Postgres (proyecto `bekolkmrxxbygbqauotb`)
- **Deploy:** Vercel (equipo `dbueso9s-projects`) — auto-deploy en cada push a `main`
- **Forms:** React Hook Form + Zod
- **PDF:** html2canvas + jsPDF
- **Modo:** Dark mode fijo (clase `dark` en `<html>`)

> **IMPORTANTE:** Los componentes Button y Select son de Base UI.
> - `Button` NO tiene prop `asChild` — usar `render={<Link href="..." />}`
> - `Select.onValueChange` recibe `(value: string | null) => void`

---

## Estructura de archivos clave

```
src/
├── lib/
│   ├── supabase.ts         # createServerClient() con service_role key
│   ├── actions/
│   │   ├── clientes.ts     # Server Actions: getClientes, saveCliente, deleteCliente
│   │   ├── facturas.ts     # Server Actions: getFacturas, getFactura, saveFactura,
│   │   │                   #   updateEstadoFactura, deleteFactura, crearNumeroFactura
│   │   └── servicios.ts    # Server Actions: getServicios, saveServicio, deleteServicio
│   ├── empresa.ts          # Datos fiscales fijos (CAI, RTN, rangos, ISV)
│   ├── types.ts            # Tipos TypeScript (Factura, Cliente, Servicio, etc.)
│   └── utils.ts            # formatLempiras, formatFecha, generarId
├── components/
│   └── navbar.tsx          # Navegación sticky con logo
└── app/
    ├── page.tsx                    # Server component → DashboardClient
    ├── dashboard-client.tsx        # Dashboard con métricas
    ├── facturas/
    │   ├── page.tsx                # Server component → FacturasClient
    │   ├── facturas-client.tsx     # Lista con búsqueda, filtro estado/fecha, paginación
    │   ├── nueva/
    │   │   ├── page.tsx            # Server component → NuevaFacturaClient
    │   │   └── nueva-client.tsx    # Formulario de nueva factura
    │   └── [id]/
    │       ├── page.tsx            # Server component → FacturaDetalleClient
    │       ├── factura-detalle-client.tsx  # Vista + controles + PDF
    │       └── editar/
    │           ├── page.tsx        # Server component (redirige si no es borrador)
    │           └── editar-client.tsx  # Formulario de edición
    ├── clientes/
    │   ├── page.tsx                # Server component → ClientesClient
    │   └── clientes-client.tsx     # CRUD de clientes
    └── servicios/
        ├── page.tsx                # Server component → ServiciosClient
        └── servicios-client.tsx    # Catálogo de servicios
```

---

## Base de datos (Supabase)

Tablas con prefijo `dbc_` para aislamiento dentro del proyecto Supabase compartido:

| Tabla | Descripción |
|---|---|
| `dbc_clientes` | Clientes con RTN, dirección, correo, teléfono |
| `dbc_servicios` | Catálogo de servicios con precio base y categoría |
| `dbc_facturas` | Facturas con `cliente_data` JSONB (snapshot histórico) |
| `dbc_lineas_factura` | Líneas de factura con FK a `dbc_facturas` (CASCADE DELETE) |

El esquema completo está en `schema.sql` en la raíz del proyecto.

---

## Variables de entorno

Configuradas en Vercel (producción) y en `.env.local` (desarrollo):

```
NEXT_PUBLIC_SUPABASE_URL=https://bekolkmrxxbygbqauotb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

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

- [x] Dashboard con métricas (total facturado, cobrado, pendientes, CAI disponible)
- [x] Lista de facturas con búsqueda, filtro por estado, filtro por rango de fechas y paginación (10/página)
- [x] Crear factura con selector de cliente, catálogo de servicios, líneas libres
- [x] ISV 15% calculado automáticamente en tiempo real
- [x] Vista de factura imprimible (Ctrl+P / botón Imprimir) — header/navbar se ocultan al imprimir
- [x] Exportar factura a PDF descargable (html2canvas + jsPDF)
- [x] Cambiar estado de factura: Borrador / Emitida / Pagada / Anulada
- [x] AlertDialog de confirmación antes de anular una factura
- [x] Botón Eliminar factura con AlertDialog de confirmación → redirige a `/facturas`
- [x] Editar factura en estado borrador (`/facturas/[id]/editar`)
- [x] CRUD completo de clientes (con RTN, dirección, correo, teléfono)
- [x] Catálogo de servicios con 6 servicios precargados
- [x] Logo `Logo DB.png` integrado en navbar y en documento de factura
- [x] Datos CAI visibles en dashboard y en pie de factura imprimible
- [x] Alerta cuando quedan ≤ 10 facturas disponibles en el rango CAI

---

## Pendientes / Mejoras sugeridas

### Mejoras UX
- [ ] **Exportar datos a JSON/Excel** — backup de clientes y facturas
- [ ] **Resumen por cliente** — cuánto se le ha facturado a cada cliente

### Infraestructura
- [ ] **Autenticación** (Clerk vía Vercel Marketplace) — actualmente la app es pública
- [ ] **Nuevo CAI** — cuando se agote el rango actual, actualizar `empresa.ts` con el nuevo

---

## Cómo retomar desarrollo
```bash
cd "db-consulting-facturas"
npm run dev
# → http://localhost:3000
```

## Cómo hacer deploy
```bash
git push  # Vercel despliega automáticamente desde main
# O manualmente:
vercel deploy --prod --scope dbueso9s-projects
```

---

## QA realizado — 2026-04-20
| Área | Estado |
|---|---|
| Build de producción (`npm run build`) | ✅ Sin errores |
| TypeScript (`tsc --noEmit`) | ✅ Sin errores |
| Todas las rutas dinámicas en Vercel | ✅ |
| Migración localStorage → Supabase | ✅ |
| Server Actions (clientes, facturas, servicios) | ✅ |
| Deploy en Vercel con variables de entorno | ✅ |
| Schema SQL ejecutado en Supabase | ✅ |
| Eliminar factura con confirmación | ✅ |
| AlertDialog al anular factura | ✅ |
| Editar factura en borrador | ✅ |
| Exportar PDF (html2canvas + jsPDF) | ✅ |
| Filtro por fecha en lista de facturas | ✅ |
| Paginación (10 por página) | ✅ |
