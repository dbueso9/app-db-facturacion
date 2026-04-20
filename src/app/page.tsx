"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFacturas } from "@/lib/store";
import { Factura, EstadoFactura } from "@/lib/types";
import { formatLempiras, formatFecha } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { FileText, Plus, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";

const BADGE_ESTADO: Record<EstadoFactura, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  emitida: { label: "Emitida", variant: "default" },
  pagada: { label: "Pagada", variant: "outline" },
  anulada: { label: "Anulada", variant: "destructive" },
};

export default function Dashboard() {
  const [facturas, setFacturas] = useState<Factura[]>([]);

  useEffect(() => {
    setFacturas(getFacturas().sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)));
  }, []);

  const activas = facturas.filter((f) => f.estado !== "anulada");
  const totalEmitido = activas.reduce((s, f) => s + f.total, 0);
  const totalPagado = activas.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0);
  const pendientes = activas.filter((f) => f.estado === "emitida").length;
  const usadas = activas.length;
  const totalRango = EMPRESA.secuenciaFin - EMPRESA.secuenciaInicio + 1;
  const restantes = totalRango - usadas;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Resumen de facturación — DB Consulting</p>
        </div>
        <Button render={<Link href="/facturas/nueva" />}>
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{pendientes}</p>
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
              {facturas.slice(0, 8).map((f) => {
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
                          {f.cliente.nombre} · {formatFecha(f.fecha)}
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
