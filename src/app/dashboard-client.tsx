"use client";

import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factura, Contrato, EstadoFactura } from "@/lib/types";
import { formatLempiras, formatFecha } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { FileText, Plus, TrendingUp, Clock, CheckCircle, AlertCircle, BarChart2 } from "lucide-react";

const BADGE_ESTADO: Record<EstadoFactura, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  emitida: { label: "Emitida", variant: "default" },
  pagada: { label: "Pagada", variant: "outline" },
  anulada: { label: "Anulada", variant: "destructive" },
};

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function ultimos6Meses(facturas: Factura[]) {
  const hoy = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
    const año = d.getFullYear();
    const mes = d.getMonth();
    const del = facturas.filter((f) => {
      const fd = new Date(f.fecha + "T00:00:00");
      return fd.getFullYear() === año && fd.getMonth() === mes && f.estado !== "anulada";
    });
    return {
      mes: MESES[mes],
      facturado: del.reduce((s, f) => s + f.total, 0),
      cobrado: del.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0),
    };
  });
}

function topClientes(facturas: Factura[]) {
  const mapa: Record<string, { nombre: string; total: number; cobrado: number }> = {};
  facturas.filter((f) => f.estado !== "anulada").forEach((f) => {
    if (!mapa[f.clienteId]) mapa[f.clienteId] = { nombre: f.cliente.nombre, total: 0, cobrado: 0 };
    mapa[f.clienteId].total += f.total;
    if (f.estado === "pagada") mapa[f.clienteId].cobrado += f.total;
  });
  return Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 5);
}

const TIPO_COLOR: Record<string, string> = {
  mantenimiento: "bg-orange-500",
  hosting: "bg-blue-500",
  proyecto_app: "bg-purple-500",
  otro: "bg-gray-400",
};
const TIPO_LABEL: Record<string, string> = {
  mantenimiento: "Mantenimiento",
  hosting: "Hosting",
  proyecto_app: "Proyecto / App",
  otro: "Otro",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name === "facturado" ? "Facturado" : "Cobrado"}: <span className="font-mono font-semibold text-foreground">{formatLempiras(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardClient({ facturas, contratos }: { facturas: Factura[]; contratos: Contrato[] }) {
  const activas = facturas.filter((f) => f.estado !== "anulada");
  const totalEmitido = activas.reduce((s, f) => s + f.total, 0);
  const totalPagado = activas.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0);
  const totalPendiente = activas.filter((f) => f.estado === "emitida").reduce((s, f) => s + f.total, 0);
  const pendientesCount = activas.filter((f) => f.estado === "emitida").length;
  const usadas = activas.length;
  const totalRango = EMPRESA.secuenciaFin - EMPRESA.secuenciaInicio + 1;
  const restantes = totalRango - usadas;

  const dataMeses = ultimos6Meses(facturas);
  const clientes = topClientes(facturas);

  // Contratos activos por tipo
  const contratosActivos = contratos.filter((c) => c.activo);
  const porTipo = ["mantenimiento", "hosting", "proyecto_app", "otro"].map((tipo) => ({
    tipo,
    count: contratosActivos.filter((c) => c.tipo === tipo).length,
  })).filter((x) => x.count > 0);

  const pctCobrado = totalEmitido > 0 ? Math.round((totalPagado / totalEmitido) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Resumen de facturación — DB Consulting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/reportes" />}>
            <BarChart2 className="h-4 w-4" />
            Reportes
          </Button>
          <Button render={<Link href="/facturas/nueva" />}>
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Total Facturado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono">{formatLempiras(totalEmitido)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Cobrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-green-400">{formatLempiras(totalPagado)}</p>
            {totalEmitido > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{pctCobrado}% del total</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-yellow-400">{formatLempiras(totalPendiente)}</p>
            <p className="text-xs text-muted-foreground mt-1">{pendientesCount} factura(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> CAI Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {restantes}{" "}
              <span className="text-sm font-normal text-muted-foreground">facturas</span>
            </p>
            {restantes <= 10 && (
              <p className="text-xs text-destructive mt-1">Rango casi agotado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfica ingresos últimos 6 meses + contratos por tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ingresos — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dataMeses} barGap={4}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="facturado" name="facturado" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {dataMeses.map((_, i) => (
                    <Cell key={i} fill="#374151" />
                  ))}
                </Bar>
                <Bar dataKey="cobrado" name="cobrado" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {dataMeses.map((_, i) => (
                    <Cell key={i} fill="#4ade80" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#374151] inline-block" /> Facturado</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Cobrado</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contratos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            {contratosActivos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin contratos activos</p>
            ) : (
              <div className="space-y-3 mt-1">
                <p className="text-3xl font-bold">{contratosActivos.length}</p>
                <div className="space-y-2">
                  {porTipo.map(({ tipo, count }) => (
                    <div key={tipo} className="flex items-center gap-2 text-sm">
                      <span className={`w-2.5 h-2.5 rounded-full ${TIPO_COLOR[tipo]}`} />
                      <span className="flex-1 text-muted-foreground">{TIPO_LABEL[tipo]}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top clientes + barra cobrado/pendiente */}
      {clientes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm">Top Clientes por Facturación</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/reportes" />}>Ver reporte completo</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientes.map((c) => {
                const pct = c.total > 0 ? Math.round((c.cobrado / c.total) * 100) : 0;
                return (
                  <div key={c.nombre}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium truncate max-w-[200px]">{c.nombre}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-muted-foreground text-xs">{pct}% cobrado</span>
                        <span className="font-mono font-semibold">{formatLempiras(c.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facturas recientes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Facturas Recientes</CardTitle>
          <Button variant="ghost" size="sm" render={<Link href="/facturas" />}>
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          {facturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No hay facturas aún</p>
              <Button className="mt-4" size="sm" render={<Link href="/facturas/nueva" />}>
                Crear primera factura
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {facturas.slice(0, 6).map((f) => {
                const estado = BADGE_ESTADO[f.estado];
                return (
                  <Link
                    key={f.id}
                    href={`/facturas/${f.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium font-mono">{f.numero}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.cliente.nombre}{f.nombreProyecto ? ` · ${f.nombreProyecto}` : ""} · {formatFecha(f.fecha)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={estado.variant}>{estado.label}</Badge>
                      <span className="text-sm font-mono font-semibold">{formatLempiras(f.total)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CAI info */}
      <Card className="border-muted-foreground/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">Información CAI Activo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <p className="text-muted-foreground mb-1">CAI</p>
            <p className="text-foreground">{EMPRESA.cai}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Rango Autorizado</p>
            <p className="text-foreground">N.{EMPRESA.rangoDesde} AL N.{EMPRESA.rangoHasta}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Fecha Límite de Emisión</p>
            <p className="text-foreground">{EMPRESA.fechaLimiteEmision}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
