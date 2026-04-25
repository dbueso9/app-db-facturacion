"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateEstadoFactura, deleteFactura } from "@/lib/actions/facturas";
import { saveContrato } from "@/lib/actions/contratos";
import { enviarFactura } from "@/lib/actions/email";
import { Factura, EstadoFactura, TipoContrato } from "@/lib/types";
import { formatLempiras, formatFecha, generarId } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Printer, Trash2, Download, Pencil, Send, CheckCircle, XCircle, Layers } from "lucide-react";
import Link from "next/link";
import { jsPDF } from "jspdf";

const BADGE_ESTADO: Record<EstadoFactura, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  emitida: { label: "Emitida", variant: "default" },
  pagada: { label: "Pagada", variant: "outline" },
  anulada: { label: "Anulada", variant: "destructive" },
};

export default function FacturaDetalleClient({ factura }: { factura: Factura }) {
  const router = useRouter();
  const [estadoActual, setEstadoActual] = useState<EstadoFactura>(factura.estado);
  const [pendingState, setPendingState] = useState<EstadoFactura | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const [modalEmail, setModalEmail] = useState(false);
  const correosCliente = [factura.cliente.correo, factura.cliente.correo2, factura.cliente.correo3].filter(Boolean).join(", ");
  const [emailPara, setEmailPara] = useState(correosCliente || "");
  const [emailAsunto, setEmailAsunto] = useState(
    `Factura ${factura.numero}${factura.nombreProyecto ? ` — ${factura.nombreProyecto}` : ""}`
  );
  const [emailMensaje, setEmailMensaje] = useState(
    `Estimado(a) ${factura.cliente.nombre},\n\nAdjunto encontrará la factura ${factura.numero}${factura.nombreProyecto ? ` correspondiente a ${factura.nombreProyecto}` : ""} por un valor de ${formatLempiras(factura.total)}.\n\nFecha límite de pago: ${formatFecha(factura.fechaVencimiento)}.\n\nDatos bancarios para transferencia:\nBanco: ${EMPRESA.banco.nombre}\nCuenta: #${EMPRESA.banco.cuenta}\nTipo: ${EMPRESA.banco.tipo}\n\nPara cualquier consulta, no dude en contactarnos.\n\nAtentamente,\n${EMPRESA.nombre}`
  );
  const [enviando, setEnviando] = useState(false);
  const [envioResultado, setEnvioResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  // Crear contrato de servicio recurrente desde factura
  const [modalContrato, setModalContrato] = useState(false);
  const [formContrato, setFormContrato] = useState({
    nombreProyecto: factura.nombreProyecto || "",
    tipo: "mantenimiento" as TipoContrato,
    diaFacturacion: 1 as 1 | 2,
    notas: factura.notas || "",
  });
  const [creandoContrato, setCreandoContrato] = useState(false);
  const [errorContrato, setErrorContrato] = useState<string | null>(null);

  const TIPO_LABELS: Record<TipoContrato, string> = {
    mantenimiento: "Mantenimiento / Soporte",
    hosting: "Hosting",
    soporte: "Soporte Técnico",
    proyecto_app: "Proyecto / App",
    otro: "Otro",
  };

  async function crearContratoDesdeFactura() {
    if (!formContrato.nombreProyecto.trim()) { setErrorContrato("El nombre del proyecto es requerido"); return; }
    setCreandoContrato(true);
    setErrorContrato(null);
    try {
      await saveContrato({
        id: generarId(),
        clienteId: factura.clienteId,
        nombreProyecto: formContrato.nombreProyecto.trim(),
        tipo: formContrato.tipo,
        valorBase: factura.total,
        fechaInicio: factura.fecha,
        diaFacturacion: formContrato.diaFacturacion,
        activo: true,
        notas: formContrato.notas,
        creadoEn: new Date().toISOString(),
      });
      setModalContrato(false);
      router.push(`/clientes/${factura.clienteId}`);
    } catch (e) {
      setErrorContrato((e as Error).message || "Error al crear el contrato");
      setCreandoContrato(false);
    }
  }

  const estado = BADGE_ESTADO[estadoActual];

  async function enviarCorreo() {
    if (!emailPara.trim()) return;
    setEnviando(true);
    setEnvioResultado(null);
    try {
      let pdfBase64: string | undefined;
      try {
        const { generarHtmlFactura } = await import("@/lib/email/factura-html");
        const { pdfBase64FromHtml } = await import("@/lib/pdf-utils");
        pdfBase64 = await pdfBase64FromHtml(generarHtmlFactura(factura));
      } catch {
        // PDF falló; se envía sin adjunto
      }
      const res = await enviarFactura(factura, emailPara.trim(), emailAsunto, emailMensaje, pdfBase64);
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

  function cambiarEstado(nuevoEstado: string | null) {
    if (!nuevoEstado || nuevoEstado === estadoActual) return;
    setPendingState(nuevoEstado as EstadoFactura);
  }

  async function confirmarCambioEstado() {
    if (!pendingState) return;
    setCambiando(true);
    try {
      await updateEstadoFactura(factura.id, pendingState);
      setEstadoActual(pendingState);
      router.refresh();
    } finally {
      setCambiando(false);
      setPendingState(null);
    }
  }

  async function confirmarEliminar() {
    setEliminando(true);
    setConfirmandoEliminar(false);
    try {
      await deleteFactura(factura.id);
      router.push("/facturas");
    } finally {
      setEliminando(false);
    }
  }

  async function exportarPDF() {
    setExportandoPdf(true);
    setErrorPdf(null);
    let iframe: HTMLIFrameElement | null = null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { generarHtmlFactura } = await import("@/lib/email/factura-html");

      iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1200px;border:none;";
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => {
        iframe!.onload = () => resolve();
        iframe!.srcdoc = generarHtmlFactura(factura);
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
        factura.nombreProyecto || "Factura",
        factura.cliente.nombre,
        factura.fecha,
      ].map((s) => s.replace(/[/\\?%*:|"<>]/g, "-").trim());
      pdf.save(`${partes.join(" - ")}.pdf`);
    } catch (err) {
      setErrorPdf(err instanceof Error ? err.message : "Error al generar PDF");
    } finally {
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
      setExportandoPdf(false);
    }
  }

  return (
    <>
      {/* Controles — no se imprimen */}
      <div className="print:hidden mb-6 flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {factura.estado === "borrador" && (
            <Button variant="outline" size="sm" render={<Link href={`/facturas/${factura.id}/editar`} />}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
          <Select value={estadoActual} onValueChange={cambiarEstado} disabled={cambiando}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="emitida">Emitida</SelectItem>
              <SelectItem value="pagada">Pagada</SelectItem>
              <SelectItem value="anulada">Anulada</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setModalEmail(true)}>
            <Send className="h-4 w-4 mr-1" />
            Enviar Correo
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setModalContrato(true); setErrorContrato(null); }}>
            <Layers className="h-4 w-4 mr-1" />
            Crear Contrato
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPDF} disabled={exportandoPdf}>
            <Download className="h-4 w-4 mr-1" />
            {exportandoPdf ? "Generando..." : "Descargar PDF"}
          </Button>
          <Button onClick={() => window.print()} size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmandoEliminar(true)}
            disabled={eliminando}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        </div>
      </div>

      {errorPdf && (
        <div className="print:hidden mb-4 flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
          <XCircle className="h-4 w-4 shrink-0" />
          {errorPdf}
        </div>
      )}

      {/* Documento de factura */}
      <div id="factura-documento" className="bg-white text-black max-w-3xl mx-auto p-10 shadow-lg print:shadow-none print:p-6 rounded-lg">

        {/* Encabezado empresa */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <Image
              src="/Logo DB.png"
              alt="DB Consulting"
              width={64}
              height={64}
              className="rounded-lg object-contain flex-shrink-0"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{EMPRESA.nombre}</h1>
              <p className="text-sm text-gray-600">{EMPRESA.direccion}</p>
              <p className="text-sm text-gray-600">Tel: {EMPRESA.telefono}</p>
              <p className="text-sm text-gray-600">{EMPRESA.correo}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900">FACTURA</h2>
            <p className="text-sm font-mono text-gray-600 mt-1">{factura.numero}</p>
            <div className="print:hidden mt-2">
              <Badge variant={estado.variant}>{estado.label}</Badge>
            </div>
          </div>
        </div>

        {/* Datos fiscales empresa — arriba */}
        <div className="border-2 border-gray-800 rounded-lg p-3 mb-4 bg-gray-50 text-xs">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <div>
              <span className="font-semibold text-gray-700">RTN: </span>
              <span className="font-mono font-bold text-gray-900">{EMPRESA.rtn}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Fecha Límite Emisión: </span>
              <span className="text-gray-800">{EMPRESA.fechaLimiteEmision}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-gray-700">CAI: </span>
              <span className="font-mono text-gray-800">{EMPRESA.cai}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Rango Autorizado Desde: </span>
              <span className="font-mono text-gray-800">N.{EMPRESA.rangoDesde}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Rango Autorizado Hasta: </span>
              <span className="font-mono text-gray-800">N.{EMPRESA.rangoHasta}</span>
            </div>
          </div>
        </div>

        {/* Fechas y número */}
        <div className="grid grid-cols-2 gap-6 mb-4 text-sm border border-gray-200 rounded-lg p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha de Emisión</p>
            <p className="font-semibold text-gray-900">{formatFecha(factura.fecha)}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha de Vencimiento</p>
            <p className="font-semibold text-gray-900">{formatFecha(factura.fechaVencimiento)}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-2">No. de Factura</p>
            <p className="font-mono font-bold text-gray-900">{factura.numero}</p>
          </div>
        </div>

        {/* Datos del cliente — parados (label arriba, valor abajo) */}
        <div className="border border-gray-200 rounded-lg p-4 mb-6 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Facturar a</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Nombre / Razón Social</p>
              <p className="font-bold text-gray-900 mt-0.5">{factura.cliente.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">RTN</p>
              <p className="font-mono font-semibold text-gray-900 mt-0.5">
                {factura.cliente.rtn || <span className="text-gray-400 italic text-xs">Sin RTN</span>}
              </p>
            </div>
            {factura.cliente.direccion && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Dirección</p>
                <p className="text-gray-800 mt-0.5">{factura.cliente.direccion}</p>
              </div>
            )}
            {factura.cliente.correo && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Correo</p>
                <p className="text-gray-800 mt-0.5">{factura.cliente.correo}</p>
              </div>
            )}
            {factura.cliente.telefono && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Teléfono</p>
                <p className="text-gray-800 mt-0.5">{factura.cliente.telefono}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de servicios */}
        <table className="w-full text-sm mb-6 table-fixed">
          <colgroup>
            <col className="w-[48%]" />
            <col className="w-[10%]" />
            <col className="w-[21%]" />
            <col className="w-[21%]" />
          </colgroup>
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-800">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Descripción del Servicio</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Cant.</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Precio Unit. (L.)</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Subtotal (L.)</th>
            </tr>
          </thead>
          <tbody>
            {factura.nombreProyecto && (
              <tr className="bg-[#f0f4f8]">
                <td className="py-2 px-3 font-bold italic text-[#1e3a5f] text-sm border-b border-gray-200">{factura.nombreProyecto}</td>
                <td colSpan={3} className="border-b border-gray-200 bg-[#f0f4f8]" />
              </tr>
            )}
            {factura.lineas.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2 px-2 text-gray-800">{l.descripcion}</td>
                <td className="py-2 px-2 text-center text-gray-600">{l.cantidad}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-700">{formatLempiras(l.precioUnitario)}</td>
                <td className="py-2 px-2 text-right font-mono font-medium">{formatLempiras(l.subtotal)}</td>
              </tr>
            ))}
            <tr className="border-b border-gray-100">
              <td colSpan={4} className="py-1.5 px-2 text-center text-xs text-gray-400 italic tracking-wide">— Última Fila —</td>
            </tr>
          </tbody>
        </table>

        {/* Totales + Banco */}
        <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
          {/* Datos bancarios */}
          <div className="border border-gray-200 rounded-lg p-3 text-xs min-w-48">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1.5">Datos Bancarios</p>
            <p className="font-bold text-gray-800">{EMPRESA.banco.nombre}</p>
            <p className="text-gray-600 mt-0.5">Cuenta # {EMPRESA.banco.cuenta}</p>
            <p className="text-gray-600">Tipo: {EMPRESA.banco.tipo}</p>
          </div>
          {/* Totales SAR */}
          <div className="w-72 text-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex justify-between px-4 py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Sub-Total</span>
              <span className="font-mono">{formatLempiras(factura.subtotal)}</span>
            </div>
            <div className="flex justify-between px-4 py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Descuento</span>
              <span className="font-mono">{formatLempiras(factura.descuento ?? 0)}</span>
            </div>
            <div className="flex justify-between px-4 py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Impt. Exento</span>
              <span className="font-mono">{formatLempiras(0)}</span>
            </div>
            <div className="flex justify-between px-4 py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Impt. Gravado</span>
              <span className="font-mono">{formatLempiras(factura.subtotal - (factura.descuento ?? 0))}</span>
            </div>
            <div className="flex justify-between px-4 py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Impt. Exonerado</span>
              <span className="font-mono">{formatLempiras(0)}</span>
            </div>
            <div className="flex justify-between px-4 py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Impuesto 15%</span>
              <span className="font-mono">{formatLempiras(factura.isv)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 bg-[#1e3a5f] text-white font-bold text-base">
              <span>Total a Pagar</span>
              <span className="font-mono">{formatLempiras(factura.total)}</span>
            </div>
          </div>
        </div>

        {/* Método de pago y notas */}
        {(factura.metodoPago || factura.notas) && (
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            {factura.metodoPago && (
              <div className="border border-gray-200 rounded-lg px-4 py-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Método de Pago</p>
                <p className="font-semibold capitalize text-gray-900 mt-0.5">{factura.metodoPago}</p>
              </div>
            )}
            {factura.notas && (
              <div className="border border-gray-200 rounded-lg px-4 py-2 col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Notas</p>
                <p className="text-gray-700 mt-0.5">{factura.notas}</p>
              </div>
            )}
          </div>
        )}

        {/* Tasa de cambio al momento de la emisión */}
        {factura.tasaCambio && (
          <div className="flex items-center justify-between text-xs border border-gray-200 rounded px-3 py-2 mb-4 bg-gray-50">
            <span className="text-gray-500">Tasa de cambio BCH (USD/HNL) a la fecha de emisión</span>
            <span className="font-mono font-semibold text-gray-800">L. {factura.tasaCambio.toFixed(4)}</span>
          </div>
        )}

        {/* Leyenda fiscal */}
        <div className="text-xs text-center font-bold text-gray-800 border border-gray-800 rounded px-3 py-2 mb-4 uppercase tracking-wide">
          LA FACTURA ES BENEFICIO DE TODOS EXÍJALA
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500 border-t border-gray-300 pt-4 text-center space-y-1">
          <p className="text-gray-400">
            {EMPRESA.nombre} · RTN {EMPRESA.rtn} · {EMPRESA.correo} · Tel: {EMPRESA.telefono}
          </p>
          <p className="text-gray-300 text-[10px]">
            Sistema de Facturación desarrollado por DB Consulting © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Dialog enviar por correo */}
      <Dialog open={modalEmail} onOpenChange={(o) => { setModalEmail(o); setEnvioResultado(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Factura por Correo</DialogTitle>
            <DialogDescription>
              {factura.numero}{factura.nombreProyecto ? ` · ${factura.nombreProyecto}` : ""}
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

      {/* Dialog confirmación cambio de estado */}
      <Dialog open={!!pendingState} onOpenChange={(o) => { if (!o) setPendingState(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado de la factura</DialogTitle>
            <DialogDescription>
              ¿Confirma cambiar el estado de <strong>{factura.numero}</strong> de{" "}
              <strong>{BADGE_ESTADO[estadoActual].label}</strong> a{" "}
              <strong>{pendingState ? BADGE_ESTADO[pendingState].label : ""}</strong>?
              {pendingState === "anulada" && (
                <span className="block mt-1 text-destructive font-medium">Esta acción no se puede deshacer.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingState(null)}>Cancelar</Button>
            <Button
              variant={pendingState === "anulada" ? "destructive" : "default"}
              onClick={confirmarCambioEstado}
              disabled={cambiando}
            >
              {cambiando ? "Cambiando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmación eliminar */}
      <Dialog open={confirmandoEliminar} onOpenChange={setConfirmandoEliminar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar factura</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar permanentemente la factura <strong>{factura.numero}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoEliminar(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarEliminar} disabled={eliminando}>
              {eliminando ? "Eliminando..." : "Eliminar permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog crear contrato de servicio */}
      <Dialog open={modalContrato} onOpenChange={setModalContrato}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Contrato de Servicio</DialogTitle>
            <DialogDescription>
              Se creará un contrato recurrente para {factura.cliente.nombre} basado en esta factura (valor base: {formatLempiras(factura.total)}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del Servicio / Proyecto *</Label>
              <Input
                value={formContrato.nombreProyecto}
                onChange={(e) => setFormContrato({ ...formContrato, nombreProyecto: e.target.value })}
                placeholder="Ej: Mantenimiento Mensual, Hosting Web..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Contrato</Label>
                <Select value={formContrato.tipo} onValueChange={(v) => v && setFormContrato({ ...formContrato, tipo: v as TipoContrato })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_LABELS) as [TipoContrato, string][]).map(([val, lbl]) => (
                      <SelectItem key={val} value={val}>{lbl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Día de Facturación</Label>
                <Select value={String(formContrato.diaFacturacion)} onValueChange={(v) => v && setFormContrato({ ...formContrato, diaFacturacion: Number(v) as 1 | 2 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Inicio de mes</SelectItem>
                    <SelectItem value="2">Fin de mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea
                value={formContrato.notas}
                onChange={(e) => setFormContrato({ ...formContrato, notas: e.target.value })}
                rows={2}
                placeholder="Notas adicionales del contrato"
              />
            </div>
            {errorContrato && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800 rounded px-3 py-2">
                <XCircle className="h-4 w-4 shrink-0" />
                {errorContrato}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalContrato(false)}>Cancelar</Button>
            <Button onClick={crearContratoDesdeFactura} disabled={creandoContrato || !formContrato.nombreProyecto.trim()}>
              <Layers className="h-4 w-4 mr-1" />
              {creandoContrato ? "Creando..." : "Crear Contrato"}
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
    </>
  );
}
