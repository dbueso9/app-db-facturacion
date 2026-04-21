"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { updateEstadoCotizacion, deleteCotizacion, marcarConvertida } from "@/lib/actions/cotizaciones";
import { crearNumeroFactura, saveFactura } from "@/lib/actions/facturas";
import { Cotizacion, EstadoCotizacion, Factura } from "@/lib/types";
import { TasaCambio } from "@/lib/actions/tasa-cambio";
import { formatDolares, formatLempiras, formatFecha, generarId } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { ArrowLeft, Pencil, Trash2, Zap, FileText, AlertCircle } from "lucide-react";

const BADGE_ESTADO: Record<EstadoCotizacion, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  enviada: { label: "Enviada", variant: "default" },
  aceptada: { label: "Aceptada", variant: "outline" },
  rechazada: { label: "Rechazada", variant: "destructive" },
};

const ESTADOS_DISPONIBLES: EstadoCotizacion[] = ["borrador", "enviada", "aceptada", "rechazada"];

interface Props {
  cotizacion: Cotizacion;
  tasaCambio: TasaCambio | null;
}

export default function CotizacionDetalleClient({ cotizacion, tasaCambio }: Props) {
  const router = useRouter();
  const [estadoActual, setEstadoActual] = useState<EstadoCotizacion>(cotizacion.estado);
  const [cambiando, setCambiando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [confirmandoConvertir, setConfirmandoConvertir] = useState(false);
  const [errorConversion, setErrorConversion] = useState<string | null>(null);

  const estado = BADGE_ESTADO[estadoActual];
  const yaConvertida = !!cotizacion.convertidaAFacturaId;
  const tasa = tasaCambio?.venta || 1;

  // Previsualizar montos en LPS para la conversión
  const montoLPS = formatLempiras(cotizacion.total * tasa);

  async function cambiarEstado(nuevoEstado: string | null) {
    if (!nuevoEstado || nuevoEstado === estadoActual) return;
    setCambiando(true);
    try {
      await updateEstadoCotizacion(cotizacion.id, nuevoEstado as EstadoCotizacion);
      setEstadoActual(nuevoEstado as EstadoCotizacion);
    } finally {
      setCambiando(false);
    }
  }

  async function eliminar() {
    setEliminando(true);
    try {
      await deleteCotizacion(cotizacion.id);
      router.push("/cotizaciones");
    } finally {
      setEliminando(false);
    }
  }

  async function convertirAFactura() {
    setConvirtiendo(true);
    setErrorConversion(null);
    try {
      const { secuencia, numero } = await crearNumeroFactura();

      // Convertir precios de USD a LPS con la tasa de cambio vigente
      const lineas = cotizacion.lineas.map((l) => {
        const precioLPS = Number((l.precioUnitario * tasa).toFixed(2));
        const subtotalLPS = Number((l.cantidad * precioLPS).toFixed(2));
        return {
          id: generarId(),
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          precioUnitario: precioLPS,
          subtotal: subtotalLPS,
        };
      });

      const sub = Number(lineas.reduce((s, l) => s + l.subtotal, 0).toFixed(2));
      const isvCalc = Number((sub * EMPRESA.isv).toFixed(2));

      const factura: Factura = {
        id: generarId(),
        numero,
        secuencia,
        fecha: new Date().toISOString().split("T")[0],
        fechaVencimiento: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        clienteId: cotizacion.clienteId,
        cliente: cotizacion.cliente,
        lineas,
        subtotal: sub,
        isv: isvCalc,
        total: sub + isvCalc,
        estado: "emitida",
        condicionPago: 30,
        tasaCambio: tasaCambio?.venta,
        nombreProyecto: cotizacion.nombreProyecto,
        notas: cotizacion.notas,
        creadaEn: new Date().toISOString(),
      };

      await saveFactura(factura);
      await marcarConvertida(cotizacion.id, factura.id);
      router.push(`/facturas/${factura.id}`);
    } catch (err) {
      setErrorConversion(err instanceof Error ? err.message : "Error al convertir la cotización");
      setConvirtiendo(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono">{cotizacion.numero}</h1>
            <Badge variant={estado.variant}>{estado.label}</Badge>
            {yaConvertida && (
              <Link href={`/facturas/${cotizacion.convertidaAFacturaId}`}>
                <Badge variant="outline" className="text-green-400 border-green-400 cursor-pointer hover:bg-green-400/10">
                  <FileText className="h-3 w-3 mr-1" />
                  Ver Factura
                </Badge>
              </Link>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {cotizacion.cliente.nombre} · Válida hasta {formatFecha(cotizacion.fechaValidez)}
            {cotizacion.nombreProyecto && <span> · {cotizacion.nombreProyecto}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Select value={estadoActual} onValueChange={cambiarEstado} disabled={cambiando || yaConvertida}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_DISPONIBLES.map((e) => (
                <SelectItem key={e} value={e}>{BADGE_ESTADO[e].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!yaConvertida && estadoActual !== "rechazada" && (
            <Button onClick={() => { setConfirmandoConvertir(true); setErrorConversion(null); }} disabled={convirtiendo}>
              <Zap className="h-4 w-4 mr-1" />
              Convertir en Factura
            </Button>
          )}

          {estadoActual === "borrador" && !yaConvertida && (
            <Button variant="outline" size="icon" render={<Link href={`/cotizaciones/${cotizacion.id}/editar`} />}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={() => setConfirmandoEliminar(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Error de conversión */}
      {errorConversion && (
        <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorConversion}</span>
        </div>
      )}

      {/* Documento */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">De</p>
              <p className="font-bold text-lg">{EMPRESA.nombre}</p>
              <p className="text-sm text-muted-foreground">{EMPRESA.direccion}</p>
              <p className="text-sm text-muted-foreground">{EMPRESA.correo}</p>
              <p className="text-sm text-muted-foreground font-mono">RTN: {EMPRESA.rtn}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Para</p>
              <p className="font-bold text-lg">{cotizacion.cliente.nombre}</p>
              {cotizacion.cliente.rtn && <p className="text-sm font-mono text-muted-foreground">RTN: {cotizacion.cliente.rtn}</p>}
              {cotizacion.cliente.direccion && <p className="text-sm text-muted-foreground">{cotizacion.cliente.direccion}</p>}
              {cotizacion.cliente.correo && <p className="text-sm text-muted-foreground">{cotizacion.cliente.correo}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm bg-muted/40 rounded-lg p-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Número</p>
              <p className="font-mono font-semibold mt-1">{cotizacion.numero}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha</p>
              <p className="font-semibold mt-1">{formatFecha(cotizacion.fecha)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Válida hasta</p>
              <p className="font-semibold mt-1">{formatFecha(cotizacion.fechaValidez)}</p>
            </div>
          </div>

          {cotizacion.nombreProyecto && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Proyecto</p>
              <p className="font-semibold mt-1">{cotizacion.nombreProyecto}</p>
            </div>
          )}

          <Separator />

          <div>
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground uppercase tracking-wide pb-2 border-b">
              <span className="col-span-6">Descripción</span>
              <span className="col-span-2 text-center">Cant.</span>
              <span className="col-span-2 text-right">Precio Unit. (USD)</span>
              <span className="col-span-2 text-right">Subtotal (USD)</span>
            </div>
            {cotizacion.lineas.map((l) => (
              <div key={l.id} className="grid grid-cols-12 gap-2 py-3 border-b border-muted text-sm">
                <span className="col-span-6">{l.descripcion}</span>
                <span className="col-span-2 text-center text-muted-foreground">{l.cantidad}</span>
                <span className="col-span-2 text-right font-mono">{formatDolares(l.precioUnitario)}</span>
                <span className="col-span-2 text-right font-mono font-semibold">{formatDolares(l.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono w-32 text-right">{formatDolares(cotizacion.subtotal)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-muted-foreground">ISV (15%)</span>
              <span className="font-mono w-32 text-right">{formatDolares(cotizacion.isv)}</span>
            </div>
            <Separator className="w-48 my-1" />
            <div className="flex gap-8 text-base">
              <span className="font-bold">Total</span>
              <span className="font-mono font-bold w-32 text-right border-2 border-foreground px-2 py-0.5 rounded">{formatDolares(cotizacion.total)}</span>
            </div>
            {tasaCambio && (
              <p className="text-xs text-muted-foreground mt-1">
                Equivalente aprox. <span className="font-medium text-foreground">{montoLPS}</span> · Tasa BCH venta L.{tasaCambio.venta.toFixed(4)}
              </p>
            )}
          </div>

          {cotizacion.notas && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{cotizacion.notas}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog convertir */}
      <Dialog open={confirmandoConvertir} onOpenChange={setConfirmandoConvertir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir en Factura</DialogTitle>
            <DialogDescription>
              Se creará una factura emitida con los precios convertidos de USD a Lempiras usando la tasa BCH vigente.
              {tasaCambio ? (
                <span className="block mt-2 font-medium text-foreground">
                  Tasa venta: L.{tasaCambio.venta.toFixed(4)} · Total factura: {montoLPS}
                </span>
              ) : (
                <span className="block mt-2 text-yellow-400">
                  Sin tasa de cambio disponible — se usarán los montos tal cual.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoConvertir(false)}>Cancelar</Button>
            <Button onClick={() => { setConfirmandoConvertir(false); convertirAFactura(); }} disabled={convirtiendo}>
              <Zap className="h-4 w-4 mr-1" />
              {convirtiendo ? "Convirtiendo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog open={confirmandoEliminar} onOpenChange={setConfirmandoEliminar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cotización</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará {cotizacion.numero} permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoEliminar(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={eliminar} disabled={eliminando}>
              {eliminando ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
