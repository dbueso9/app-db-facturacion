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

function rowSAR(label: string, val: number, opts?: { bold?: boolean; red?: boolean; navy?: boolean }): string {
  if (opts?.navy) {
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e3a5f;border-radius:6px;margin-top:8px">
      <span style="color:#fff;font-weight:800;font-size:14px;letter-spacing:.3px">${label}</span>
      <span style="color:#fff;font-family:monospace;font-weight:900;font-size:14px">${fmt(val)}</span>
    </div>`;
  }
  const color = opts?.red ? "#dc2626" : opts?.bold ? "#0f172a" : "#374151";
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 2px;border-bottom:1px solid #f1f5f9;font-size:12.5px">
    <span style="color:${opts?.bold ? "#0f172a" : "#6b7280"}">${label}</span>
    <span style="font-family:monospace;color:${color};font-weight:${opts?.bold ? "700" : "400"}">${fmt(val)}</span>
  </div>`;
}

/** Retorna solo el <div> del documento — usar en vista de pantalla con dangerouslySetInnerHTML */
export function generarBodyFactura(factura: Factura, logoUrl?: string): string {
  const descuento = factura.descuento ?? 0;
  const gravado = factura.subtotal - descuento;

  const proyectoFila = factura.nombreProyecto ? `
      <tr style="background:#eef2f7">
        <td style="padding:7px 12px 7px 16px;font-size:12.5px;font-weight:700;color:#1e3a5f;border-bottom:1px solid #e2e8f0;font-style:italic">${factura.nombreProyecto}</td>
        <td colspan="3" style="border-bottom:1px solid #e2e8f0;background:#eef2f7"></td>
      </tr>` : "";

  const lineas = factura.lineas.map((l) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px">${l.descripcion}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#374151;font-size:13px">${l.cantidad}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;color:#0f172a;font-size:13px">${fmt(l.precioUnitario)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:700;color:#0f172a;font-size:13px">${fmt(l.subtotal)}</td>
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
      <p style="margin:0;font-size:32px;font-weight:900;color:#1e3a5f;letter-spacing:2px;line-height:1">FACTURA</p>
      <p style="margin:5px 0 0;font-family:monospace;font-size:14px;color:#0f172a;font-weight:700">${factura.numero}</p>
      ${factura.nombreProyecto ? `<p style="margin:4px 0 0;font-size:11px;color:#6b7280;font-style:italic">${factura.nombreProyecto}</p>` : ""}
    </div>
  </div>

  <!-- BANDA SAR -->
  <div style="padding:7px 36px;background:#eef2f7;border-bottom:1px solid #e2e8f0">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 32px;font-size:10.5px;color:#374151">
      <div><strong style="color:#0f172a">CAI:</strong> <span style="font-family:monospace">${EMPRESA.cai}</span></div>
      <div><strong style="color:#0f172a">Fecha Límite Emisión:</strong> ${EMPRESA.fechaLimiteEmision}</div>
      <div><strong style="color:#0f172a">Rango Desde:</strong> <span style="font-family:monospace">N.${EMPRESA.rangoDesde}</span></div>
      <div><strong style="color:#0f172a">Rango Hasta:</strong> <span style="font-family:monospace">N.${EMPRESA.rangoHasta}</span></div>
    </div>
  </div>

  <!-- CLIENTE + FECHAS -->
  <div style="padding:14px 36px;display:grid;grid-template-columns:1fr 1fr;gap:16px;border-bottom:1px solid #e2e8f0">
    <div>
      <p style="margin:0 0 5px;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Facturar a</p>
      <p style="margin:0;font-weight:700;font-size:15px;color:#0f172a;line-height:1.3">${factura.cliente.nombre}</p>
      <p style="margin:3px 0 0;font-family:monospace;font-size:12px;color:#374151;font-weight:600">RTN: ${factura.cliente.rtn || "—"}</p>
      ${factura.cliente.direccion ? `<p style="margin:3px 0 0;font-size:11.5px;color:#374151">${factura.cliente.direccion}</p>` : ""}
      ${factura.cliente.correo ? `<p style="margin:3px 0 0;font-size:11.5px;color:#374151">${factura.cliente.correo}</p>` : ""}
      ${factura.cliente.telefono ? `<p style="margin:3px 0 0;font-size:11.5px;color:#374151">${factura.cliente.telefono}</p>` : ""}
      ${!factura.cliente.rtn ? `<p style="margin:8px 0 0;font-size:10px;color:#b91c1c;font-weight:600;font-style:italic">La factura sin RTN no genera crédito fiscal</p>` : ""}
    </div>
    <div style="text-align:right">
      <div style="margin-bottom:7px">
        <p style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Fecha de Emisión</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:13px;color:#0f172a">${fecha(factura.fecha)}</p>
      </div>
      <div style="margin-bottom:7px">
        <p style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Vencimiento</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:13px;color:#0f172a">${fecha(factura.fechaVencimiento)}</p>
      </div>
      ${factura.metodoPago ? `
      <div style="margin-bottom:7px">
        <p style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Método de Pago</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:13px;color:#0f172a">${METODO_LABEL[factura.metodoPago] || factura.metodoPago}</p>
      </div>` : ""}
      ${factura.condicionPago ? `
      <div>
        <p style="margin:0;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Condición de Pago</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:13px;color:#0f172a">${factura.condicionPago} días</p>
      </div>` : ""}
    </div>
  </div>

  <!-- TABLA DE SERVICIOS -->
  <div style="padding:16px 36px 0">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#1e3a5f">
          <th style="padding:9px 12px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#fff;font-weight:700">Descripción del Servicio</th>
          <th style="padding:9px 12px;text-align:center;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#fff;font-weight:700;width:52px">Cant.</th>
          <th style="padding:9px 12px;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#fff;font-weight:700;width:140px">Precio Unit.</th>
          <th style="padding:9px 12px;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px;color:#fff;font-weight:700;width:140px">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${proyectoFila}
        ${lineas}
        ${ultimaFila}
      </tbody>
    </table>
  </div>

  <!-- ESPACIADOR FLEX — empuja totales al fondo -->
  <div style="flex:1;min-height:20px"></div>

  <!-- NOTAS -->
  ${factura.notas ? `
  <div style="padding:8px 36px;border-top:1px solid #e2e8f0">
    <p style="margin:0 0 3px;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Notas</p>
    <p style="margin:0;font-size:12px;color:#374151;line-height:1.6">${factura.notas.replace(/\n/g, "<br>")}</p>
  </div>` : ""}

  <!-- DATOS BANCARIOS + TOTALES SAR -->
  <div style="padding:16px 36px 20px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-top:2px solid #e2e8f0">

    <!-- Banco -->
    <div style="border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 16px;font-size:12px;min-width:200px;background:#f8fafc">
      <p style="margin:0 0 8px;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700">Datos Bancarios</p>
      <p style="margin:0;font-weight:700;font-size:14px;color:#0f172a">${EMPRESA.banco.nombre}</p>
      <p style="margin:4px 0 2px;font-size:12px;color:#374151">N.° de Cuenta: <strong style="color:#0f172a">${EMPRESA.banco.cuenta}</strong></p>
      <p style="margin:0;font-size:12px;color:#374151">Tipo de Cuenta: ${EMPRESA.banco.tipo}</p>
    </div>

    <!-- Totales SAR -->
    <div style="min-width:268px">
      ${rowSAR("Subtotal", factura.subtotal)}
      ${descuento > 0 ? rowSAR("Descuento", descuento, { red: true }) : rowSAR("Descuento", 0)}
      ${rowSAR("Impt. Exento", 0)}
      ${rowSAR("Impt. Gravado", gravado, { bold: true })}
      ${rowSAR("Impt. Exonerado", 0)}
      ${rowSAR("Impuesto 15%", factura.isv, { bold: true })}
      ${rowSAR("Total a Pagar", factura.total, { navy: true })}
      ${factura.tasaCambio ? `<p style="margin:5px 0 0;font-size:10px;text-align:right;color:#6b7280">Tasa de cambio BCH: L.${factura.tasaCambio.toFixed(4)} / USD</p>` : ""}
    </div>
  </div>

  <!-- PIE DE PÁGINA -->
  <div style="padding:11px 36px;background:#eef2f7;border-top:2px solid #1e3a5f;text-align:center">
    <p style="margin:0;font-size:11.5px;font-weight:800;color:#1e3a5f;letter-spacing:.6px;text-transform:uppercase">
      LA FACTURA ES BENEFICIO DE TODOS EXÍJALA
    </p>
    <p style="margin:4px 0 0;font-size:10px;color:#374151">
      ${EMPRESA.nombre} &nbsp;·&nbsp; RTN ${EMPRESA.rtn} &nbsp;·&nbsp; ${EMPRESA.correo} &nbsp;·&nbsp; Tel: ${EMPRESA.telefono}
    </p>
    <p style="margin:3px 0 0;font-size:10px;color:#6b7280">
      Sistema de Facturación desarrollado por DB Consulting © 2025
    </p>
  </div>

</div>`;
}

/** Retorna un documento HTML completo para correo electrónico y PDF */
export function generarHtmlFactura(factura: Factura, logoUrl?: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Factura ${factura.numero}</title>
</head>
<body style="margin:0;padding:24px;background:#dde3ea;font-family:Arial,Helvetica,sans-serif">
  ${generarBodyFactura(factura, logoUrl)}
</body>
</html>`;
}
