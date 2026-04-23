# Manual de Uso — DB Consulting Sistema de Facturación

> Actualizado: 2026-04-23 · Versión del sistema: Fase 10

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Dashboard](#2-dashboard)
3. [Clientes](#3-clientes)
4. [Servicios (Catálogo)](#4-servicios-catálogo)
5. [Cotizaciones](#5-cotizaciones)
6. [Facturas](#6-facturas)
7. [Contratos y Proyectos](#7-contratos-y-proyectos)
8. [Reportes](#8-reportes)
9. [Correo electrónico y PDFs](#9-correo-electrónico-y-pdfs)
10. [Configuración de empresa](#10-configuración-de-empresa)
11. [Tasa de cambio BCH](#11-tasa-de-cambio-bch)
12. [Notas fiscales Honduras](#12-notas-fiscales-honduras)

---

## 1. Acceso al sistema

- URL producción: dominio configurado en Vercel (deploy automático desde rama `main`).
- La sesión se maneja con **Supabase Auth** (cookies HTTP-only).
- Al ingresar sin sesión activa el sistema redirige automáticamente a `/login`.
- Para cambiar la contraseña: usar el panel de Supabase en `Authentication → Users`.

---

## 2. Dashboard

Ruta: `/` (raíz)

| Sección | Descripción |
|---|---|
| Tarjetas de KPIs | Facturado total, cobrado, pendiente y facturas vencidas del año en curso |
| Gráfica de barras | Ingresos facturados vs cobrados — últimos 6 meses |
| Top clientes | Ranking de clientes por monto facturado en el año |
| Contratos activos | Listado de contratos vigentes con progreso de hitos |
| Facturas recientes | Últimas 5 facturas emitidas con acceso directo |

---

## 3. Clientes

Ruta: `/clientes`

### Crear cliente
1. Clic en **Nuevo Cliente**.
2. Campos obligatorios: **Nombre / Razón Social**.
3. Campos opcionales: RTN, correo, teléfono, dirección.
4. Guardar — el cliente queda disponible para facturas y cotizaciones.

### Perfil del cliente
Ruta: `/clientes/[id]`

El perfil agrupa toda la información relacionada con el cliente:

- **Datos fiscales**: nombre, RTN, contacto, dirección.
- **Facturas**: historial completo con estado y montos.
- **Cotizaciones**: historial con estado y conversiones.
- **Contratos**: contratos activos con progreso de hitos y cobros.
- **Proyectos activos**: tarjetas de progreso por hito (% facturado y cobrado).

### Editar / Eliminar
- Botón **Editar** en el perfil del cliente.
- La eliminación solo es posible si el cliente no tiene facturas ni cotizaciones asociadas.

---

## 4. Servicios (Catálogo)

Ruta: `/servicios`

El catálogo centraliza los servicios recurrentes con precios base en **USD**.

### Crear servicio
1. Clic en **Nuevo Servicio**.
2. Campos: nombre, descripción, precio base (USD), categoría.
3. Categorías disponibles: `consultoria`, `hosting`, `desarrollo_web`, `desarrollo_app`, `soporte`.

### Uso del catálogo
- Al crear una factura o cotización, el select **"Agregar del catálogo"** inserta el servicio directamente en la tabla de líneas.
- Al escribir en el campo descripción de una línea, el sistema autocompletará y pre-cargará el precio si el nombre coincide exactamente con un servicio del catálogo.
- En facturas, el precio se convierte automáticamente a **lempiras** usando la tasa BCH del día.

---

## 5. Cotizaciones

Ruta: `/cotizaciones`

Las cotizaciones son propuestas económicas **en USD** enviadas al cliente antes de emitir una factura.

### Crear cotización
1. Clic en **Nueva Cotización**.
2. Seleccionar cliente, nombre del proyecto (opcional), fecha de emisión y fecha de validez.
3. La **validez por defecto es 15 días** desde la fecha de emisión.
4. Agregar líneas de servicios (descripción, cantidad, precio unitario en USD).
5. El sistema calcula subtotal, ISV (15%) y total automáticamente.
6. Agregar notas (condiciones, alcance, términos de pago) — campo opcional.
7. Clic en **Crear Cotización** → se guarda en estado **Borrador**.

### Estados de cotización

| Estado | Descripción |
|---|---|
| **Borrador** | Recién creada, editable |
| **Enviada** | Enviada al cliente, no editable |
| **Aceptada** | Aprobada — puede convertirse a factura o contrato de proyecto |
| **Rechazada** | Declinada por el cliente |

Todos los cambios de estado requieren **confirmación** mediante un diálogo.

### Enviar cotización por correo
1. Abrir la cotización → botón **Enviar por Correo**.
2. Ingresar destinatario, asunto y mensaje personalizado.
3. El sistema genera el PDF automáticamente antes de enviar.
4. El correo incluye el **PDF adjunto** de la cotización.

### Convertir cotización en factura directa
- Disponible cuando la cotización está en estado **Borrador**, **Enviada** o **Aceptada** (y no ha sido convertida).
- Botón **Convertir a Factura** → abre formulario con los datos prellenados desde la cotización.
- La cotización queda marcada como **Aceptada** y vinculada a la nueva factura.

### Convertir cotización en proyecto (con hitos)
- Para proyectos que se pagan en fases (anticipo, pruebas, productivo, etc.).
- Botón **Crear Contrato** → abre diálogo para definir:
  - Nombre del proyecto
  - Fecha de inicio
  - Hitos de pago: cada hito tiene nombre, porcentaje (%) y descripción
  - La suma de porcentajes debe ser exactamente **100%**
- Al confirmar se crea el contrato de tipo `proyecto_app` con los hitos, y la cotización queda marcada como **Aceptada**.
- El progreso del proyecto se visualiza en el perfil del cliente.

### Aviso de validez
- La cotización muestra un recuadro destacado: **"ESTA COTIZACIÓN ES VÁLIDA HASTA EL DD DE MES DE AAAA"**.
- Este mismo aviso aparece en el PDF enviado por correo.

---

## 6. Facturas

Ruta: `/facturas`

Las facturas son documentos fiscales en **lempiras (HNL)**, numeradas con el formato CAI autorizado.

### Crear factura
1. Clic en **Nueva Factura**.
2. Seleccionar cliente, nombre del proyecto (obligatorio), fecha de emisión.
3. Seleccionar **condición de pago**: 30, 60 o 90 días (calcula fecha de vencimiento automáticamente).
4. Seleccionar **método de pago**: transferencia bancaria, cheque, efectivo.
5. Agregar líneas de servicios — los precios del catálogo se convierten a lempiras con la tasa BCH.
6. Clic en **Emitir Factura** → se crea en estado **Emitida** con número correlativo del CAI.

> Si el sistema muestra un aviso de **límite CAI alcanzado**, se ha agotado el rango de facturas autorizado. Actualizar `src/lib/empresa.ts` con el nuevo CAI.

### Estados de factura

| Estado | Descripción |
|---|---|
| **Borrador** | Solo para facturas de contrato pendientes de emitir |
| **Emitida** | Enviada al cliente, pendiente de cobro |
| **Pagada** | Cobrada — cierra el hito de proyecto si corresponde |
| **Anulada** | Anulación irreversible (no modifica la secuencia del CAI) |

Todos los cambios de estado requieren **confirmación** mediante un diálogo. La anulación muestra además una advertencia de irreversibilidad.

### Enviar factura por correo
1. Abrir la factura → botón **Enviar por Correo**.
2. Ingresar destinatario, asunto y mensaje.
3. El sistema genera el PDF automáticamente antes de enviar.
4. El correo incluye el **PDF adjunto** de la factura.

### Envío masivo (desde perfil del cliente)
- En el perfil del cliente, sección **Facturas**, seleccionar múltiples facturas con los checkboxes.
- Botón **Enviar seleccionadas** → genera PDFs de todas las seleccionadas y los adjunta en un solo correo.

### Editar factura
- Solo disponible para facturas en estado **Borrador**.
- Las facturas **Emitidas**, **Pagadas** o **Anuladas** no son editables.

### Número de factura
El número sigue el formato CAI configurado en `src/lib/empresa.ts`:
```
N.000-001-04-00000101
```
Formato: `N.{establecimiento}-{punto_emision}-{tipo_documento}-{secuencia}`

---

## 7. Contratos y Proyectos

Ruta: acceso desde el perfil del cliente

### Tipos de contrato

| Tipo | Descripción |
|---|---|
| `mantenimiento` | Contrato anual de soporte (17% del valor base) |
| `hosting` | Hosting con facturación mensual |
| `proyecto_app` | Proyecto de desarrollo pagado por hitos |

### Contratos de proyecto (hitos)

Los proyectos creados desde una cotización (ver sección 5) tienen **hitos de pago**.

Cada hito representa una fase del proyecto:

| Campo | Descripción |
|---|---|
| Nombre | Ej: "Anticipo", "Pruebas QA", "Puesta en productivo" |
| Porcentaje | % del total que representa este hito |
| Descripción | Detalle opcional del entregable |

**Flujo de un hito:**
1. **Pendiente** → El hito aún no tiene factura emitida.
2. **Emitida** → Se emitió la factura para ese hito (botón **Facturar** en la tarjeta del hito).
3. **Cobrado ✓** → La factura del hito está en estado `pagada`.

**Cierre del proyecto:**
El proyecto se marca como **Cerrado ✓** automáticamente cuando todos los hitos tienen factura en estado `pagada`.

### Progreso visual
El perfil del cliente muestra una **barra de progreso de dos capas**:
- Capa translúcida: porcentaje facturado (facturas emitidas).
- Capa sólida: porcentaje cobrado (facturas pagadas).

---

## 8. Reportes

Ruta: `/reportes`

### Reporte mensual
- Seleccionar **año** y **mes** con los filtros superiores.
- Muestra todas las facturas del período con cliente, monto, método de pago y estado.
- **Botón Exportar CSV** descarga el reporte en formato CSV para Excel o contabilidad.

### Gráfica anual
- Barra de ingresos facturados vs cobrados por mes del año seleccionado.
- Incluye totales anuales de facturado, cobrado e ISV acumulado.

---

## 9. Correo electrónico y PDFs

El sistema utiliza **Resend** para el envío de correos.

### Remitente actual
```
onboarding@resend.dev
```
> Pendiente: verificar el dominio `dbconsulting.hn` en Resend para usar `facturacion@dbconsulting.hn`. Actualizar el campo `from` en `src/lib/actions/email.ts`.

### Generación de PDFs
- Los PDFs se generan **en el navegador** (client-side) usando `html2canvas` + `jsPDF`.
- El HTML de la factura/cotización se renderiza en un iframe aislado para evitar problemas con los colores oklch de Tailwind v4.
- El PDF se convierte a base64 y se adjunta al correo vía Resend.

### Tipos de correo disponibles
| Función | Descripción |
|---|---|
| `enviarFactura` | Una factura con PDF adjunto |
| `enviarCotizacion` | Una cotización con PDF adjunto |
| `enviarFacturasAgrupadas` | Múltiples facturas en un correo (PDFs múltiples adjuntos) |

---

## 10. Configuración de empresa

Archivo: `src/lib/empresa.ts`

Contiene los datos fiscales de DB Consulting que aparecen en todos los documentos:

```typescript
export const EMPRESA = {
  nombre: "DB Consulting",
  rtn: "04011980003740",
  direccion: "...",
  telefono: "...",
  correo: "...",
  cai: "...",           // CAI autorizado por SAR
  rangoDesde: "...",    // Rango desde
  rangoHasta: "...",    // Rango hasta
  fechaLimiteEmision: "DD/MM/AAAA",
  secuenciaInicio: 101, // Primera secuencia del rango
  secuenciaFin: 150,    // Última secuencia del rango
  isv: 0.15,            // 15%
}
```

**Al renovar CAI:** actualizar `cai`, `rangoDesde`, `rangoHasta`, `fechaLimiteEmision`, `secuenciaInicio` y `secuenciaFin`. El campo `secuenciaInicio` define el número de la próxima factura si no hay facturas en la base de datos.

---

## 11. Tasa de cambio BCH

El sistema obtiene automáticamente la tasa de cambio del **Banco Central de Honduras (BCH)**.

- Se consulta al cargar el formulario de nueva factura.
- Si la consulta falla (sin conexión o API no disponible), se muestra un aviso y los precios del catálogo se usan en USD sin conversión.
- La tasa guardada con cada factura es la tasa de **venta** del día de emisión.

---

## 12. Notas fiscales Honduras

- **ISV**: 15% sobre el subtotal, aplicado en todas las facturas y cotizaciones.
- **RTN**: el sistema valida y muestra el RTN tanto del emisor como del receptor en todos los documentos.
- **CAI**: el número de autorización y el rango de facturación aparecen al pie de cada factura PDF.
- **Correlativo**: las facturas mantienen correlativo ininterrumpido. Las facturas anuladas conservan su número en el registro.
- **Monedas**: facturas en **lempiras (HNL)**, cotizaciones en **dólares (USD)**.

---

## Estructura de la base de datos (Supabase)

| Tabla | Contenido |
|---|---|
| `dbc_clientes` | Datos de clientes |
| `dbc_facturas` | Facturas (cabecera) |
| `dbc_lineas_factura` | Líneas de detalle de facturas |
| `dbc_cotizaciones` | Cotizaciones (cabecera) |
| `dbc_lineas_cotizacion` | Líneas de detalle de cotizaciones |
| `dbc_servicios` | Catálogo de servicios |
| `dbc_contratos` | Contratos (mantenimiento/hosting/proyecto) |
| `dbc_hitos` | Hitos de proyectos con vinculación a facturas |

---

## Deploy

- El repositorio está en Git local. El deploy es automático via **Vercel** al hacer `git push` a `main`.
- Variables de entorno requeridas (configuradas en Vercel):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `RESEND_API_KEY`
