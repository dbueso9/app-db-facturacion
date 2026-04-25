"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { updateEstadoCotizacion, deleteCotizacion, marcarConvertida } from "@/lib/actions/cotizaciones";
import { crearProyecto } from "@/lib/actions/proyecto";
import { crearNumeroFactura, saveFactura } from "@/lib/actions/facturas";
import { enviarCotizacion } from "@/lib/actions/email";
import { Cotizacion, EstadoCotizacion, Factura } from "@/lib/types";
import { TasaCambio } from "@/lib/actions/tasa-cambio";
import { formatDolares, formatLempiras, formatFecha, generarId } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { ArrowLeft, Pencil, Trash2, Zap, FileText, AlertCircle, Download, Send, CheckCircle, XCircle, Layers, Plus } from "lucide-react";
import { jsPDF } from "jspdf";

function formatValidezDestacado(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  const mes = d.toLocaleString("es-HN", { month: "long" }).toUpperCase();
  return `${d.getDate()} DE ${mes} DE ${d.getFullYear()}`;
}

const BADGE_ESTADO: Record<EstadoCotizacion, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  enviada: { label: "Enviada", variant: "default" },
  aceptada: { label: "Aceptada", variant: "outline" },
  rechazada: { label: "Rechazada", variant: "destructive" },
};

const ESTADOS_DISPONIBLES: EstadoCotizacion[] = ["borrador", "enviada", "aceptada", "rechazada"];

type FormHito = { id: string; nombre: string; porcentaje: string };

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
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const [modalEmail, setModalEmail] = useState(false);
  const correosCliente = [cotizacion.cliente.correo, cotizacion.cliente.correo2, cotizacion.cliente.correo3].filter(Boolean).join(", ");
  const [emailPara, setEmailPara] = useState(correosCliente || "");
  const [emailAsunto, setEmailAsunto] = useState(
    `Cotización ${cotizacion.numero}${cotizacion.nombreProyecto ? ` — ${cotizacion.nombreProyecto}` : ""}`
  );
  const [emailMensaje, setEmailMensaje] = useState(
    `Estimado(a) ${cotizacion.cliente.nombre},\n\nAdjunto encontrará la cotización ${cotizacion.numero}${cotizacion.nombreProyecto ? ` para ${cotizacion.nombreProyecto}` : ""} por un valor de ${formatDolares(cotizacion.total)}.\n\nEsta cotización tiene vigencia hasta el ${formatFecha(cotizacion.fechaValidez)}.\n\nPara cualquier consulta o aprobación, no dude en contactarnos.\n\nAtentamente,\n${EMPRESA.nombre}`
  );
  const [enviando, setEnviando] = useState(false);
  const [envioResultado, setEnvioResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  // Crear contrato con hitos
  const [modalContrato, setModalContrato] = useState(false);
  const [formProyecto, setFormProyecto] = useState({ nombreProyecto: "", fechaInicio: "", notas: "" });
  const [formHitosContrato, setFormHitosContrato] = useState<FormHito[]>([]);
  const [errorHitosContrato, setErrorHitosContrato] = useState<string | null>(null);
  const [creandoContrato, setCreandoContrato] = useState(false);

  const estado = BADGE_ESTADO[estadoActual];
  const yaConvertida = !!cotizacion.convertidaAFacturaId || !!cotizacion.convertidaAContratoId;
  const tasa = tasaCambio?.venta || 1;

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

  async function exportarPDF() {
    setExportandoPdf(true);
    setErrorPdf(null);
    let iframe: HTMLIFrameElement | null = null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { generarHtmlCotizacion } = await import("@/lib/email/cotizacion-html");

      iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1200px;border:none;";
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => {
        iframe!.onload = () => resolve();
        iframe!.srcdoc = generarHtmlCotizacion(cotizacion);
        setTimeout(resolve, 1500);
      });

      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("No se pudo acceder al documento");

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8fafc",
        logging: false,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      const partes = [
        cotizacion.numero,
        cotizacion.cliente.nombre,
        cotizacion.fecha,
      ].map((s) => s.replace(/[/\\?%*:|"<>]/g, "-").trim());
      pdf.save(`${partes.join(" - ")}.pdf`);
    } catch (err) {
      setErrorPdf(err instanceof Error ? err.message : "Error al generar PDF");
    } finally {
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
      setExportandoPdf(false);
    }
  }

  const valorBaseContrato = Number((cotizacion.total * tasa).toFixed(2));
  const sumaHitosContrato = formHitosContrato.reduce((s, h) => s + (parseFloat(h.porcentaje) || 0), 0);

  function abrirModalContrato() {
    setFormProyecto({
      nombreProyecto: cotizacion.nombreProyecto || "",
      fechaInicio: new Date().toISOString().split("T")[0],
      notas: cotizacion.notas || "",
    });
    setFormHitosContrato([
      { id: generarId(), nombre: "Anticipo", porcentaje: "50" },
      { id: generarId(), nombre: "Entrega Final", porcentaje: "50" },
    ]);
    setErrorHitosContrato(null);
    setModalContrato(true);
  }

  function addHitoContratoRow() {
    setFormHitosContrato((prev) => [...prev, { id: generarId(), nombre: "", porcentaje: "" }]);
  }

  function removeHitoContratoRow(idx: number) {
    setFormHitosContrato((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateHitoContratoRow(idx: number, field: "nombre" | "porcentaje", value: string) {
    setFormHitosContrato((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  }

  async function confirmarCrearContrato() {
    if (!formProyecto.nombreProyecto.trim()) {
      setErrorHitosContrato("El nombre del proyecto es requerido");
      return;
    }
    if (Math.abs(sumaHitosContrato - 100) > 0.01) {
      setErrorHitosContrato(`Los porcentajes deben sumar exactamente 100% (actualmente ${sumaHitosContrato.toFixed(2)}%)`);
      return;
    }
    if (formHitosContrato.some((h) => !h.nombre.trim())) {
      setErrorHitosContrato("Todos los hitos deben tener un nombre");
      return;
    }

    setCreandoContrato(true);
    setErrorHitosContrato(null);
    try {
      const hitos = formHitosContrato.map((h) => ({
        id: h.id,
        nombre: h.nombre.trim(),
        porcentaje: parseFloat(h.porcentaje),
        monto: Number(((valorBaseContrato * parseFloat(h.porcentaje)) / 100).toFixed(2)),
      }));

      await crearProyecto({
        clienteId: cotizacion.clienteId,
        nombreProyecto: formProyecto.nombreProyecto.trim(),
        valorBase: valorBaseContrato,
        fechaInicio: formProyecto.fechaInicio,
        notas: formProyecto.notas,
        cotizacionId: cotizacion.id,
        hitos,
      });

      router.push(`/clientes/${cotizacion.clienteId}`);
    } catch (err) {
      setErrorHitosContrato(err instanceof Error ? err.message : "Error al crear el contrato");
      setCreandoContrato(false);
    }
  }

  async function enviarCorreo() {
    if (!emailPara.trim()) return;
    setEnviando(true);
    setEnvioResultado(null);
    try {
      let pdfBase64: string | undefined;
      try {
        const { generarHtmlCotizacion } = await import("@/lib/email/cotizacion-html");
        const { pdfBase64FromHtml } = await import("@/lib/pdf-utils");
        pdfBase64 = await pdfBase64FromHtml(generarHtmlCotizacion(cotizacion));
      } catch {
        // PDF falló; se envía sin adjunto
      }
      const res = await enviarCotizacion(cotizacion, emailPara.trim(), emailAsunto, emailMensaje, pdfBase64);
      setEnvioResultado({
        ok: res.ok,
        msg: res.ok
          ? (pdfBase64 ? "Correo enviado con PDF adjunto" : "Correo enviado (sin PDF adjunto)")
          : res.error || "Error al enviar",
      });
      if (res.ok) setTimeout(() => setModalEmail(false), 2000);
    } catch (e) {
      setEnvioResultado({ ok: false, msg: (e as Error).message || "Error al enviar correo" });
    } finally {
      setEnviando(false);
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
            {cotizacion.convertidaAFacturaId && (
              <Link href={`/facturas/${cotizacion.convertidaAFacturaId}`}>
                <Badge variant="outline" className="text-green-400 border-green-400 cursor-pointer hover:bg-green-400/10">
                  <FileText className="h-3 w-3 mr-1" />
                  Ver Factura
                </Badge>
              </Link>
            )}
            {cotizacion.convertidaAContratoId && (
              <Link href={`/clientes/${cotizacion.clienteId}`}>
                <Badge variant="outline" className="text-purple-400 border-purple-400 cursor-pointer hover:bg-purple-400/10">
                  <Layers className="h-3 w-3 mr-1" />
                  Ver Proyecto
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

          <Button variant="outline" size="sm" onClick={() => { setModalEmail(true); setEnvioResultado(null); }}>
            <Send className="h-4 w-4 mr-1" />
            Enviar Correo
          </Button>

          <Button variant="outline" size="sm" onClick={exportarPDF} disabled={exportandoPdf}>
            <Download className="h-4 w-4 mr-1" />
            {exportandoPdf ? "Generando..." : "Descargar PDF"}
          </Button>

          {!yaConvertida && estadoActual !== "rechazada" && (
            <>
              <Button variant="outline" onClick={abrirModalContrato} disabled={creandoContrato}>
                <Layers className="h-4 w-4 mr-1" />
                Crear Contrato
              </Button>
              <Button onClick={() => { setConfirmandoConvertir(true); setErrorConversion(null); }} disabled={convirtiendo}>
                <Zap className="h-4 w-4 mr-1" />
                Convertir en Factura
              </Button>
            </>
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

      {/* Error PDF */}
      {errorPdf && (
        <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{errorPdf}</span>
        </div>
      )}

      {/* Documento visible en pantalla */}
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
              {cotizacion.cliente.correo && (
                <p className="text-sm font-medium text-foreground">{cotizacion.cliente.correo}</p>
              )}
              {cotizacion.cliente.telefono && (
                <p className="text-sm text-muted-foreground">{cotizacion.cliente.telefono}</p>
              )}
              {cotizacion.cliente.rtn && (
                <p className="text-sm font-mono text-muted-foreground">RTN: {cotizacion.cliente.rtn}</p>
              )}
              {cotizacion.cliente.direccion && (
                <p className="text-sm text-muted-foreground">{cotizacion.cliente.direccion}</p>
              )}
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
            <div className="py-1.5 border-b border-muted text-xs text-muted-foreground text-center italic tracking-wide">
              — Ultima Fila —
            </div>
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

          <Separator />
          <div className="space-y-2">
            <div className="text-xs text-center font-bold border border-foreground/30 rounded px-3 py-2 bg-muted/30 uppercase tracking-wide">
              ESTA COTIZACIÓN ES VÁLIDA HASTA EL {formatValidezDestacado(cotizacion.fechaValidez)}
            </div>
            <p className="text-xs text-center text-muted-foreground italic">Los precios están sujetos a cambio.</p>
          </div>
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

      {/* Dialog crear contrato con hitos */}
      <Dialog open={modalContrato} onOpenChange={setModalContrato}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Contrato con Plan de Pagos</DialogTitle>
            <DialogDescription>
              Se creará un contrato de proyecto con hitos de facturación independientes. Cada hito genera su propia factura al ser alcanzado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del Proyecto *</Label>
              <Input
                value={formProyecto.nombreProyecto}
                onChange={(e) => setFormProyecto({ ...formProyecto, nombreProyecto: e.target.value })}
                placeholder="Ej: Sistema de Inventario, Portal Web..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valor del Proyecto</Label>
                <div className="flex items-center h-9 px-3 border rounded-md bg-muted/50 text-sm font-mono text-muted-foreground">
                  {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 2 }).format(valorBaseContrato)}
                </div>
                {tasaCambio && (
                  <p className="text-xs text-muted-foreground">Tasa BCH: L.{tasaCambio.venta.toFixed(4)} · {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cotizacion.total)} convertidos</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Fecha de Inicio *</Label>
                <Input
                  type="date"
                  value={formProyecto.fechaInicio}
                  onChange={(e) => setFormProyecto({ ...formProyecto, fechaInicio: e.target.value })}
                />
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium">Plan de Pagos (Hitos)</p>

            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-6">Nombre del Hito</span>
              <span className="col-span-3 text-center">%</span>
              <span className="col-span-2 text-right">Monto</span>
              <span className="col-span-1"></span>
            </div>

            {formHitosContrato.map((h, idx) => {
              const pct = parseFloat(h.porcentaje) || 0;
              const monto = (valorBaseContrato * pct) / 100;
              return (
                <div key={h.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <Input
                      value={h.nombre}
                      onChange={(e) => updateHitoContratoRow(idx, "nombre", e.target.value)}
                      placeholder="Ej: Anticipo, Pruebas UAT..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={h.porcentaje}
                      onChange={(e) => updateHitoContratoRow(idx, "porcentaje", e.target.value)}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <div className="col-span-2 text-right text-xs font-mono text-muted-foreground">
                    {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(monto)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHitoContratoRow(idx)}>
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" onClick={addHitoContratoRow} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Agregar Hito
            </Button>

            <div className={`flex items-center justify-between text-sm px-2 py-1.5 rounded ${Math.abs(sumaHitosContrato - 100) < 0.01 ? "bg-green-50/10 text-green-500" : "bg-red-950/30 text-red-400"}`}>
              <span>Suma de porcentajes</span>
              <span className="font-mono font-bold">{sumaHitosContrato.toFixed(2)}% / 100%</span>
            </div>

            {errorHitosContrato && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800 rounded px-3 py-2">
                <XCircle className="h-4 w-4 shrink-0" />
                {errorHitosContrato}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalContrato(false)}>Cancelar</Button>
            <Button
              onClick={confirmarCrearContrato}
              disabled={creandoContrato || Math.abs(sumaHitosContrato - 100) > 0.01 || !formProyecto.nombreProyecto.trim() || !formProyecto.fechaInicio}
            >
              <Layers className="h-4 w-4 mr-1" />
              {creandoContrato ? "Creando..." : "Crear Contrato con Hitos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog enviar por correo */}
      <Dialog open={modalEmail} onOpenChange={(o) => { setModalEmail(o); setEnvioResultado(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Cotización por Correo</DialogTitle>
            <DialogDescription>
              {cotizacion.numero}{cotizacion.nombreProyecto ? ` · ${cotizacion.nombreProyecto}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Para *</Label>
              <Input
                type="email"
                value={emailPara}
                onChange={(e) => setEmailPara(e.target.value)}
                placeholder="correo@cliente.com"
              />
              <p className="text-xs text-muted-foreground">Puede separar varios correos con coma</p>
            </div>
            <div className="space-y-1">
              <Label>Asunto</Label>
              <Input value={emailAsunto} onChange={(e) => setEmailAsunto(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Mensaje</Label>
              <Textarea
                value={emailMensaje}
                onChange={(e) => setEmailMensaje(e.target.value)}
                rows={7}
              />
            </div>
            {envioResultado && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${envioResultado.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                {envioResultado.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {envioResultado.msg}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEmail(false)}>Cancelar</Button>
            <Button onClick={enviarCorreo} disabled={!emailPara.trim() || enviando}>
              <Send className="h-4 w-4 mr-1" />
              {enviando ? "Preparando PDF..." : "Enviar con PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
