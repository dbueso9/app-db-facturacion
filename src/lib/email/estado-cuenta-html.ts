import { Factura, Cliente } from "@/lib/types";
import { EMPRESA } from "@/lib/empresa";

function fmt(n: number): string {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 2 }).format(n);
}

function fecha(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("es-HN", { year: "numeric", month: "short", day: "numeric" });
}

const ESTADO_LABEL: Record<string, string> = {
  emitida: "Emitida",
  pagada: "Pagada",
  borrador: "Borrador",
  anulada: "Anulada",
};

const ESTADO_COLOR: Record<string, string> = {
  emitida: "#d97706",
  pagada: "#16a34a",
  borrador: "#6b7280",
  anulada: "#dc2626",
};

export function generarHtmlEstadoCuenta(cliente: Cliente, facturas: Factura[], corteAl?: string): string {
  const activas = facturas.filter((f) => f.estado !== "anulada");
  const totalFacturado = activas.reduce((s, f) => s + f.total, 0);
  const totalCobrado = activas.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0);
  const totalPendiente = activas.filter((f) => f.estado === "emitida").reduce((s, f) => s + f.total, 0);
  const hoy = corteAl || new Date().toISOString().split("T")[0];

  const filas = facturas
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(
      (f) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;color:#374151">${f.numero}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151">${fecha(f.fecha)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151">${f.nombreProyecto || "—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;font-size:12px;color:#111827;font-weight:600">${fmt(f.total)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center">
          <span style="background:${ESTADO_COLOR[f.estado] || "#6b7280"}18;color:${ESTADO_COLOR[f.estado] || "#6b7280"};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid ${ESTADO_COLOR[f.estado] || "#6b7280"}40">${ESTADO_LABEL[f.estado] || f.estado}</span>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estado de Cuenta — ${cliente.nombre}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827">
  <div style="max-width:700px;margin:28px auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">

    <!-- Header -->
    <div style="padding:28px 40px;border-bottom:3px solid #1e3a5f;display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <p style="margin:0;font-size:22px;font-weight:800;color:#1e3a5f">${EMPRESA.nombre}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">${EMPRESA.direccion}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#6b7280">RTN: ${EMPRESA.rtn} &nbsp;|&nbsp; ${EMPRESA.correo}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-size:24px;font-weight:800;color:#1e3a5f">ESTADO DE CUENTA</p>
        <p style="margin:6px 0 0;font-size:11px;color:#6b7280">Corte al: <strong style="color:#374151">${fecha(hoy)}</strong></p>
      </div>
    </div>

    <!-- Cliente -->
    <div style="padding:18px 40px;background:#f8f9fb;border-bottom:1px solid #e5e7eb">
      <p style="margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:600">Cliente</p>
      <p style="margin:0;font-weight:700;font-size:16px;color:#111827">${cliente.nombre}</p>
      ${cliente.rtn ? `<p style="margin:2px 0 0;font-family:monospace;font-size:12px;color:#374151">RTN: ${cliente.rtn}</p>` : ""}
      ${cliente.correo ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280">${cliente.correo}</p>` : ""}
      ${cliente.direccion ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280">${cliente.direccion}</p>` : ""}
    </div>

    <!-- Resumen -->
    <div style="padding:16px 40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;border-bottom:1px solid #e5e7eb">
      <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px 14px;text-align:center">
        <p style="margin:0;font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:600">Total Facturado</p>
        <p style="margin:4px 0 0;font-family:monospace;font-weight:700;font-size:14px;color:#111827">${fmt(totalFacturado)}</p>
      </div>
      <div style="border:1px solid #dcfce7;background:#f0fdf4;border-radius:6px;padding:10px 14px;text-align:center">
        <p style="margin:0;font-size:10px;text-transform:uppercase;color:#16a34a;font-weight:600">Total Cobrado</p>
        <p style="margin:4px 0 0;font-family:monospace;font-weight:700;font-size:14px;color:#16a34a">${fmt(totalCobrado)}</p>
      </div>
      <div style="border:1px solid #fef3c7;background:#fffbeb;border-radius:6px;padding:10px 14px;text-align:center">
        <p style="margin:0;font-size:10px;text-transform:uppercase;color:#d97706;font-weight:600">Saldo Pendiente</p>
        <p style="margin:4px 0 0;font-family:monospace;font-weight:700;font-size:14px;color:#d97706">${fmt(totalPendiente)}</p>
      </div>
    </div>

    <!-- Tabla de facturas -->
    <div style="padding:20px 40px 0">
      <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;font-weight:600">Detalle de Facturas (${facturas.length})</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:2px solid #1e3a5f">
            <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#1e3a5f;font-weight:700">N° Factura</th>
            <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#1e3a5f;font-weight:700">Fecha</th>
            <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;color:#1e3a5f;font-weight:700">Concepto</th>
            <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;color:#1e3a5f;font-weight:700;width:100px">Total</th>
            <th style="padding:7px 10px;text-align:center;font-size:10px;text-transform:uppercase;color:#1e3a5f;font-weight:700;width:80px">Estado</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>

    <!-- Saldo final -->
    <div style="padding:16px 40px 24px;display:flex;justify-content:flex-end">
      <div style="min-width:220px;border:2px solid #1e3a5f;border-radius:6px;padding:10px 14px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="color:#6b7280">Saldo pendiente de pago:</span>
          <span style="font-family:monospace;font-weight:700;color:#d97706">${fmt(totalPendiente)}</span>
        </div>
        <div style="border-top:1px solid #e5e7eb;padding-top:6px;margin-top:6px;display:flex;justify-content:space-between;font-size:14px">
          <span style="font-weight:700;color:#1e3a5f">Total Facturado:</span>
          <span style="font-family:monospace;font-weight:700;color:#1e3a5f">${fmt(totalFacturado)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:14px 40px;background:#f8f9fb;border-top:1px solid #e5e7eb;text-align:center">
      <p style="margin:0;font-size:11px;color:#9ca3af">
        ${EMPRESA.nombre} · RTN ${EMPRESA.rtn} · ${EMPRESA.correo} · Tel: ${EMPRESA.telefono}
      </p>
      <p style="margin:6px 0 0;font-size:10px;color:#d1d5db">Este estado de cuenta es solo informativo y está sujeto a verificación.</p>
    </div>
  </div>
</body>
</html>`;
}
