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
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No hay facturas</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente / Proyecto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginadas.map((f) => {
                    const estado = BADGE_ESTADO[f.estado];
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-sm">{f.numero}</TableCell>
                        <TableCell>
                          <p className="font-medium">{f.cliente.nombre}</p>
                          {f.nombreProyecto && (
                            <p className="text-xs text-muted-foreground">{f.nombreProyecto}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatFecha(f.fecha)}</TableCell>
                        <TableCell>
                          <Badge variant={estado.variant}>{estado.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatLempiras(f.total)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" render={<Link href={`/facturas/${f.id}`} />}>
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
