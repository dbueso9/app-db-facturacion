import { Factura } from "@/lib/types";
import { EMPRESA } from "@/lib/empresa";

function fmt(n: number): string {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 2 }).format(n);
}

function fecha(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("es-HN", { year: "numeric", month: "long", day: "numeric" });
}

const METODO_LABEL: Record<string, string> = {
  transferencia: "Transferencia Bancaria",
  cheque: "Cheque",
  efectivo: "Efectivo",
};

export function generarHtmlFactura(factura: Factura, logoUrl?: string): string {
  const descuento = factura.descuento ?? 0;
  const gravado = factura.subtotal - descuento;

  const lineas = factura.lineas
    .map(
      (l) => `
      <tr>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">${l.descripcion}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px">${l.cantidad}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;color:#374151;font-size:13px">${fmt(l.precioUnitario)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;font-weight:600;color:#111827;font-size:13px">${fmt(l.subtotal)}</td>
      </tr>`
    )
    .join("");

  const ultimaFila = `
      <tr>
        <td colspan="4" style="padding:7px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;font-style:italic;letter-spacing:.5px">— Última Fila —</td>
      </tr>`;

  const proyectoFila = factura.nombreProyecto ? `
      <tr>
        <td colspan="4" style="padding:6px 12px;background:#f0f4f8;font-size:12px;font-weight:700;color:#1e3a5f;letter-spacing:.3px">${factura.nombreProyecto}</td>
      </tr>` : "";

  const row = (label: string, val: number, bold?: boolean) => `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:13px">
      <span style="color:${bold ? "#111827" : "#6b7280"};font-weight:${bold ? "700" : "400"}">${label}</span>
      <span style="font-family:monospace;font-weight:${bold ? "700" : "400"};color:${bold ? "#111827" : "#374151"}">${fmt(val)}</span>
    </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Factura ${factura.numero}</title></head>
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
        <p style="margin:0;font-size:26px;font-weight:800;color:#1e3a5f;letter-spacing:1px">FACTURA</p>
        <p style="margin:4px 0 0;font-family:monospace;font-size:13px;color:#374151;font-weight:600">${factura.numero}</p>
      </div>
    </div>

    <!-- Datos fiscales SAR -->
    <div style="padding:8px 40px;background:#f8f9fb;border-bottom:1px solid #e5e7eb;font-size:11px;color:#374151">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 32px">
        <div><strong>CAI:</strong> <span style="font-family:monospace">${EMPRESA.cai}</span></div>
        <div><strong>Fecha Límite Emisión:</strong> ${EMPRESA.fechaLimiteEmision}</div>
        <div><strong>Rango Desde:</strong> <span style="font-family:monospace">N.${EMPRESA.rangoDesde}</span></div>
        <div><strong>Rango Hasta:</strong> <span style="font-family:monospace">N.${EMPRESA.rangoHasta}</span></div>
      </div>
    </div>

    <!-- Fechas + Cliente -->
    <div style="padding:16px 40px;display:grid;grid-template-columns:1fr 1fr;gap:20px;border-bottom:1px solid #e5e7eb">
      <div>
        <p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Facturar a</p>
        <p style="margin:0;font-weight:700;font-size:14px;color:#111827">${factura.cliente.nombre}</p>
        <p style="margin:1px 0 0;font-family:monospace;font-size:12px;color:#374151">RTN: ${factura.cliente.rtn || "—"}</p>
        ${factura.cliente.direccion ? `<p style="margin:1px 0 0;font-size:12px;color:#6b7280">${factura.cliente.direccion}</p>` : ""}
        ${factura.cliente.correo ? `<p style="margin:1px 0 0;font-size:12px;color:#6b7280">${factura.cliente.correo}</p>` : ""}
        ${factura.cliente.telefono ? `<p style="margin:1px 0 0;font-size:12px;color:#6b7280">${factura.cliente.telefono}</p>` : ""}
      </div>
      <div style="text-align:right">
        <div style="margin-bottom:6px">
          <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Fecha de Emisión</p>
          <p style="margin:2px 0 0;font-weight:600;font-size:13px">${fecha(factura.fecha)}</p>
        </div>
        <div style="margin-bottom:6px">
          <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Vencimiento</p>
          <p style="margin:2px 0 0;font-weight:600;font-size:13px">${fecha(factura.fechaVencimiento)}</p>
        </div>
        ${factura.metodoPago ? `<div>
          <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Método de Pago</p>
          <p style="margin:2px 0 0;font-weight:600;font-size:13px">${METODO_LABEL[factura.metodoPago] || factura.metodoPago}</p>
        </div>` : ""}
      </div>
    </div>

    <!-- Tabla de servicios -->
    <div style="padding:20px 40px 0">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #1e3a5f">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1e3a5f;font-weight:700">Descripción del Servicio</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1e3a5f;font-weight:700;width:55px">Cant.</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1e3a5f;font-weight:700;width:130px">Precio Unit.</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#1e3a5f;font-weight:700;width:130px">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${proyectoFila}
          ${lineas}
          ${ultimaFila}
        </tbody>
      </table>
    </div>

    <!-- Totales SAR + Banco -->
    <div style="padding:14px 40px 20px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px">

      <!-- Info bancaria -->
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px 14px;font-size:12px;min-width:190px">
        <p style="margin:0 0 5px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Datos Bancarios</p>
        <p style="margin:0;font-weight:700;color:#374151">${EMPRESA.banco.nombre}</p>
        <p style="margin:2px 0;color:#6b7280">Cuenta #${EMPRESA.banco.cuenta}</p>
        <p style="margin:0;color:#6b7280">Tipo: ${EMPRESA.banco.tipo}</p>
      </div>

      <!-- Totales SAR -->
      <div style="min-width:270px">
        ${row("Sub-Total", factura.subtotal)}
        ${row("Descuento", descuento)}
        ${row("Impt. Exento", 0)}
        ${row("Impt. Gravado", gravado)}
        ${row("Impt. Exonerado", 0)}
        ${row("Impuesto 15%", factura.isv)}
        <div style="display:flex;justify-content:space-between;padding:9px 12px;background:#1e3a5f;border-radius:5px;margin-top:6px">
          <span style="color:#fff;font-weight:700;font-size:14px">Total</span>
          <span style="color:#fff;font-family:monospace;font-weight:700;font-size:14px">${fmt(factura.total)}</span>
        </div>
        ${factura.tasaCambio ? `<p style="margin:6px 0 0;font-size:10px;text-align:right;color:#9ca3af">Tasa BCH: L.${factura.tasaCambio.toFixed(4)}/USD</p>` : ""}
      </div>
    </div>

    ${factura.notas ? `
    <div style="padding:0 40px 16px">
      <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;font-weight:600">Notas</p>
      <p style="margin:0;font-size:13px;color:#374151">${factura.notas.replace(/\n/g, "<br>")}</p>
    </div>` : ""}

    <!-- Pie de página -->
    <div style="padding:12px 40px;background:#f8f9fb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;font-size:12px;font-weight:700;color:#1e3a5f;letter-spacing:.5px;text-transform:uppercase">
        LA FACTURA ES BENEFICIO DE TODOS EXÍJALA
      </p>
      <p style="margin:8px 0 0;font-size:10px;color:#9ca3af">
        ${EMPRESA.nombre} · RTN ${EMPRESA.rtn} · ${EMPRESA.correo} · Tel: ${EMPRESA.telefono}
      </p>
    </div>
  </div>
</body>
</html>`;
}
