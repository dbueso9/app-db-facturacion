"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFactura, saveFactura } from "@/lib/store";
import { Factura, EstadoFactura } from "@/lib/types";
import { formatLempiras, formatFecha } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { ArrowLeft, Printer } from "lucide-react";

const BADGE_ESTADO: Record<EstadoFactura, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  emitida: { label: "Emitida", variant: "default" },
  pagada: { label: "Pagada", variant: "outline" },
  anulada: { label: "Anulada", variant: "destructive" },
};

export default function FacturaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [factura, setFactura] = useState<Factura | null>(null);

  useEffect(() => {
    const f = getFactura(id);
    if (!f) router.push("/facturas");
    else setFactura(f);
  }, [id, router]);

  function cambiarEstado(estado: string | null) {
    if (!estado) return;
    if (!factura) return;
    const actualizada = { ...factura, estado: estado as EstadoFactura };
    saveFactura(actualizada);
    setFactura(actualizada);
  }

  if (!factura) return null;

  const estado = BADGE_ESTADO[factura.estado];

  return (
    <>
      {/* Controles — no se imprimen */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <Select value={factura.estado} onValueChange={(v) => cambiarEstado(v as EstadoFactura)}>
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
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Documento de factura */}
      <div className="bg-white text-black max-w-3xl mx-auto p-10 shadow-lg print:shadow-none print:p-6 rounded-lg">

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
