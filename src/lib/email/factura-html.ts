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

export function generarHtmlFactura(factura: Factura): string {
  const lineas = factura.lineas
    .map(
      (l) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#374151">${l.descripcion}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#6b7280">${l.cantidad}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:monospace;color:#374151">${fmt(l.precioUnitario)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-family:monospace;font-weight:600;color:#111827">${fmt(l.subtotal)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Factura ${factura.numero}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:#111827;padding:32px 40px;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${EMPRESA.nombre}</h1>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px">${EMPRESA.direccion}</p>
        <p style="margin:2px 0 0;color:#9ca3af;font-size:13px">RTN: ${EMPRESA.rtn}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:1px">FACTURA</p>
        <p style="margin:4px 0 0;color:#9ca3af;font-family:monospace;font-size:13px">${factura.numero}</p>
        ${factura.nombreProyecto ? `<p style="margin:4px 0 0;color:#d1d5db;font-size:13px;font-weight:600">${factura.nombreProyecto}</p>` : ""}
      </div>
    </div>

    <!-- Fechas -->
    <div style="background:#f8fafc;padding:16px 40px;display:flex;gap:48px;border-bottom:1px solid #e5e7eb">
      <div>
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600">Fecha de Emisión</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:14px">${fecha(factura.fecha)}</p>
      </div>
      <div>
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600">Vencimiento</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:14px">${fecha(factura.fechaVencimiento)}</p>
      </div>
      ${factura.metodoPago ? `<div>
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600">Método de Pago</p>
        <p style="margin:2px 0 0;font-weight:600;font-size:14px">${METODO_LABEL[factura.metodoPago] || factura.metodoPago}</p>
      </div>` : ""}
    </div>

    <!-- Datos del cliente -->
    <div style="padding:24px 40px;border-bottom:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;font-weight:600">Facturar a</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Nombre / Razón Social</p>
          <p style="margin:2px 0 0;font-weight:700;font-size:15px">${factura.cliente.nombre}</p>
        </div>
        <div>
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">RTN</p>
          <p style="margin:2px 0 0;font-weight:700;font-size:15px;font-family:monospace">${factura.cliente.rtn || '<span style="color:#9ca3af;font-style:italic">Sin RTN</span>'}</p>
        </div>
        ${factura.cliente.direccion ? `<div style="grid-column:1/-1">
          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Dirección</p>
          <p style="margin:2px 0 0;font-size:14px">${factura.cliente.direccion}</p>
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
            <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#374151;font-weight:600;width:140px">Precio Unit.</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#374151;font-weight:600;width:140px">Subtotal</th>
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
          <span style="font-family:monospace">${fmt(factura.subtotal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px">
          <span style="color:#6b7280">ISV (15%)</span>
          <span style="font-family:monospace">${fmt(factura.isv)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:12px 16px;background:#111827;border-radius:8px;margin-top:4px">
          <span style="color:#fff;font-weight:700;font-size:15px">Total a Pagar</span>
          <span style="color:#fff;font-family:monospace;font-weight:700;font-size:15px">${fmt(factura.total)}</span>
        </div>
      </div>
    </div>

    <!-- Footer CAI -->
    <div style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:13px;font-weight:700;text-align:center;color:#111827;letter-spacing:.5px;text-transform:uppercase">
        LA FACTURA ES BENEFICIO DE TODOS EXÍJALA
      </p>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:11px;color:#9ca3af">
        <span><strong>CAI:</strong> ${EMPRESA.cai}</span>
        <span><strong>Límite:</strong> ${EMPRESA.fechaLimiteEmision}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:#9ca3af;font-family:monospace">
        <span>Rango: N.${EMPRESA.rangoDesde} al N.${EMPRESA.rangoHasta}</span>
        ${factura.tasaCambio ? `<span>Tasa BCH: L.${factura.tasaCambio.toFixed(4)}/USD</span>` : ""}
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
