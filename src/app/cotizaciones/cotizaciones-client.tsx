"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Cotizacion, EstadoCotizacion } from "@/lib/types";
import { formatDolares, formatFecha } from "@/lib/utils";
import { Plus, FileText, Search, CheckCircle } from "lucide-react";

const BADGE_ESTADO: Record<EstadoCotizacion, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  enviada: { label: "Enviada", variant: "default" },
  aceptada: { label: "Aceptada", variant: "outline" },
  rechazada: { label: "Rechazada", variant: "destructive" },
};

export default function CotizacionesClient({ cotizaciones }: { cotizaciones: Cotizacion[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = cotizaciones.filter((c) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      c.numero.toLowerCase().includes(q) ||
      c.cliente.nombre.toLowerCase().includes(q) ||
      (c.nombreProyecto?.toLowerCase().includes(q) ?? false)
    );
  });

  const totales = {
    todas: cotizaciones.length,
    aceptadas: cotizaciones.filter((c) => c.estado === "aceptada").length,
    enviadas: cotizaciones.filter((c) => c.estado === "enviada").length,
    montoAceptado: cotizaciones.filter((c) => c.estado === "aceptada").reduce((s, c) => s + c.total, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
          <p className="text-muted-foreground text-sm">Gestiona propuestas comerciales</p>
        </div>
        <Button render={<Link href="/cotizaciones/nueva" />}>
          <Plus className="h-4 w-4" />
          Nueva Cotización
        </Button>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold mt-1">{totales.todas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes</p>
            <p className="text-2xl font-bold mt-1 text-yellow-400">{totales.enviadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Monto Aceptado
            </p>
            <p className="text-2xl font-bold mt-1 font-mono text-green-400">{formatDolares(totales.montoAceptado)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente o proyecto..."
                className="pl-9"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">{busqueda ? "Sin resultados" : "No hay cotizaciones aún"}</p>
              {!busqueda && (
                <Button className="mt-4" size="sm" render={<Link href="/cotizaciones/nueva" />}>
                  Crear primera cotización
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtradas.map((c) => {
                const estado = BADGE_ESTADO[c.estado];
                return (
                  <Link
                    key={c.id}
                    href={`/cotizaciones/${c.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium font-mono">{c.numero}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.cliente.nombre}
                          {c.nombreProyecto && <span className="text-muted-foreground/70"> · {c.nombreProyecto}</span>}
                          {" · "}{formatFecha(c.fecha)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {c.convertidaAFacturaId && (
                        <span className="text-xs text-green-400 font-medium">→ Facturada</span>
                      )}
                      <Badge variant={estado.variant}>{estado.label}</Badge>
                      <span className="text-sm font-mono font-semibold w-28 text-right">{formatDolares(c.total)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
