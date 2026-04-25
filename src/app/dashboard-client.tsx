"use client";

import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factura, Contrato, EstadoFactura } from "@/lib/types";
import { formatLempiras, formatFecha, MESES_CORTO } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import {
  FileText, Plus, TrendingUp, Clock, CheckCircle, AlertCircle,
  BarChart2, ArrowRight, CalendarDays, Shield,
} from "lucide-react";

const BADGE_ESTADO: Record<EstadoFactura, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  emitida: { label: "Emitida", variant: "default" },
  pagada: { label: "Pagada", variant: "outline" },
  anulada: { label: "Anulada", variant: "destructive" },
};

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
      mes: MESES_CORTO[mes],
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
  soporte: "bg-teal-500",
  proyecto_app: "bg-purple-500",
  otro: "bg-gray-400",
};
const TIPO_LABEL: Record<string, string> = {
  mantenimiento: "Mantenimiento",
  hosting: "Hosting",
  soporte: "Soporte Técnico",
  proyecto_app: "Proyecto / App",
  otro: "Otro",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name === "facturado" ? "Facturado" : "Cobrado"}:{" "}
          <span className="font-mono font-semibold text-foreground">{formatLempiras(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const fechaHoy = new Date().toLocaleDateString("es-HN", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

export default function DashboardClient({ facturas, contratos }: { facturas: Factura[]; contratos: Contrato[] }) {
  const activas = facturas.filter((f) => f.estado !== "anulada");
  const totalEmitido = activas.reduce((s, f) => s + f.total, 0);
  const totalPagado = activas.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0);
  const totalPendiente = activas.filter((f) => f.estado === "emitida").reduce((s, f) => s + f.total, 0);
  const pendientesCount = activas.filter((f) => f.estado === "emitida").length;
  const usadas = activas.length;
  const totalRango = EMPRESA.secuenciaFin - EMPRESA.secuenciaInicio + 1;
  const restantes = totalRango - usadas;
  const pctCai = Math.round(((totalRango - restantes) / totalRango) * 100);

  const dataMeses = ultimos6Meses(facturas);
  const clientes = topClientes(facturas);

  const contratosActivos = contratos.filter((c) => c.activo);
  const porTipo = ["mantenimiento", "hosting", "soporte", "proyecto_app", "otro"].map((tipo) => ({
    tipo,
    count: contratosActivos.filter((c) => c.tipo === tipo).length,
  })).filter((x) => x.count > 0);

  const pctCobrado = totalEmitido > 0 ? Math.round((totalPagado / totalEmitido) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5 capitalize">{fechaHoy}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link href="/reportes" />}>
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Reportes</span>
          </Button>
          <Button size="sm" render={<Link href="/facturas/nueva" />}>
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <Card className="border-l-4 border-l-blue-500/70 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/15 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
              </span>
              Total Facturado
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xl font-bold font-mono">{formatLempiras(totalEmitido)}</p>
            <p className="text-xs text-muted-foreground mt-1">{activas.length} factura{activas.length !== 1 ? "s" : ""} activa{activas.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        {/* Cobrado */}
        <Card className="border-l-4 border-l-green-500/70 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-green-500/15 shrink-0">
                <CheckCircle className="h-3.5 w-3.5 text-green-400" />
              </span>
              Cobrado
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xl font-bold font-mono text-green-400">{formatLempiras(totalPagado)}</p>
            {totalEmitido > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{pctCobrado}% del total</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: `${pctCobrado}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por Cobrar */}
        <Card className="border-l-4 border-l-amber-500/70 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/15 shrink-0">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
              </span>
              Por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xl font-bold font-mono text-amber-400">{formatLempiras(totalPendiente)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendientesCount} factura{pendientesCount !== 1 ? "s" : ""} pendiente{pendientesCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* CAI Disponible */}
        <Card className={`border-l-4 hover:shadow-md transition-shadow ${restantes <= 10 ? "border-l-red-500/70" : "border-l-violet-500/70"}`}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <span className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 ${restantes <= 10 ? "bg-red-500/15" : "bg-violet-500/15"}`}>
                <Shield className={`h-3.5 w-3.5 ${restantes <= 10 ? "text-red-400" : "text-violet-400"}`} />
              </span>
              CAI Disponible
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-xl font-bold">
              {restantes}{" "}
              <span className="text-sm font-normal text-muted-foreground">facturas</span>
            </p>
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${restantes <= 10 ? "bg-red-400" : "bg-violet-400"}`}
                  style={{ width: `${100 - pctCai}%` }}
                />
              </div>
              {restantes <= 10 && (
                <p className="text-xs text-destructive mt-1 font-medium">Rango casi agotado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica + Contratos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Ingresos — últimos 6 meses
              </CardTitle>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#374151] inline-block border border-border" />
                  Facturado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />
                  Cobrado
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dataMeses} barGap={4} barCategoryGap="30%">
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="facturado" name="facturado" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {dataMeses.map((_, i) => (
                    <Cell key={i} fill="#374151" />
                  ))}
                </Bar>
                <Bar dataKey="cobrado" name="cobrado" radius={[4, 4, 0, 0]} maxBarSize={32}>
                  {dataMeses.map((_, i) => (
                    <Cell key={i} fill="#4ade80" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Contratos Activos</CardTitle>
              <span className="text-2xl font-bold text-primary">{contratosActivos.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            {contratosActivos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <p className="text-sm">Sin contratos activos</p>
                <Button variant="outline" size="sm" className="mt-3" render={<Link href="/contratos" />}>
                  Ver contratos
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {porTipo.map(({ tipo, count }) => (
                  <div key={tipo} className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${TIPO_COLOR[tipo] ?? "bg-gray-400"}`} />
                    <span className="flex-1 text-sm text-muted-foreground">{TIPO_LABEL[tipo] ?? tipo}</span>
                    <span className="text-sm font-semibold tabular-nums">{count}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full text-xs h-7" render={<Link href="/contratos" />}>
                    Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top clientes */}
      {clientes.length > 0 && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Top Clientes por Facturación</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" render={<Link href="/reportes" />}>
              Ver reporte <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientes.map((c, idx) => {
                const pct = c.total > 0 ? Math.round((c.cobrado / c.total) * 100) : 0;
                return (
                  <div key={c.nombre}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium truncate">{c.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-muted-foreground text-xs hidden sm:inline">{pct}% cobrado</span>
                        <span className="font-mono font-semibold text-xs">{formatLempiras(c.total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-green-400/80 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facturas recientes */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Facturas Recientes</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" render={<Link href="/facturas" />}>
            Ver todas <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {facturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium">No hay facturas aún</p>
              <p className="text-xs mt-1 text-muted-foreground/70">Crea tu primera factura para comenzar</p>
              <Button className="mt-4" size="sm" render={<Link href="/facturas/nueva" />}>
                <Plus className="h-4 w-4" />
                Crear primera factura
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {facturas.slice(0, 6).map((f) => {
                const estado = BADGE_ESTADO[f.estado];
                return (
                  <Link
                    key={f.id}
                    href={`/facturas/${f.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-background transition-colors">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold font-mono">{f.numero}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.cliente.nombre}{f.nombreProyecto ? ` · ${f.nombreProyecto}` : ""} · {formatFecha(f.fecha)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <Badge variant={estado.variant} className="text-xs">{estado.label}</Badge>
                      <span className="text-sm font-mono font-semibold hidden sm:inline">{formatLempiras(f.total)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CAI Info */}
      <Card className="border-border/50 bg-card/50 hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            Información CAI Activo
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground/70 mb-1 uppercase tracking-wide text-[10px] font-semibold">CAI</p>
            <p className="font-mono text-foreground">{EMPRESA.cai}</p>
          </div>
          <div>
            <p className="text-muted-foreground/70 mb-1 uppercase tracking-wide text-[10px] font-semibold">Rango Autorizado</p>
            <p className="font-mono text-foreground">N.{EMPRESA.rangoDesde} — N.{EMPRESA.rangoHasta}</p>
          </div>
          <div>
            <p className="text-muted-foreground/70 mb-1 uppercase tracking-wide text-[10px] font-semibold">Fecha Límite de Emisión</p>
            <p className="font-mono text-foreground">{EMPRESA.fechaLimiteEmision}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
