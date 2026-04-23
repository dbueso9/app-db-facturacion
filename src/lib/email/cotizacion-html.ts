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

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

export function generarHtmlCotizacion(cotizacion: Cotizacion): string {
  const lineas = cotizacion.lineas
    .map(
      (l) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#374151">${l.descripcion}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#6b7280">${l.cantidad}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:monospace;color:#374151">${fmtUSD(l.precioUnitario)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:monospace;font-weight:600;color:#111827">${fmtUSD(l.subtotal)}</td>
      </tr>`
    )
    .join("");

  const estadoColor = cotizacion.estado === "aceptada" ? "#166534" :
    cotizacion.estado === "rechazada" ? "#991b1b" :
    cotizacion.estado === "enviada" ? "#1d4ed8" : "#374151";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cotización ${cotizacion.numero}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:#111827;padding:32px 40px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${EMPRESA.nombre}</h1>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px">${EMPRESA.direccion}</p>
        <p style="margin:2px 0 0;color:#9ca3af;font-size:13px">RTN: ${EMPRESA.rtn}</p>
        <p style="margin:2px 0 0;color:#9ca3af;font-size:13px">Tel: ${EMPRESA.telefono}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:1px">COTIZACIÓN</p>
        <p style="margin:4px 0 0;color:#9ca3af;font-family:monospace;font-size:13px">${cotizacion.numero}</p>
        ${cotizacion.nombreProyecto ? `<p style="margin:4px 0 0;color:#d1d5db;font-size:13px;font-weight:600">${cotizacion.nombreProyecto}</p>` : ""}
        <p style="margin:8px 0 0;display:inline-block;background:${estadoColor};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px">${ESTADO_LABEL[cotizacion.estado] || cotizacion.estado}</p>
        <!-- Datos del destinatario en el encabezado -->
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid #374151">
          <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">Para</p>
          <p style="margin:3px 0 0;color:#f9fafb;font-weight:700;font-size:15px">${cotizacion.cliente.nombre}</p>
          ${cotizacion.cliente.correo ? `<p style="margin:2px 0 0;color:#9ca3af;font-size:12px">${cotizacion.cliente.correo}</p>` : ""}
          ${cotizacion.cliente.telefono ? `<p style="margin:2px 0 0;color:#9ca3af;font-size:12px">${cotizacion.cliente.telefono}</p>` : ""}
        </div>
      </div>
    </div>

    <!-- Fechas -->
    <div style="background:#f8fafc;padding:16px 40px;display:flex;gap:48px;border-bottom:1px solid #e5e7eb">
      <div>
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600">Fecha de Emisión</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:14px">${fecha(cotizacion.fecha)}</p>
      </div>
      <div>
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600">Válida Hasta</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:14px">${fecha(cotizacion.fechaValidez)}</p>
      </div>
    </div>

    <!-- Datos del cliente -->
    <div style="padding:24px 40px;border-bottom:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600">Para</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Nombre / Razón Social</p>
          <p style="margin:2px 0 0;font-weight:700;font-size:15px">${cotizacion.cliente.nombre}</p>
        </div>
        <div>
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">RTN</p>
          <p style="margin:2px 0 0;font-weight:700;font-size:15px;font-family:monospace">${cotizacion.cliente.rtn || '<span style="color:#9ca3af;font-style:italic">Sin RTN</span>'}</p>
        </div>
        ${cotizacion.cliente.correo ? `<div>
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Correo</p>
          <p style="margin:2px 0 0;font-size:14px">${cotizacion.cliente.correo}</p>
        </div>` : ""}
        ${cotizacion.cliente.telefono ? `<div>
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Teléfono</p>
          <p style="margin:2px 0 0;font-size:14px">${cotizacion.cliente.telefono}</p>
        </div>` : ""}
        ${cotizacion.cliente.direccion ? `<div style="grid-column:1/-1">
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Dirección</p>
          <p style="margin:2px 0 0;font-size:14px">${cotizacion.cliente.direccion}</p>
        </div>` : ""}
      </div>
    </div>

    <!-- Tabla de servicios -->
    <div style="padding:24px 40px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#374151;font-weight:600">Descripción</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#374151;font-weight:600;width:60px">Cant.</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#374151;font-weight:600;width:140px">Precio Unit. (USD)</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#374151;font-weight:600;width:140px">Subtotal (USD)</th>
          </tr>
        </thead>
        <tbody>${lineas}</tbody>
      </table>
    </div>

    <!-- Totales -->
    <div style="padding:0 40px 24px;display:flex;justify-content:flex-end">
      <div style="width:280px">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #e5e7eb;font-size:14px">
          <span style="color:#6b7280">Subtotal sin ISV</span>
          <span style="font-family:monospace">${fmtUSD(cotizacion.subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px">
          <span style="color:#6b7280">ISV (15%)</span>
          <span style="font-family:monospace">${fmtUSD(cotizacion.isv)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 16px;background:#111827;border-radius:8px;margin-top:4px">
          <span style="color:#fff;font-weight:700;font-size:15px">Total</span>
          <span style="color:#fff;font-family:monospace;font-weight:700;font-size:15px">${fmtUSD(cotizacion.total)}</span>
        </div>
      </div>
    </div>

    ${cotizacion.notas ? `
    <!-- Notas -->
    <div style="padding:0 40px 24px">
      <p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600">Notas</p>
      <p style="margin:0;font-size:14px;color:#374151">${cotizacion.notas.replace(/\n/g, "<br>")}</p>
    </div>` : ""}

    <!-- Footer -->
    <div style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e5e7eb">
      <div style="border:2px solid #111827;border-radius:8px;padding:10px 16px;text-align:center;margin-bottom:16px;background:#fff">
        <p style="margin:0;font-size:13px;font-weight:700;color:#111827;letter-spacing:.8px;text-transform:uppercase">
          ESTA COTIZACIÓN ES VÁLIDA HASTA EL ${fechaDestacada(cotizacion.fechaValidez)}
        </p>
      </div>
      <p style="margin:12px 0 0;font-size:11px;text-align:center;color:#9ca3af">
        ${EMPRESA.nombre} · RTN ${EMPRESA.rtn} · ${EMPRESA.correo} · Tel: ${EMPRESA.telefono}
      </p>
      <p style="margin:6px 0 0;font-size:10px;text-align:center;color:#cbd5e1">
        Sistema de Facturación desarrollado por DB Consulting © ${new Date().getFullYear()}
      </p>
    </div>
  </div>
</body>
</html>`;
}
