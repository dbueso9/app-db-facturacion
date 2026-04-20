# HANDOFF — DB Consulting Facturación

## Estado actual
App de facturación funcional y lista para uso. Build de producción pasa sin errores ni advertencias.

---

## Stack
- **Framework:** Next.js 16.2 (App Router, Turbopack)
- **UI:** shadcn/ui con **Base UI** (no Radix UI) + Tailwind CSS v4
- **Persistencia:** `localStorage` — sin backend, sin base de datos
- **Forms:** React Hook Form + Zod
- **Modo:** Dark mode fijo (clase `dark` en `<html>`)

> **IMPORTANTE:** Los componentes Button y Select son de Base UI.
> - `Button` NO tiene prop `asChild` — usar `render={<Link href="..." />}`
> - `Select.onValueChange` recibe `(value: string | null) => void`

---

## Estructura de archivos clave

```
src/
├── lib/
│   ├── empresa.ts      # Datos fiscales fijos (CAI, RTN, rangos, ISV)
│   ├── types.ts        # Tipos TypeScript (Factura, Cliente, Servicio, etc.)
│   ├── store.ts        # CRUD sobre localStorage
│   └── utils.ts        # formatLempiras, formatFecha, generarId
├── components/
│   └── navbar.tsx      # Navegación sticky con logo
└── app/
    ├── page.tsx              # Dashboard
    ├── facturas/
    │   ├── page.tsx          # Lista de facturas con búsqueda/filtro
    │   ├── nueva/page.tsx    # Formulario de nueva factura
    │   └── [id]/page.tsx     # Vista de factura + impresión
    ├── clientes/page.tsx     # CRUD de clientes
    └── servicios/page.tsx    # Catálogo de servicios
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

## Numeración de facturas
- Secuencia inicia en `101`, termina en `150` (50 facturas disponibles)
- Función: `crearNumeroFactura()` en `store.ts`
- Formato: `N.000-001-04-XXXXXXXX`
- Las facturas **anuladas NO consumen** número de secuencia (se recalcula el máximo)
- La app muestra alerta cuando quedan ≤ 10 facturas disponibles en el rango

---

## Funcionalidades implementadas
- [x] Dashboard con métricas (total facturado, cobrado, pendientes, CAI disponible)
- [x] Lista de facturas con búsqueda y filtro por estado
- [x] Crear factura con selector de cliente, catálogo de servicios, líneas libres
- [x] ISV 15% calculado automáticamente en tiempo real
- [x] Vista de factura imprimible (Ctrl+P / botón Imprimir) — header/navbar se ocultan al imprimir
- [x] Cambiar estado de factura: Borrador / Emitida / Pagada / Anulada
- [x] CRUD completo de clientes (con RTN, dirección, correo, teléfono)
- [x] Catálogo de servicios con 6 servicios precargados
- [x] Logo `Logo DB.png` integrado en navbar y en documento de factura
- [x] Datos CAI visibles en dashboard y en pie de factura imprimible

---

## Pendientes / Mejoras sugeridas

### Prioritarias
- [ ] **Exportar factura a PDF** — actualmente solo imprime. Integrar `@react-pdf/renderer` o `jspdf` para generar PDF descargable
- [ ] **Botón Eliminar factura** en la vista `[id]` — actualmente `deleteFactura` existe en store pero no hay UI para llamarlo
- [ ] **Confirmación antes de anular** — usar `AlertDialog` de shadcn cuando se cambia estado a "anulada"

### Mejoras UX
- [ ] **Editar factura** en estado borrador — actualmente no se puede editar una vez creada
- [ ] **Paginación** en lista de facturas para cuando crezca el volumen
- [ ] **Exportar datos a JSON/Excel** — backup de clientes y facturas
- [ ] **Filtro por fecha** en lista de facturas
- [ ] **Resumen por cliente** — cuánto se le ha facturado a cada cliente

### Infraestructura (si se quiere persistencia real)
- [ ] Migrar de `localStorage` a base de datos (Neon Postgres vía Vercel Marketplace recomendado)
- [ ] Autenticación básica (Clerk vía Vercel Marketplace)
- [ ] Deploy en Vercel (`vercel deploy`)

---

## Cómo retomar
```bash
cd "db-consulting-facturas"
npm run dev
# → http://localhost:3000
```

## Cómo hacer deploy
```bash
npm install -g vercel
vercel deploy --prod
```

---

## QA realizado — 2026-04-20
| Área | Estado |
|---|---|
| Build de producción (`npm run build`) | ✅ Sin errores |
| TypeScript (`tsc --noEmit`) | ✅ Sin errores |
| Todas las rutas generan sin error | ✅ |
| Import no utilizado (`Link` en `[id]/page`) | ✅ Corregido |
| `onValueChange` null-safe en Select de servicios | ✅ Corregido |
| Select de catálogo se resetea tras seleccionar | ✅ Corregido |
| Logo `Logo DB.png` en navbar y factura | ✅ |
| ISV 15% calculado correctamente | ✅ |
| Numeración CAI respeta el rango autorizado | ✅ |
| Vista de impresión oculta navbar y controles | ✅ |
