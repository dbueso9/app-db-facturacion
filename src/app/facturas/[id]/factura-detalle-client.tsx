"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { Factura, EstadoFactura } from "@/lib/types";
import { formatLempiras, formatFecha } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { ArrowLeft, Printer, Trash2, Download, Pencil } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";

const BADGE_ESTADO: Record<EstadoFactura, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  emitida: { label: "Emitida", variant: "default" },
  pagada: { label: "Pagada", variant: "outline" },
  anulada: { label: "Anulada", variant: "destructive" },
};

export default function FacturaDetalleClient({ factura }: { factura: Factura }) {
  const router = useRouter();
  const [estadoActual, setEstadoActual] = useState<EstadoFactura>(factura.estado);
  const [confirmandoAnular, setConfirmandoAnular] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);

  const estado = BADGE_ESTADO[estadoActual];

  async function cambiarEstado(nuevoEstado: string | null) {
    if (!nuevoEstado || nuevoEstado === estadoActual) return;
    if (nuevoEstado === "anulada") {
      setConfirmandoAnular(true);
      return;
    }
    setCambiando(true);
    try {
      await updateEstadoFactura(factura.id, nuevoEstado as EstadoFactura);
      setEstadoActual(nuevoEstado as EstadoFactura);
      router.refresh();
    } finally {
      setCambiando(false);
    }
  }

  async function confirmarAnular() {
    setCambiando(true);
    setConfirmandoAnular(false);
    try {
      await updateEstadoFactura(factura.id, "anulada");
      setEstadoActual("anulada");
      router.refresh();
    } finally {
      setCambiando(false);
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
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = document.getElementById("factura-documento");
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`${factura.numero.replace(/\//g, "-")}.pdf`);
    } finally {
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

      {/* Documento de factura */}
      <div id="factura-documento" className="bg-white text-black max-w-3xl mx-auto p-10 shadow-lg print:shadow-none print:p-6 rounded-lg">

        {/* Encabezado empresa */}
        <div className="flex justify-between items-start mb-8">
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

        <Separator className="my-6 bg-gray-200" />

        {/* Datos fiscales empresa */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Emisor</p>
            <p className="font-medium">{EMPRESA.nombre}</p>
            <p className="text-gray-600">RTN: <span className="font-mono">{EMPRESA.rtn}</span></p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Fechas</p>
            <p className="text-gray-600">Emisión: <span className="font-medium">{formatFecha(factura.fecha)}</span></p>
            <p className="text-gray-600">Vencimiento: <span className="font-medium">{formatFecha(factura.fechaVencimiento)}</span></p>
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
          <p className="font-semibold text-gray-700 mb-2">Facturar a:</p>
          <p className="font-medium text-gray-900">{factura.cliente.nombre}</p>
          {factura.cliente.rtn && <p className="text-gray-600">RTN: <span className="font-mono">{factura.cliente.rtn}</span></p>}
          {factura.cliente.direccion && <p className="text-gray-600">{factura.cliente.direccion}</p>}
          {factura.cliente.correo && <p className="text-gray-600">{factura.cliente.correo}</p>}
          {factura.cliente.telefono && <p className="text-gray-600">Tel: {factura.cliente.telefono}</p>}
        </div>

        {/* Tabla de servicios */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left py-2 font-semibold text-gray-700">Descripción</th>
              <th className="text-center py-2 font-semibold text-gray-700 w-16">Cant.</th>
              <th className="text-right py-2 font-semibold text-gray-700 w-28">Precio Unit.</th>
              <th className="text-right py-2 font-semibold text-gray-700 w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {factura.lineas.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2 text-gray-800">{l.descripcion}</td>
                <td className="py-2 text-center text-gray-600">{l.cantidad}</td>
                <td className="py-2 text-right font-mono text-gray-700">{formatLempiras(l.precioUnitario)}</td>
                <td className="py-2 text-right font-mono font-medium">{formatLempiras(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-mono">{formatLempiras(factura.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ISV (15%)</span>
              <span className="font-mono">{formatLempiras(factura.isv)}</span>
            </div>
            <Separator className="my-2 bg-gray-300" />
            <div className="flex justify-between font-bold text-base">
              <span>Total a Pagar</span>
              <span className="font-mono">{formatLempiras(factura.total)}</span>
            </div>
          </div>
        </div>

        {factura.notas && (
          <div className="mb-6 text-sm">
            <p className="font-semibold text-gray-700 mb-1">Notas:</p>
            <p className="text-gray-600">{factura.notas}</p>
          </div>
        )}

        <Separator className="my-6 bg-gray-200" />

        {/* Footer CAI */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-medium">CAI:</span> <span className="font-mono">{EMPRESA.cai}</span></p>
              <p><span className="font-medium">Fecha Límite Emisión:</span> {EMPRESA.fechaLimiteEmision}</p>
            </div>
            <div>
              <p><span className="font-medium">Rango Autorizado:</span></p>
              <p className="font-mono">Del N.{EMPRESA.rangoDesde}</p>
              <p className="font-mono">Al  N.{EMPRESA.rangoHasta}</p>
            </div>
          </div>
          <p className="text-center mt-3 text-gray-400">
            {EMPRESA.nombre} · {EMPRESA.correo} · Tel: {EMPRESA.telefono}
          </p>
        </div>
      </div>

      {/* Dialog confirmación anular */}
      <Dialog open={confirmandoAnular} onOpenChange={setConfirmandoAnular}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular factura</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea anular la factura <strong>{factura.numero}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoAnular(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarAnular}>Anular factura</Button>
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
