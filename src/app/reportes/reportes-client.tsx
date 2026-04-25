"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factura, Cliente } from "@/lib/types";
import { formatLempiras, formatFecha, MESES_CORTO, MESES_LARGO } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { enviarEstadoCuenta } from "@/lib/actions/email";
import { ArrowLeft, TrendingUp, CheckCircle, Clock, FileText, FileSpreadsheet, FileDown, Send, XCircle, User } from "lucide-react";

const MESES_NOMBRES = MESES_LARGO;

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name === "facturado" ? "Facturado" : "Cobrado"}: <span className="font-mono font-semibold text-foreground">{formatLempiras(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function ReportesClient({ facturas, clientes }: { facturas: Factura[]; clientes: Cliente[] }) {
  const años = useMemo(() => {
    const set = new Set<number>();
    facturas.forEach((f) => set.add(new Date(f.fecha + "T00:00:00").getFullYear()));
    const arr = Array.from(set).sort((a, b) => b - a);
    if (!arr.length) arr.push(new Date().getFullYear());
    return arr;
  }, [facturas]);

  const [año, setAño] = useState<number>(años[0]);
  const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);

  const activas = facturas.filter((f) => f.estado !== "anulada");

  const dataMensual = useMemo(() => MESES_CORTO.map((mes, i) => {
    const del = activas.filter((f) => {
      const d = new Date(f.fecha + "T00:00:00");
      return d.getFullYear() === año && d.getMonth() === i;
    });
    return {
      mes,
      mesNombre: MESES_NOMBRES[i],
      mesNum: i + 1,
      facturado: del.reduce((s, f) => s + f.total, 0),
      cobrado: del.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0),
      pendiente: del.filter((f) => f.estado === "emitida").reduce((s, f) => s + f.total, 0),
      count: del.length,
    };
  }), [activas, año]);

  const totalAño = dataMensual.reduce((s, m) => s + m.facturado, 0);
  const cobradoAño = dataMensual.reduce((s, m) => s + m.cobrado, 0);
  const pendienteAño = dataMensual.reduce((s, m) => s + m.pendiente, 0);

  const reporteClientes = useMemo(() => {
    const mapa: Record<string, { cliente: Cliente; total: number; cobrado: number; pendiente: number; count: number }> = {};
    activas
      .filter((f) => new Date(f.fecha + "T00:00:00").getFullYear() === año)
      .forEach((f) => {
        if (!mapa[f.clienteId]) {
          const cl = clientes.find((c) => c.id === f.clienteId) || f.cliente;
          mapa[f.clienteId] = { cliente: cl, total: 0, cobrado: 0, pendiente: 0, count: 0 };
        }
        mapa[f.clienteId].total += f.total;
        mapa[f.clienteId].count += 1;
        if (f.estado === "pagada") mapa[f.clienteId].cobrado += f.total;
        if (f.estado === "emitida") mapa[f.clienteId].pendiente += f.total;
      });
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [activas, clientes, año]);

  const [mesFiltro, setMesFiltro] = useState<number | null>(null);

  // Estado de Cuenta
  const [clienteEstadoId, setClienteEstadoId] = useState<string>("");
  const [modalEmailEstado, setModalEmailEstado] = useState(false);
  const [emailParaEstado, setEmailParaEstado] = useState("");
  const [emailAsuntoEstado, setEmailAsuntoEstado] = useState("");
  const [emailMensajeEstado, setEmailMensajeEstado] = useState("");
  const [enviandoEstado, setEnviandoEstado] = useState(false);
  const [resultadoEstado, setResultadoEstado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [exportandoEstado, setExportandoEstado] = useState(false);

  const facturasMes = useMemo(() => {
    if (mesFiltro === null) return [];
    return activas
      .filter((f) => {
        const d = new Date(f.fecha + "T00:00:00");
        return d.getFullYear() === año && d.getMonth() + 1 === mesFiltro;
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [activas, año, mesFiltro]);

  const facturasDelAño = useMemo(
    () => activas
      .filter((f) => new Date(f.fecha + "T00:00:00").getFullYear() === año)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [activas, año]
  );

  const clienteEstado = clienteEstadoId ? clientes.find((c) => c.id === clienteEstadoId) ?? null : null;
  const facturasEstado = useMemo(
    () => clienteEstadoId
      ? facturas.filter((f) => f.clienteId === clienteEstadoId && f.estado !== "anulada").sort((a, b) => b.fecha.localeCompare(a.fecha))
      : [],
    [facturas, clienteEstadoId]
  );
  const estadoTotalFacturado = facturasEstado.reduce((s, f) => s + f.total, 0);
  const estadoTotalCobrado = facturasEstado.filter((f) => f.estado === "pagada").reduce((s, f) => s + f.total, 0);
  const estadoTotalPendiente = facturasEstado.filter((f) => f.estado === "emitida").reduce((s, f) => s + f.total, 0);

  function abrirEmailEstado() {
    if (!clienteEstado) return;
    const correos = [clienteEstado.correo, clienteEstado.correo2, clienteEstado.correo3].filter(Boolean).join(", ");
    setEmailParaEstado(correos);
    setEmailAsuntoEstado(`Estado de Cuenta — ${clienteEstado.nombre}`);
    setEmailMensajeEstado(`Estimado(a) ${clienteEstado.nombre},\n\nAdjunto encontrará su estado de cuenta actualizado con el detalle de facturas emitidas.\n\nPara cualquier consulta, no dude en contactarnos.\n\nAtentamente,\n${EMPRESA.nombre}`);
    setResultadoEstado(null);
    setModalEmailEstado(true);
  }

  async function enviarCorreoEstado() {
    if (!clienteEstado || !emailParaEstado.trim()) return;
    setEnviandoEstado(true);
    setResultadoEstado(null);
    try {
      let pdfBase64: string | undefined;
      try {
        const { generarHtmlEstadoCuenta } = await import("@/lib/email/estado-cuenta-html");
        const { pdfBase64FromHtml } = await import("@/lib/pdf-utils");
        pdfBase64 = await pdfBase64FromHtml(generarHtmlEstadoCuenta(clienteEstado, facturasEstado));
      } catch { /* sin adjunto */ }
      const res = await enviarEstadoCuenta(clienteEstado, facturasEstado, emailParaEstado.trim(), emailAsuntoEstado, emailMensajeEstado, pdfBase64);
      setResultadoEstado({ ok: res.ok, msg: res.ok ? (pdfBase64 ? "Correo enviado con PDF adjunto" : "Correo enviado") : res.error || "Error al enviar" });
      if (res.ok) setTimeout(() => setModalEmailEstado(false), 2000);
    } catch (e) {
      setResultadoEstado({ ok: false, msg: (e as Error).message });
    } finally {
      setEnviandoEstado(false);
    }
  }

  async function exportarPDFEstado() {
    if (!clienteEstado) return;
    setExportandoEstado(true);
    let iframe: HTMLIFrameElement | null = null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const { generarHtmlEstadoCuenta } = await import("@/lib/email/estado-cuenta-html");
      iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1200px;border:none;";
      document.body.appendChild(iframe);
      await new Promise<void>((resolve) => { iframe!.onload = () => resolve(); iframe!.srcdoc = generarHtmlEstadoCuenta(clienteEstado, facturasEstado); setTimeout(resolve, 1500); });
      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("No se pudo acceder al documento");
      const canvas = await html2canvas(iframeDoc.body, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: 794 });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, (canvas.height * pdfW) / canvas.width);
      pdf.save(`Estado-Cuenta-${clienteEstado.nombre.replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
      setExportandoEstado(false);
    }
  }

  async function exportarExcel() {
    setExportando("excel");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen mensual
      const ws1Data = [
        ["Mes", "Facturas", "Facturado (L.)", "Cobrado (L.)", "Por Cobrar (L.)"],
        ...dataMensual.filter((m) => m.count > 0).map((m) => [
          m.mesNombre, m.count, m.facturado, m.cobrado, m.pendiente,
        ]),
        [],
        ["TOTALES", dataMensual.reduce((s, m) => s + m.count, 0), totalAño, cobradoAño, pendienteAño],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      XLSX.utils.book_append_sheet(wb, ws1, "Resumen Mensual");

      // Hoja 2: Por cliente
      const ws2Data = [
        ["Cliente", "Código", "Facturas", "Facturado (L.)", "Cobrado (L.)", "Por Cobrar (L.)", "% Cobrado"],
        ...reporteClientes.map((r) => [
          r.cliente.nombre,
          r.cliente.codigo || "",
          r.count,
          r.total,
          r.cobrado,
          r.pendiente,
          r.total > 0 ? `${Math.round((r.cobrado / r.total) * 100)}%` : "0%",
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      XLSX.utils.book_append_sheet(wb, ws2, "Por Cliente");

      // Hoja 3: Todas las facturas del año
      const ws3Data = [
        ["Número", "Fecha", "Vencimiento", "Cliente", "RTN Cliente", "Proyecto", "Estado", "Método Pago", "Subtotal (L.)", "ISV (L.)", "Total (L.)"],
        ...facturasDelAño.map((f) => [
          f.numero,
          f.fecha,
          f.fechaVencimiento || "",
          f.cliente.nombre,
          f.cliente.rtn || "",
          f.nombreProyecto || "",
          f.estado,
          f.metodoPago || "",
          f.subtotal,
          f.isv,
          f.total,
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
      XLSX.utils.book_append_sheet(wb, ws3, "Facturas");

      XLSX.writeFile(wb, `Reporte_DBConsulting_${año}.xlsx`);
    } finally {
      setExportando(null);
    }
  }

  async function exportarPDF() {
    setExportando("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth();
      let y = 15;

      const addLine = (text: string, x: number, size = 10, bold = false) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.text(text, x, y);
      };

      const newLine = (extra = 6) => { y += extra; };

      // Header
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, pageW, 22, "F");
      doc.setTextColor(255, 255, 255);
      addLine("DB CONSULTING — REPORTE DE FACTURACIÓN", 14, 13, true);
      newLine(7);
      addLine(`Año ${año}`, 14, 10);
      y = 28;
      doc.setTextColor(17, 24, 39);

      newLine(4);

      // Resumen
      addLine("RESUMEN DEL AÑO", 14, 11, true);
      newLine(6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Facturado: L. ${totalAño.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`, 14, y);
      doc.text(`Total Cobrado: L. ${cobradoAño.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`, 80, y);
      doc.text(`Por Cobrar: L. ${pendienteAño.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`, 150, y);
      newLine(10);

      // Tabla mensual
      addLine("DETALLE MENSUAL", 14, 11, true);
      newLine(6);
      const colsM = [14, 55, 85, 125, 160];
      doc.setFillColor(243, 244, 246);
      doc.rect(12, y - 4, pageW - 24, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      ["Mes", "Facturas", "Facturado", "Cobrado", "Por Cobrar"].forEach((h, i) => doc.text(h, colsM[i], y));
      newLine(7);
      doc.setFont("helvetica", "normal");
      dataMensual.filter((m) => m.count > 0).forEach((m) => {
        if (y > 260) { doc.addPage(); y = 15; }
        doc.text(m.mesNombre, colsM[0], y);
        doc.text(String(m.count), colsM[1], y);
        doc.text(`L. ${m.facturado.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`, colsM[2], y);
        doc.text(`L. ${m.cobrado.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`, colsM[3], y);
        doc.text(m.pendiente > 0 ? `L. ${m.pendiente.toLocaleString("es-HN", { minimumFractionDigits: 2 })}` : "—", colsM[4], y);
        newLine(6);
      });

      newLine(4);
      if (y > 220) { doc.addPage(); y = 15; }

      // Tabla clientes
      addLine("POR CLIENTE", 14, 11, true);
      newLine(6);
      const colsC = [14, 70, 90, 125, 160];
      doc.setFillColor(243, 244, 246);
      doc.rect(12, y - 4, pageW - 24, 7, "F");
      doc.setFont("helvetica", "bold");
      ["Cliente", "Facturas", "Facturado", "Cobrado", "Por Cobrar"].forEach((h, i) => doc.text(h, colsC[i], y));
      newLine(7);
      doc.setFont("helvetica", "normal");
      reporteClientes.forEach((r) => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.text(r.cliente.nombre.slice(0, 30), colsC[0], y);
        doc.text(String(r.count), colsC[1], y);
        doc.text(`L. ${r.total.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`, colsC[2], y);
        doc.text(`L. ${r.cobrado.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`, colsC[3], y);
        doc.text(r.pendiente > 0 ? `L. ${r.pendiente.toLocaleString("es-HN", { minimumFractionDigits: 2 })}` : "—", colsC[4], y);
        newLine(6);
      });

      // Footer
      doc.setPage(doc.getNumberOfPages());
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `DB Consulting — Generado el ${new Date().toLocaleDateString("es-HN")}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );

      doc.save(`Reporte_DBConsulting_${año}.pdf`);
    } finally {
      setExportando(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground text-sm">Ingresos por período y cliente</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportarExcel}
            disabled={exportando !== null}
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-green-500" />
            {exportando === "excel" ? "Generando..." : "Excel"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarPDF}
            disabled={exportando !== null}
            title="Exportar a PDF"
          >
            <FileDown className="h-4 w-4 mr-1.5 text-red-400" />
            {exportando === "pdf" ? "Generando..." : "PDF"}
          </Button>
          <Select value={String(año)} onValueChange={(v) => { setAño(Number(v)); setMesFiltro(null); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {años.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumen del año */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Facturado {año}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono">{formatLempiras(totalAño)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Cobrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-green-400">{formatLempiras(cobradoAño)}</p>
            {totalAño > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((cobradoAño / totalAño) * 100)}% del total
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold font-mono text-yellow-400">{formatLempiras(pendienteAño)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica mensual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Ingresos mensuales {año}
            {mesFiltro && (
              <span className="ml-2 text-muted-foreground font-normal text-xs">
                — {MESES_NOMBRES[mesFiltro - 1]} seleccionado
                <button className="ml-2 underline" onClick={() => setMesFiltro(null)}>quitar filtro</button>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={dataMensual}
              barGap={4}
              onClick={(d) => { if (d?.activeLabel) { const m = dataMensual.find((x) => x.mes === d.activeLabel); if (m) setMesFiltro(m.mesNum); } }}
              style={{ cursor: "pointer" }}
            >
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="facturado" name="facturado" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {dataMensual.map((m, i) => (
                  <Cell key={i} fill={mesFiltro === m.mesNum ? "#6b7280" : "#374151"} />
                ))}
              </Bar>
              <Bar dataKey="cobrado" name="cobrado" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {dataMensual.map((m, i) => (
                  <Cell key={i} fill={mesFiltro === m.mesNum ? "#86efac" : "#4ade80"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#374151] inline-block" /> Facturado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Cobrado</span>
            <span className="text-xs opacity-60">Haz clic en un mes para ver sus facturas</span>
          </div>
        </CardContent>
      </Card>

      {/* Facturas del mes seleccionado */}
      {mesFiltro !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Facturas de {MESES_NOMBRES[mesFiltro - 1]} {año}
              <span className="ml-2 text-muted-foreground font-normal">({facturasMes.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {facturasMes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin facturas ese mes</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasMes.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/facturas/${f.id}`} className="hover:underline">{f.numero}</Link>
                      </TableCell>
                      <TableCell className="text-sm">{f.cliente.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.nombreProyecto || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatFecha(f.fecha)}</TableCell>
                      <TableCell>
                        <Badge variant={f.estado === "pagada" ? "outline" : f.estado === "anulada" ? "destructive" : f.estado === "emitida" ? "default" : "secondary"}>
                          {f.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatLempiras(f.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reporte por cliente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Por Cliente — {año}</CardTitle>
        </CardHeader>
        <CardContent>
          {reporteClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin facturas en {año}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Facturas</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                  <TableHead className="text-right">Cobrado</TableHead>
                  <TableHead className="text-right">Por Cobrar</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reporteClientes.map(({ cliente, total, cobrado, pendiente, count }) => {
                  const pct = total > 0 ? Math.round((cobrado / total) * 100) : 0;
                  return (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                          {cliente.nombre}
                        </Link>
                        {cliente.codigo && (
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{cliente.codigo}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{count}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatLempiras(total)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-400">{formatLempiras(cobrado)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-yellow-400">
                        {pendiente > 0 ? formatLempiras(pendiente) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Estado de Cuenta por Cliente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Estado de Cuenta por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 max-w-xs">
            <Label className="text-xs">Seleccionar cliente</Label>
            <Select value={clienteEstadoId} onValueChange={(v) => setClienteEstadoId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}{c.codigo ? ` (${c.codigo})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clienteEstado && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={exportarPDFEstado} disabled={exportandoEstado || facturasEstado.length === 0}>
                  <FileDown className="h-4 w-4 mr-1 text-red-400" />
                  {exportandoEstado ? "Generando..." : "Descargar PDF"}
                </Button>
                <Button variant="outline" size="sm" onClick={abrirEmailEstado} disabled={facturasEstado.length === 0}>
                  <Send className="h-4 w-4 mr-1" />
                  Enviar por Correo
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Facturado</p>
                  <p className="font-mono font-bold text-sm mt-1">{formatLempiras(estadoTotalFacturado)}</p>
                </div>
                <div className="border rounded-lg p-3 text-center bg-green-50/5 border-green-800/20">
                  <p className="text-xs text-green-400 uppercase tracking-wide">Cobrado</p>
                  <p className="font-mono font-bold text-sm text-green-400 mt-1">{formatLempiras(estadoTotalCobrado)}</p>
                </div>
                <div className="border rounded-lg p-3 text-center bg-yellow-50/5 border-yellow-800/20">
                  <p className="text-xs text-yellow-400 uppercase tracking-wide">Pendiente</p>
                  <p className="font-mono font-bold text-sm text-yellow-400 mt-1">{formatLempiras(estadoTotalPendiente)}</p>
                </div>
              </div>

              <Separator />

              {facturasEstado.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin facturas para este cliente</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facturasEstado.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">
                          <Link href={`/facturas/${f.id}`} className="hover:underline">{f.numero}</Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatFecha(f.fecha)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.nombreProyecto || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={f.estado === "pagada" ? "outline" : f.estado === "anulada" ? "destructive" : f.estado === "emitida" ? "default" : "secondary"}>
                            {f.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-sm">{formatLempiras(f.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog email estado de cuenta */}
      <Dialog open={modalEmailEstado} onOpenChange={(o) => { setModalEmailEstado(o); setResultadoEstado(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Estado de Cuenta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Para *</Label>
              <Input type="text" value={emailParaEstado} onChange={(e) => setEmailParaEstado(e.target.value)} placeholder="correo@cliente.com" />
              <p className="text-xs text-muted-foreground">Puede separar varios correos con coma</p>
            </div>
            <div className="space-y-1">
              <Label>Asunto</Label>
              <Input value={emailAsuntoEstado} onChange={(e) => setEmailAsuntoEstado(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Mensaje</Label>
              <Textarea value={emailMensajeEstado} onChange={(e) => setEmailMensajeEstado(e.target.value)} rows={5} />
            </div>
            {resultadoEstado && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${resultadoEstado.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                {resultadoEstado.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {resultadoEstado.msg}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEmailEstado(false)}>Cancelar</Button>
            <Button onClick={enviarCorreoEstado} disabled={!emailParaEstado.trim() || enviandoEstado}>
              <Send className="h-4 w-4 mr-1" />
              {enviandoEstado ? "Enviando..." : "Enviar con PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabla mensual detallada */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detalle mensual — {año}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-center">Facturas</TableHead>
                <TableHead className="text-right">Facturado</TableHead>
                <TableHead className="text-right">Cobrado</TableHead>
                <TableHead className="text-right">Por Cobrar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataMensual.filter((m) => m.count > 0).map((m) => (
                <TableRow
                  key={m.mes}
                  className={`cursor-pointer hover:bg-accent ${mesFiltro === m.mesNum ? "bg-accent" : ""}`}
                  onClick={() => setMesFiltro(mesFiltro === m.mesNum ? null : m.mesNum)}
                >
                  <TableCell className="font-medium">{m.mesNombre}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{m.count}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatLempiras(m.facturado)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-green-400">{formatLempiras(m.cobrado)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-yellow-400">
                    {m.pendiente > 0 ? formatLempiras(m.pendiente) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {dataMensual.every((m) => m.count === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin facturas en {año}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
