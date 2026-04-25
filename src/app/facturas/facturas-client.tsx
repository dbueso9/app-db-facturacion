"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Factura, EstadoFactura } from "@/lib/types";
import { formatLempiras, formatFecha } from "@/lib/utils";
import { Plus, Search, FileText, Eye, ChevronLeft, ChevronRight } from "lucide-react";

const BADGE_ESTADO: Record<EstadoFactura, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  emitida: { label: "Emitida", variant: "default" },
  pagada: { label: "Pagada", variant: "outline" },
  anulada: { label: "Anulada", variant: "destructive" },
};

const POR_PAGINA = 10;

export default function FacturasClient({ initialFacturas }: { initialFacturas: Factura[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pagina, setPagina] = useState(1);

  const filtradas = initialFacturas.filter((f) => {
    const matchBusqueda =
      busqueda === "" ||
      f.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.cliente.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === "todos" || f.estado === filtroEstado;
    const matchDesde = fechaDesde === "" || f.fecha >= fechaDesde;
    const matchHasta = fechaHasta === "" || f.fecha <= fechaHasta;
    return matchBusqueda && matchEstado && matchDesde && matchHasta;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const paginadas = filtradas.slice(inicio, inicio + POR_PAGINA);

  function cambiarFiltro(fn: () => void) {
    fn();
    setPagina(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-muted-foreground text-sm">{initialFacturas.length} facturas en total</p>
        </div>
        <Button render={<Link href="/facturas/nueva" />}>
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número o cliente..."
                  className="pl-10"
                  value={busqueda}
                  onChange={(e) => cambiarFiltro(() => setBusqueda(e.target.value))}
                />
              </div>
              <Select value={filtroEstado} onValueChange={(v) => v && cambiarFiltro(() => setFiltroEstado(v))}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                  <SelectItem value="anulada">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => cambiarFiltro(() => setFechaDesde(e.target.value))}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => cambiarFiltro(() => setFechaHasta(e.target.value))}
                  className="w-40"
                />
              </div>
              {(fechaDesde || fechaHasta) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cambiarFiltro(() => { setFechaDesde(""); setFechaHasta(""); })}
                >
                  Limpiar fechas
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paginadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium">No se encontraron facturas</p>
              <p className="text-xs mt-1 text-muted-foreground/70">
                {busqueda || filtroEstado !== "todos" ? "Prueba ajustando los filtros" : "Crea tu primera factura"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-32">Número</TableHead>
                    <TableHead>Cliente / Proyecto</TableHead>
                    <TableHead className="w-32">Fecha</TableHead>
                    <TableHead className="w-28">Estado</TableHead>
                    <TableHead className="text-right w-36">Total (L)</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginadas.map((f) => {
                    const estado = BADGE_ESTADO[f.estado];
                    const rowColor = f.estado === "pagada"
                      ? "border-l-green-500/50"
                      : f.estado === "emitida"
                      ? "border-l-blue-500/50"
                      : f.estado === "anulada"
                      ? "border-l-red-500/50 opacity-60"
                      : "border-l-transparent";
                    return (
                      <TableRow key={f.id} className={`border-l-2 ${rowColor} hover:bg-accent/60 transition-colors`}>
                        <TableCell className="font-mono text-sm font-semibold">{f.numero}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{f.cliente.nombre}</p>
                          {f.nombreProyecto && (
                            <p className="text-xs text-muted-foreground mt-0.5">{f.nombreProyecto}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatFecha(f.fecha)}</TableCell>
                        <TableCell>
                          <Badge variant={estado.variant} className="text-xs">{estado.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-sm">{formatLempiras(f.total)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" render={<Link href={`/facturas/${f.id}`} />}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <span>
                    Mostrando {inicio + 1}–{Math.min(inicio + POR_PAGINA, filtradas.length)} de {filtradas.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2">
                      {paginaActual} / {totalPaginas}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
