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

function rowUSD(label: string, val: number, opts?: { bold?: boolean; red?: boolean; navy?: boolean }): string {
  if (opts?.navy) {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e3a5f;border-radius:6px;margin-top:8px">
      <span style="color:#fff;font-weight:800;font-size:14px;letter-spacing:.3px">${label}</span>
      <span style="color:#fff;font-family:monospace;font-weight:900;font-size:14px">${fmtUSD(val)}</span>
    </div>`;
  }
  const textColor = opts?.red ? "#dc2626" : opts?.bold ? "#0f172a" : "#374151";
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px;border-bottom:1px solid #f1f5f9;font-size:12.5px">
    <span style="color:${opts?.bold ? "#0f172a" : "#6b7280"}">${label}</span>
    <span style="font-family:monospace;color:${textColor};font-weight:${opts?.bold ? "700" : "400"}">${fmtUSD(val)}</span>
  </div>`;
}

/** Retorna solo el <div> del documento — usar en vista de pantalla con dangerouslySetInnerHTML */
export function generarBodyCotizacion(cotizacion: Cotizacion, logoUrl?: string): string {
  const descuento = cotizacion.descuento ?? 0;
  const gravado = cotizacion.subtotal - descuento;
  const isv = cotizacion.isv;

  const proyectoFila = cotizacion.nombreProyecto ? `
      <tr style="background:#eef2f7">
        <td style="padding:7px 12px 7px 16px;font-size:12.5px;font-weight:700;color:#1e3a5f;border-bottom:1px solid #e2e8f0;font-style:italic">${cotizacion.nombreProyecto}</td>
        <td colspan="3" style="border-bottom:1px solid #e2e8f0;background:#eef2f7"></td>
      </tr>` : "";

  const lineas = cotizacion.lineas.map((l) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px">${l.descripcion}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#374151;font-size:13px">${l.cantidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;color:#0f172a;font-size:13px">${fmtUSD(l.precioUnitario)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:700;color:#0f172a;font-size:13px">${fmtUSD(l.subtotal)}</td>
      </tr>`).join("");

  const ultimaFila = `
      <tr>
        <td colspan="4" style="padding:6px 12px;text-align:center;color:#94a3b8;font-size:10.5px;font-style:italic;letter-spacing:.5px">— Última Fila —</td>
      </tr>`;

  return `<div style="width:794px;min-height:1122px;background:#fff;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;color:#0f172a;box-sizing:border-box">

  <!-- ENCABEZADO -->
  <div style="padding:20px 36px 18px;border-bottom:3px solid #1e3a5f;display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
    <div style="display:flex;align-items:flex-start;gap:14px">
      ${logoUrl ? `<img src="${logoUrl}" alt="${EMPRESA.nombre}" style="width:64px;height:64px;object-fit:contain;border-radius:8px;flex-shrink:0">` : ""}
      <div>
        <p style="margin:0;font-size:22px;font-weight:900;color:#1e3a5f;letter-spacing:.3px;line-height:1.1">${EMPRESA.nombre}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#374151">${EMPRESA.direccion}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#374151">Tel: ${EMPRESA.telefono} &nbsp;·&nbsp; ${EMPRESA.correo}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#374151">RTN: <strong style="color:#0f172a;font-family:monospace">${EMPRESA.rtn}</strong></p>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <p style="margin:0;font-size:30px;font-weight:900;color:#1e3a5f;letter-spacing:2px;line-height:1">COTIZACIÓN</p>
      <p style="margin:5px 0 0;font-family:monospace;font-size:14px;color:#0f172a;font-weight:700">${cotizacion.numero}</p>
      ${cotizacion.nombreProyecto ? `<p style="margin:4px 0 0;font-size:11px;color:#6b7280;font-style:italic">${cotizacion.nombreProyecto}</p>` : ""}
    </div>
  </div>

  <!-- CLIENTE + FECHAS -->
  <div style="padding:14px 36px;display:grid;grid-template-columns:1fr 1fr;gap:16px;border-bottom:1px solid #e2e8f0">
    <div>
      <p style="margin:0 0 5px;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Para</p>
      <p style="margin:0;font-weight:700;font-size:15px;color:#0f172a;line-height:1.3">${cotizacion.cliente.nombre}</p>
      <p style="margin:3px 0 0;font-family:monospace;font-size:12px;color:#374151;font-weight:600">RTN: ${cotizacion.cliente.rtn || "—"}</p>
      ${cotizacion.cliente.direccion ? `<p style="margin:3px 0 0;font-size:11.5px;color:#374151">${cotizacion.cliente.direccion}</p>` : ""}
      ${cotizacion.cliente.correo ? `<p style="margin:3px 0 0;font-size:11.5px;color:#374151">${cotizacion.cliente.correo}</p>` : ""}
      ${cotizacion.cliente.telefono ? `<p style="margin:3px 0 0;font-size:11.5px;color:#374151">${cotizacion.cliente.telefono}</p>` : ""}
    </div>
    <div style="text-align:right">
      <div style="margin-bottom:7px">
        <p style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Fecha de Emisión</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:13px;color:#0f172a">${fecha(cotizacion.fecha)}</p>
      </div>
      <div>
        <p style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Válida Hasta</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:13px;color:#0f172a">${fecha(cotizacion.fechaValidez)}</p>
      </div>
    </div>
  </div>

  <!-- TABLA DE SERVICIOS -->
  <div style="padding:16px 36px 0">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#1e3a5f">
          <th style="padding:9px 12px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#fff;font-weight:700">Descripción del Servicio</th>
          <th style="padding:9px 12px;text-align:center;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#fff;font-weight:700;width:52px">Cant.</th>
          <th style="padding:9px 12px;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#fff;font-weight:700;width:140px">Precio Unit. (USD)</th>
          <th style="padding:9px 12px;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#fff;font-weight:700;width:140px">Subtotal (USD)</th>
        </tr>
      </thead>
      <tbody>
        ${proyectoFila}
        ${lineas}
        ${ultimaFila}
      </tbody>
    </table>
  </div>

  <!-- ESPACIADOR FLEX -->
  <div style="flex:1;min-height:20px"></div>

  <!-- NOTAS -->
  ${cotizacion.notas ? `
  <div style="padding:8px 36px;border-top:1px solid #e2e8f0">
    <p style="margin:0 0 3px;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Notas</p>
    <p style="margin:0;font-size:12px;color:#374151;line-height:1.6">${cotizacion.notas.replace(/\n/g, "<br>")}</p>
  </div>` : ""}

  <!-- TOTALES -->
  <div style="padding:16px 36px 20px;display:flex;justify-content:flex-end;border-top:2px solid #e2e8f0">
    <div style="min-width:268px">
      ${rowUSD("Sub-Total", cotizacion.subtotal)}
      ${descuento > 0 ? rowUSD("Descuento", descuento, { red: true }) : ""}
      ${descuento > 0 ? rowUSD("Importe Gravado", gravado, { bold: true }) : ""}
      ${rowUSD("ISV (15%)", isv, { bold: true })}
      ${rowUSD("Total (USD)", cotizacion.total, { navy: true })}
    </div>
  </div>

  <!-- PIE DE PÁGINA -->
  <div style="padding:12px 36px;background:#eef2f7;border-top:2px solid #1e3a5f;text-align:center">
    <p style="margin:0;font-size:11.5px;font-weight:800;color:#1e3a5f;letter-spacing:.6px;text-transform:uppercase">
      ESTA COTIZACIÓN ES VÁLIDA HASTA EL ${fechaDestacada(cotizacion.fechaValidez)}
    </p>
    <p style="margin:5px 0 0;font-size:11px;color:#374151;font-style:italic">
      Los precios están sujetos a cambio sin previo aviso.
    </p>
    <p style="margin:5px 0 0;font-size:10px;color:#374151">
      ${EMPRESA.nombre} &nbsp;·&nbsp; RTN ${EMPRESA.rtn} &nbsp;·&nbsp; ${EMPRESA.correo} &nbsp;·&nbsp; Tel: ${EMPRESA.telefono}
    </p>
  </div>

</div>`;
}

/** Retorna un documento HTML completo para correo electrónico y PDF */
export function generarHtmlCotizacion(cotizacion: Cotizacion, logoUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cotización ${cotizacion.numero}</title>
</head>
<body style="margin:0;padding:24px;background:#dde3ea;font-family:Arial,Helvetica,sans-serif">
  ${generarBodyCotizacion(cotizacion, logoUrl)}
</body>
</html>`;
}
