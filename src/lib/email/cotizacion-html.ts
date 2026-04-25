import { Cotizacion } from "@/lib/types";
import { EMPRESA } from "@/lib/empresa";

function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function fecha(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("es-HN", { year: "numeric", month: "long", day: "numeric" });
}

function fechaDestacada(s: string): string {
  const d = new Date(s + "T00:00:00");
  const mes = d.toLocaleString("es-HN", { month: "long" }).toUpperCase();
  return `${d.getDate()} DE ${mes} DE ${d.getFullYear()}`;
}

export function generarHtmlCotizacion(cotizacion: Cotizacion, logoUrl?: string): string {
  const descuento = cotizacion.descuento ?? 0;
  const gravado = cotizacion.subtotal - descuento;
  const isv = cotizacion.isv;

  const lineas = cotizacion.lineas
    .map(
      (l) => `
      <tr>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">${l.descripcion}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px">${l.cantidad}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;color:#374151;font-size:13px">${fmtUSD(l.precioUnitario)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;font-weight:600;color:#111827;font-size:13px">${fmtUSD(l.subtotal)}</td>
      </tr>`
    )
    .join("");

  const ultimaFila = `
      <tr>
        <td colspan="4" style="padding:7px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;font-style:italic;letter-spacing:.5px">— Última Fila —</td>
      </tr>`;

  const proyectoFila = cotizacion.nombreProyecto ? `
      <tr style="background:#f0f4f8">
        <td style="padding:6px 12px 6px 16px;font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:1px solid #e5e7eb;font-style:italic;letter-spacing:.2px">${cotizacion.nombreProyecto}</td>
        <td colspan="3" style="border-bottom:1px solid #e5e7eb;background:#f0f4f8"></td>
      </tr>` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cotización ${cotizacion.numero}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827;min-height:1122px">
  <div style="max-width:794px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;overflow:hidden;min-height:1122px">

    <!-- Encabezado -->
    <div style="padding:24px 40px;border-bottom:3px solid #1e3a5f;display:flex;justify-content:space-between;align-items:flex-start">
      <div style="display:flex;align-items:flex-start;gap:14px">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="width:56px;height:56px;object-fit:contain;border-radius:6px;flex-shrink:0">` : ""}
        <div>
          <p style="margin:0;font-size:21px;font-weight:800;color:#1e3a5f;letter-spacing:.5px">${EMPRESA.nombre}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280">${EMPRESA.direccion}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#6b7280">Tel: ${EMPRESA.telefono} &nbsp;|&nbsp; ${EMPRESA.correo}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#6b7280">RTN: <strong style="color:#374151">${EMPRESA.rtn}</strong></p>
        </div>
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-size:26px;font-weight:800;color:#1e3a5f;letter-spacing:1px">COTIZACIÓN</p>
        <p style="margin:4px 0 0;font-family:monospace;font-size:13px;color:#374151;font-weight:600">${cotizacion.numero}</p>
      </div>
    </div>

    <!-- Fechas + Cliente -->
    <div style="padding:18px 40px;display:grid;grid-template-columns:1fr 1fr;gap:20px;border-bottom:1px solid #e5e7eb">
      <div>
        <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Para</p>
        <p style="margin:0;font-weight:700;font-size:15px;color:#111827">${cotizacion.cliente.nombre}</p>
        <p style="margin:2px 0 0;font-family:monospace;font-size:12px;color:#374151">RTN: ${cotizacion.cliente.rtn || "—"}</p>
        ${cotizacion.cliente.direccion ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280">${cotizacion.cliente.direccion}</p>` : ""}
        ${cotizacion.cliente.correo ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280">${cotizacion.cliente.correo}</p>` : ""}
        ${cotizacion.cliente.telefono ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280">${cotizacion.cliente.telefono}</p>` : ""}
      </div>
      <div style="text-align:right">
        <div style="margin-bottom:8px">
          <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Fecha de Emisión</p>
          <p style="margin:2px 0 0;font-weight:600;font-size:13px">${fecha(cotizacion.fecha)}</p>
        </div>
        <div>
          <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Válida Hasta</p>
          <p style="margin:2px 0 0;font-weight:600;font-size:13px">${fecha(cotizacion.fechaValidez)}</p>
        </div>
      </div>
    </div>

    <!-- Tabla de servicios -->
    <div style="padding:20px 40px 0">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #1e3a5f">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1e3a5f;font-weight:700">Descripción del Servicio</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1e3a5f;font-weight:700;width:55px">Cant.</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1e3a5f;font-weight:700;width:140px">Precio Unit. (USD)</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1e3a5f;font-weight:700;width:130px">Subtotal (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${proyectoFila}
          ${lineas}
          ${ultimaFila}
        </tbody>
      </table>
    </div>

    <!-- Totales -->
    <div style="padding:14px 40px 20px;display:flex;justify-content:flex-end">
      <div style="min-width:270px">
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
          <span style="color:#6b7280">Sub-Total</span>
          <span style="font-family:monospace;color:#374151">${fmtUSD(cotizacion.subtotal)}</span>
        </div>
        ${descuento > 0 ? `
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
          <span style="color:#6b7280">Descuento</span>
          <span style="font-family:monospace;color:#dc2626">-${fmtUSD(descuento)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
          <span style="color:#6b7280">Importe Gravado</span>
          <span style="font-family:monospace;color:#374151">${fmtUSD(gravado)}</span>
        </div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
          <span style="color:#6b7280">ISV (15%)</span>
          <span style="font-family:monospace;color:#374151">${fmtUSD(isv)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:9px 12px;background:#1e3a5f;border-radius:5px;margin-top:6px">
          <span style="color:#fff;font-weight:700;font-size:14px">Total (USD)</span>
          <span style="color:#fff;font-family:monospace;font-weight:700;font-size:14px">${fmtUSD(cotizacion.total)}</span>
        </div>
      </div>
    </div>

    ${cotizacion.notas ? `
    <div style="padding:0 40px 14px">
      <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;font-weight:600">Notas</p>
      <p style="margin:0;font-size:13px;color:#374151">${cotizacion.notas.replace(/\n/g, "<br>")}</p>
    </div>` : ""}

    <!-- Pie de página -->
    <div style="padding:14px 40px;background:#f8f9fb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;font-size:12px;font-weight:700;color:#1e3a5f;letter-spacing:.5px">
        ESTA COTIZACIÓN ES VÁLIDA HASTA EL ${fechaDestacada(cotizacion.fechaValidez)}
      </p>
      <p style="margin:6px 0 0;font-size:11px;color:#6b7280;font-style:italic">
        Los precios están sujetos a cambio.
      </p>
      <p style="margin:8px 0 0;font-size:10px;color:#9ca3af">
        ${EMPRESA.nombre} · RTN ${EMPRESA.rtn} · ${EMPRESA.correo} · Tel: ${EMPRESA.telefono}
      </p>
    </div>
  </div>
</body>
</html>`;
}
