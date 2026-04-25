"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { generarBodyFactura, generarHtmlFactura } from "@/lib/email/factura-html";
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
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/Logo%20DB.png`;
    try {
      let pdfBase64: string | undefined;
      try {
        const { pdfBase64FromHtml } = await import("@/lib/pdf-utils");
        pdfBase64 = await pdfBase64FromHtml(generarHtmlFactura(factura, logoUrl));
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
      const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/Logo%20DB.png`;

      iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1200px;border:none;";
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => {
        iframe!.onload = () => resolve();
        iframe!.srcdoc = generarHtmlFactura(factura, logoUrl);
        setTimeout(resolve, 1500);
      });

      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("No se pudo acceder al documento");

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#dde3ea",
        logging: false,
        windowWidth: 794,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pdfW, pdfH);
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

      {/* Documento — mismo HTML que email/PDF para consistencia perfecta */}
      <div className="bg-[#dde3ea] py-6 rounded-xl overflow-auto print:bg-white print:py-0 print:rounded-none">
        <div
          style={{ margin: "0 auto", boxShadow: "0 4px 24px rgba(0,0,0,.14)", borderRadius: 8, overflow: "hidden", width: 794 }}
          className="print:shadow-none print:rounded-none"
          dangerouslySetInnerHTML={{ __html: generarBodyFactura(factura, "/Logo DB.png") }}
        />
      </div>

      {/* Badge de estado — solo pantalla */}
      <div className="print:hidden mt-3 flex justify-center">
        <Badge variant={estado.variant} className="text-sm px-3 py-1">{estado.label}</Badge>
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
