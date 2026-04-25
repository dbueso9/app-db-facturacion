"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generarBodyCotizacion, generarHtmlCotizacion } from "@/lib/email/cotizacion-html";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  const descuento = cotizacion.descuento ?? 0;
  const gravado = cotizacion.subtotal - descuento;

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
        return { id: generarId(), descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: precioLPS, subtotal: subtotalLPS };
      });
      const sub = Number(lineas.reduce((s, l) => s + l.subtotal, 0).toFixed(2));
      const desc = Number((descuento * tasa).toFixed(2));
      const grav = sub - desc;
      const isvCalc = Number((grav * EMPRESA.isv).toFixed(2));
      const factura: Factura = {
        id: generarId(), numero, secuencia,
        fecha: new Date().toISOString().split("T")[0],
        fechaVencimiento: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        clienteId: cotizacion.clienteId, cliente: cotizacion.cliente,
        lineas, subtotal: sub, descuento: desc, isv: isvCalc, total: grav + isvCalc,
        estado: "emitida", condicionPago: 30, tasaCambio: tasaCambio?.venta,
        nombreProyecto: cotizacion.nombreProyecto, notas: cotizacion.notas,
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
      const logoUrl = `${window.location.origin}/Logo DB.png`;

      iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1200px;border:none;";
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => {
        iframe!.onload = () => resolve();
        iframe!.srcdoc = generarHtmlCotizacion(cotizacion, logoUrl);
        setTimeout(resolve, 1500);
      });

      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("No se pudo acceder al documento");

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 1.5, useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: 794,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.82), "JPEG", 0, 0, pdfW, pdfH);
      const partes = [cotizacion.numero, cotizacion.cliente.nombre, cotizacion.fecha]
        .map((s) => s.replace(/[/\\?%*:|"<>]/g, "-").trim());
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
    setFormProyecto({ nombreProyecto: cotizacion.nombreProyecto || "", fechaInicio: new Date().toISOString().split("T")[0], notas: cotizacion.notas || "" });
    setFormHitosContrato([{ id: generarId(), nombre: "Anticipo", porcentaje: "50" }, { id: generarId(), nombre: "Entrega Final", porcentaje: "50" }]);
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
    if (!formProyecto.nombreProyecto.trim()) { setErrorHitosContrato("El nombre del proyecto es requerido"); return; }
    if (Math.abs(sumaHitosContrato - 100) > 0.01) { setErrorHitosContrato(`Los porcentajes deben sumar exactamente 100% (actualmente ${sumaHitosContrato.toFixed(2)}%)`); return; }
    if (formHitosContrato.some((h) => !h.nombre.trim())) { setErrorHitosContrato("Todos los hitos deben tener un nombre"); return; }
    setCreandoContrato(true);
    setErrorHitosContrato(null);
    try {
      const hitos = formHitosContrato.map((h) => ({
        id: h.id, nombre: h.nombre.trim(), porcentaje: parseFloat(h.porcentaje),
        monto: Number(((valorBaseContrato * parseFloat(h.porcentaje)) / 100).toFixed(2)),
      }));
      await crearProyecto({ clienteId: cotizacion.clienteId, nombreProyecto: formProyecto.nombreProyecto.trim(), valorBase: valorBaseContrato, fechaInicio: formProyecto.fechaInicio, notas: formProyecto.notas, cotizacionId: cotizacion.id, hitos });
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
        const { pdfBase64FromHtml } = await import("@/lib/pdf-utils");
        const logoUrl = `${window.location.origin}/Logo DB.png`;
        pdfBase64 = await pdfBase64FromHtml(generarHtmlCotizacion(cotizacion, logoUrl));
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
      {/* Controles */}
      <div className="print:hidden flex items-start gap-4">
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
                  <FileText className="h-3 w-3 mr-1" />Ver Factura
                </Badge>
              </Link>
            )}
            {cotizacion.convertidaAContratoId && (
              <Link href={`/clientes/${cotizacion.clienteId}`}>
                <Badge variant="outline" className="text-purple-400 border-purple-400 cursor-pointer hover:bg-purple-400/10">
                  <Layers className="h-3 w-3 mr-1" />Ver Proyecto
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
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESTADOS_DISPONIBLES.map((e) => (
                <SelectItem key={e} value={e}>{BADGE_ESTADO[e].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => { setModalEmail(true); setEnvioResultado(null); }}>
            <Send className="h-4 w-4 mr-1" />Enviar Correo
          </Button>

          <Button variant="outline" size="sm" onClick={exportarPDF} disabled={exportandoPdf}>
            <Download className="h-4 w-4 mr-1" />
            {exportandoPdf ? "Generando..." : "Descargar PDF"}
          </Button>

          {!yaConvertida && estadoActual !== "rechazada" && (
            <>
              <Button variant="outline" onClick={abrirModalContrato} disabled={creandoContrato}>
                <Layers className="h-4 w-4 mr-1" />Crear Contrato
              </Button>
              <Button onClick={() => { setConfirmandoConvertir(true); setErrorConversion(null); }} disabled={convirtiendo}>
                <Zap className="h-4 w-4 mr-1" />Convertir en Factura
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

      {errorConversion && (
        <div className="print:hidden flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /><span>{errorConversion}</span>
        </div>
      )}
      {errorPdf && (
        <div className="print:hidden flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          <XCircle className="h-4 w-4 shrink-0" /><span>{errorPdf}</span>
        </div>
      )}

      {/* Documento — mismo HTML que email/PDF para consistencia perfecta */}
      <div className="bg-[#dde3ea] py-6 rounded-xl overflow-auto print:bg-white print:py-0 print:rounded-none">
        <div
          style={{ margin: "0 auto", boxShadow: "0 4px 24px rgba(0,0,0,.14)", borderRadius: 8, overflow: "hidden", width: 794 }}
          className="print:shadow-none print:rounded-none"
          dangerouslySetInnerHTML={{ __html: generarBodyCotizacion(cotizacion, "/Logo DB.png") }}
        />
      </div>
      <div className="print:hidden mt-3 flex justify-center gap-3 flex-wrap items-center">
        <Badge variant={estado.variant} className="text-sm px-3 py-1">{estado.label}</Badge>
        {tasaCambio && (
          <span className="text-xs text-muted-foreground">
            Equiv. aprox. <span className="font-medium">{montoLPS}</span> · Tasa BCH L.{tasaCambio.venta.toFixed(4)}
          </span>
        )}
      </div>

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
                <span className="block mt-2 text-yellow-400">Sin tasa de cambio disponible — se usarán los montos tal cual.</span>
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
              Se creará un contrato de proyecto con hitos de facturación independientes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del Proyecto *</Label>
              <Input value={formProyecto.nombreProyecto} onChange={(e) => setFormProyecto({ ...formProyecto, nombreProyecto: e.target.value })} placeholder="Ej: Sistema de Inventario, Portal Web..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Valor del Proyecto</Label>
                <div className="flex items-center h-9 px-3 border rounded-md bg-muted/50 text-sm font-mono text-muted-foreground">
                  {new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 2 }).format(valorBaseContrato)}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Fecha de Inicio *</Label>
                <Input type="date" value={formProyecto.fechaInicio} onChange={(e) => setFormProyecto({ ...formProyecto, fechaInicio: e.target.value })} />
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
                    <Input value={h.nombre} onChange={(e) => updateHitoContratoRow(idx, "nombre", e.target.value)} placeholder="Ej: Anticipo..." className="h-8 text-sm" />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="0" max="100" step="0.01" value={h.porcentaje} onChange={(e) => updateHitoContratoRow(idx, "porcentaje", e.target.value)} className="h-8 text-sm text-center" />
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
              <Plus className="h-4 w-4 mr-1" />Agregar Hito
            </Button>
            <div className={`flex items-center justify-between text-sm px-2 py-1.5 rounded ${Math.abs(sumaHitosContrato - 100) < 0.01 ? "bg-green-50/10 text-green-500" : "bg-red-950/30 text-red-400"}`}>
              <span>Suma de porcentajes</span>
              <span className="font-mono font-bold">{sumaHitosContrato.toFixed(2)}% / 100%</span>
            </div>
            {errorHitosContrato && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800 rounded px-3 py-2">
                <XCircle className="h-4 w-4 shrink-0" />{errorHitosContrato}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalContrato(false)}>Cancelar</Button>
            <Button onClick={confirmarCrearContrato} disabled={creandoContrato || Math.abs(sumaHitosContrato - 100) > 0.01 || !formProyecto.nombreProyecto.trim() || !formProyecto.fechaInicio}>
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
            <DialogDescription>{cotizacion.numero}{cotizacion.nombreProyecto ? ` · ${cotizacion.nombreProyecto}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Para *</Label>
              <Input type="email" value={emailPara} onChange={(e) => setEmailPara(e.target.value)} placeholder="correo@cliente.com" />
              <p className="text-xs text-muted-foreground">Puede separar varios correos con coma</p>
            </div>
            <div className="space-y-1">
              <Label>Asunto</Label>
              <Input value={emailAsunto} onChange={(e) => setEmailAsunto(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Mensaje</Label>
              <Textarea value={emailMensaje} onChange={(e) => setEmailMensaje(e.target.value)} rows={7} />
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

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          nav, header { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
