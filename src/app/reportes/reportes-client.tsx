"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factura, Cliente } from "@/lib/types";
import { formatLempiras, formatFecha, MESES_CORTO, MESES_LARGO } from "@/lib/utils";
import { ArrowLeft, TrendingUp, CheckCircle, Clock, FileText } from "lucide-react";

const MESES_NOMBRES = MESES_LARGO;

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

export default function ReportesClient({ facturas, clientes }: { facturas: Factura[]; clientes: Cliente[] }) {
  const años = useMemo(() => {
    const set = new Set<number>();
    facturas.forEach((f) => set.add(new Date(f.fecha + "T00:00:00").getFullYear()));
    const arr = Array.from(set).sort((a, b) => b - a);
    if (!arr.length) arr.push(new Date().getFullYear());
    return arr;
  }, [facturas]);

  const [año, setAño] = useState<number>(años[0]);

  const activas = facturas.filter((f) => f.estado !== "anulada");

  // Datos mensuales para el año seleccionado
  const dataMensual = useMemo(() => MESES_CORTO.map((mes, i) => {
    const del = activas.filter((f) => {
      const d = new Date(f.fecha + "T00:00:00");
      return d.getFullYear() === año && d.getMonth() === i;
    });
    return {
      mes,
      mesNombre: MESES_NOMBRES[i],
      mesNum: i + 1,
      facturado: del.reduce((s, f) => s + f.total, 0),
      cobrado: del.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0),
      pendiente: del.filter((f) => f.estado === "emitida").reduce((s, f) => s + f.total, 0),
      count: del.length,
    };
  }), [activas, año]);

  const totalAño = dataMensual.reduce((s, m) => s + m.facturado, 0);
  const cobradoAño = dataMensual.reduce((s, m) => s + m.cobrado, 0);
  const pendienteAño = dataMensual.reduce((s, m) => s + m.pendiente, 0);

  // Reporte por cliente para el año
  const reporteClientes = useMemo(() => {
    const mapa: Record<string, { cliente: Cliente; total: number; cobrado: number; pendiente: number; count: number }> = {};
    activas
      .filter((f) => new Date(f.fecha + "T00:00:00").getFullYear() === año)
      .forEach((f) => {
        if (!mapa[f.clienteId]) {
          const cl = clientes.find((c) => c.id === f.clienteId) || f.cliente;
          mapa[f.clienteId] = { cliente: cl, total: 0, cobrado: 0, pendiente: 0, count: 0 };
        }
        mapa[f.clienteId].total += f.total;
        mapa[f.clienteId].count += 1;
        if (f.estado === "pagada") mapa[f.clienteId].cobrado += f.total;
        if (f.estado === "emitida") mapa[f.clienteId].pendiente += f.total;
      });
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [activas, clientes, año]);

  // Facturas del mes clickeado
  const [mesFiltro, setMesFiltro] = useState<number | null>(null);

  const facturasMes = useMemo(() => {
    if (mesFiltro === null) return [];
    return activas
      .filter((f) => {
        const d = new Date(f.fecha + "T00:00:00");
        return d.getFullYear() === año && d.getMonth() + 1 === mesFiltro;
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [activas, año, mesFiltro]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground text-sm">Ingresos por período y cliente</p>
        </div>
        <Select value={String(año)} onValueChange={(v) => { setAño(Number(v)); setMesFiltro(null); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {años.map((a) => (
              <SelectItem key={a} value={String(a)}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resumen del año */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Facturado {año}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono">{formatLempiras(totalAño)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Cobrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-green-400">{formatLempiras(cobradoAño)}</p>
            {totalAño > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((cobradoAño / totalAño) * 100)}% del total
              </p>
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
            <p className="text-xl font-bold font-mono text-yellow-400">{formatLempiras(pendienteAño)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica mensual — clic para ver facturas del mes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Ingresos mensuales {año}
            {mesFiltro && (
              <span className="ml-2 text-muted-foreground font-normal text-xs">
                — {MESES_NOMBRES[mesFiltro - 1]} seleccionado
                <button className="ml-2 underline" onClick={() => setMesFiltro(null)}>quitar filtro</button>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={dataMensual}
              barGap={4}
              onClick={(d) => { if (d?.activeLabel) { const m = dataMensual.find((x) => x.mes === d.activeLabel); if (m) setMesFiltro(m.mesNum); } }}
              style={{ cursor: "pointer" }}
            >
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="facturado" name="facturado" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {dataMensual.map((m, i) => (
                  <Cell key={i} fill={mesFiltro === m.mesNum ? "#6b7280" : "#374151"} />
                ))}
              </Bar>
              <Bar dataKey="cobrado" name="cobrado" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {dataMensual.map((m, i) => (
                  <Cell key={i} fill={mesFiltro === m.mesNum ? "#86efac" : "#4ade80"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#374151] inline-block" /> Facturado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Cobrado</span>
            <span className="text-xs opacity-60">Haz clic en un mes para ver sus facturas</span>
          </div>
        </CardContent>
      </Card>

      {/* Facturas del mes seleccionado */}
      {mesFiltro !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Facturas de {MESES_NOMBRES[mesFiltro - 1]} {año}
              <span className="ml-2 text-muted-foreground font-normal">({facturasMes.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {facturasMes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin facturas ese mes</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasMes.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/facturas/${f.id}`} className="hover:underline">{f.numero}</Link>
                      </TableCell>
                      <TableCell className="text-sm">{f.cliente.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.nombreProyecto || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatFecha(f.fecha)}</TableCell>
                      <TableCell>
                        <Badge variant={f.estado === "pagada" ? "outline" : f.estado === "anulada" ? "destructive" : f.estado === "emitida" ? "default" : "secondary"}>
                          {f.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatLempiras(f.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reporte por cliente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Por Cliente — {año}</CardTitle>
        </CardHeader>
        <CardContent>
          {reporteClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin facturas en {año}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Facturas</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                  <TableHead className="text-right">Cobrado</TableHead>
                  <TableHead className="text-right">Por Cobrar</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reporteClientes.map(({ cliente, total, cobrado, pendiente, count }) => {
                  const pct = total > 0 ? Math.round((cobrado / total) * 100) : 0;
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                          {cliente.nombre}
                        </Link>
                        {cliente.codigo && (
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{cliente.codigo}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{count}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatLempiras(total)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-400">{formatLempiras(cobrado)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-yellow-400">
                        {pendiente > 0 ? formatLempiras(pendiente) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tabla mensual detallada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detalle mensual — {año}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-center">Facturas</TableHead>
                <TableHead className="text-right">Facturado</TableHead>
                <TableHead className="text-right">Cobrado</TableHead>
                <TableHead className="text-right">Por Cobrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataMensual.filter((m) => m.count > 0).map((m) => (
                <TableRow
                  key={m.mes}
                  className={`cursor-pointer hover:bg-accent ${mesFiltro === m.mesNum ? "bg-accent" : ""}`}
                  onClick={() => setMesFiltro(mesFiltro === m.mesNum ? null : m.mesNum)}
                >
                  <TableCell className="font-medium">{m.mesNombre}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{m.count}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatLempiras(m.facturado)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-green-400">{formatLempiras(m.cobrado)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-yellow-400">
                    {m.pendiente > 0 ? formatLempiras(m.pendiente) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {dataMensual.every((m) => m.count === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin facturas en {año}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
