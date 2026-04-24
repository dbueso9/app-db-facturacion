"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { saveContrato, deleteContrato, toggleContratoActivo } from "@/lib/actions/contratos";
import { saveHitos, marcarHitoFacturado } from "@/lib/actions/hitos";
import { calcularMontoContrato, descripcionFacturaContrato } from "@/lib/contratos-utils";
import { crearNumeroFactura, saveFactura } from "@/lib/actions/facturas";
import { enviarFacturasAgrupadas } from "@/lib/actions/email";
import { Cliente, Contrato, TipoContrato, Factura, Hito, EstadoHito } from "@/lib/types";
import { TasaCambio } from "@/lib/actions/tasa-cambio";
import { formatLempiras, formatFecha, generarId } from "@/lib/utils";
import { ArrowLeft, Plus, Pencil, Trash2, FileText, Zap, Power, Send, CheckCircle, XCircle, Settings2, Lock } from "lucide-react";

const TIPO_LABELS: Record<TipoContrato, string> = {
  mantenimiento: "Mantenimiento / Soporte",
  hosting: "Hosting",
  soporte: "Soporte Técnico",
  proyecto_app: "Proyecto / App",
  otro: "Otro",
};

const TIPO_BADGE: Record<TipoContrato, string> = {
  mantenimiento: "bg-orange-100 text-orange-800",
  hosting: "bg-blue-100 text-blue-800",
  soporte: "bg-green-100 text-green-800",
  proyecto_app: "bg-purple-100 text-purple-800",
  otro: "bg-gray-100 text-gray-800",
};

type FormContrato = Omit<Contrato, "id" | "clienteId" | "creadoEn" | "activo">;
type FormHito = { id: string; nombre: string; porcentaje: string };

const EMPTY_CONTRATO: FormContrato = {
  nombreProyecto: "",
  tipo: "proyecto_app",
  valorBase: 0,
  fechaInicio: new Date().toISOString().split("T")[0],
  diaFacturacion: 1,
  notas: "",
};

interface Props {
  cliente: Cliente;
  contratos: Contrato[];
  facturas: Factura[];
  tasaCambio: TasaCambio | null;
  hitosMap: Record<string, Hito[]>;
  isAdmin: boolean;
  isGestion: boolean;
}

function ProgresoHitos({ hitos, valorBase, facturas }: { hitos: Hito[]; valorBase: number; facturas: Factura[] }) {
  const facturaById = new Map(facturas.map((f) => [f.id, f]));
  const totalMonto = hitos.reduce((s, h) => s + h.monto, 0);
  const facturado = hitos.filter((h) => h.estado === "facturado").reduce((s, h) => s + h.monto, 0);
  const cobrado = hitos
    .filter((h) => h.estado === "facturado" && h.facturaId && facturaById.get(h.facturaId)?.estado === "pagada")
    .reduce((s, h) => s + h.monto, 0);
  const pendiente = totalMonto - facturado;
  const pctFacturado = totalMonto > 0 ? (facturado / totalMonto) * 100 : 0;
  const pctCobrado = totalMonto > 0 ? (cobrado / totalMonto) * 100 : 0;

  const todosPagados =
    hitos.length > 0 &&
    hitos.every((h) => h.estado === "facturado" && h.facturaId && facturaById.get(h.facturaId)?.estado === "pagada");
  const todosFacturados = hitos.length > 0 && hitos.every((h) => h.estado === "facturado");
  const algunoFacturado = hitos.some((h) => h.estado === "facturado");

  let statusLabel = "Pendiente de inicio";
  let statusClass = "text-muted-foreground bg-muted/40";
  if (todosPagados) {
    statusLabel = "Cerrado ✓";
    statusClass = "text-green-700 bg-green-100/20 border border-green-500/30";
  } else if (todosFacturados) {
    statusLabel = "Facturado completo";
    statusClass = "text-blue-400 bg-blue-100/10 border border-blue-400/30";
  } else if (algunoFacturado) {
    statusLabel = "En progreso";
    statusClass = "text-amber-500 bg-amber-100/10 border border-amber-400/30";
  }

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Progreso de facturación</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pctFacturado)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso del proyecto: ${Math.round(pctFacturado)}% facturado, ${Math.round(pctCobrado)}% cobrado`}
        className="h-2 bg-muted rounded-full overflow-hidden relative"
      >
        <div
          className="absolute inset-y-0 left-0 bg-green-400/40 rounded-full transition-all duration-300"
          style={{ width: `${pctFacturado}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${pctCobrado}%` }}
        />
      </div>
      <div className="flex justify-between text-xs gap-2 flex-wrap">
        <span className="text-green-500">
          Cobrado: <span className="font-mono font-semibold">{formatLempiras(cobrado)}</span>
        </span>
        {facturado > cobrado && (
          <span className="text-amber-500">
            Emitido: <span className="font-mono">{formatLempiras(facturado - cobrado)}</span>
          </span>
        )}
        <span className="text-muted-foreground">
          Pendiente: <span className="font-mono">{formatLempiras(pendiente)}</span>
        </span>
      </div>
      {totalMonto !== valorBase && (
        <p className="text-xs text-amber-600">⚠ Los hitos suman {formatLempiras(totalMonto)} (base del contrato: {formatLempiras(valorBase)})</p>
      )}
    </div>
  );
}

export default function ClienteDetalleClient({
  cliente, contratos: init, facturas, tasaCambio, hitosMap: initHitosMap, isAdmin, isGestion,
}: Props) {
  const router = useRouter();
  const [contratos, setContratos] = useState<Contrato[]>(init);
  const [hitosMap, setHitosMap] = useState<Record<string, Hito[]>>(initHitosMap);

  // Contrato dialog
  const [abierto, setAbierto] = useState(false);
  const [formContrato, setFormContrato] = useState<FormContrato>(EMPTY_CONTRATO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Hitos dialog
  const [modalHitos, setModalHitos] = useState(false);
  const [contratoHitosId, setContratoHitosId] = useState<string | null>(null);
  const [formHitos, setFormHitos] = useState<FormHito[]>([]);
  const [errorHitos, setErrorHitos] = useState<string | null>(null);
  const [guardandoHitos, setGuardandoHitos] = useState(false);

  // Invoice generation
  const [generando, setGenerando] = useState<string | null>(null);

  // Email
  const [modalEmail, setModalEmail] = useState(false);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<Set<string>>(new Set());
  const [emailPara, setEmailPara] = useState(cliente.correo || "");
  const [emailAsunto, setEmailAsunto] = useState(`Facturas — ${cliente.nombre}`);
  const [emailMensaje, setEmailMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [envioResultado, setEnvioResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anoActual = hoy.getFullYear();

  // --- Contrato CRUD ---
  function abrirContrato(c?: Contrato) {
    if (c) {
      setEditandoId(c.id);
      setFormContrato({ nombreProyecto: c.nombreProyecto, tipo: c.tipo, valorBase: c.valorBase, fechaInicio: c.fechaInicio, diaFacturacion: c.diaFacturacion, notas: c.notas });
    } else {
      setEditandoId(null);
      setFormContrato(EMPTY_CONTRATO);
    }
    setAbierto(true);
  }

  async function guardarContrato() {
    if (!formContrato.nombreProyecto.trim() || formContrato.valorBase <= 0) return;
    setGuardando(true);
    try {
      const contrato: Contrato = {
        id: editandoId || generarId(),
        clienteId: cliente.id,
        activo: true,
        creadoEn: new Date().toISOString(),
        ...formContrato,
      };
      await saveContrato(contrato);
      setAbierto(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarContrato(id: string) {
    await deleteContrato(id);
    setContratos((prev) => prev.filter((c) => c.id !== id));
    const newMap = { ...hitosMap };
    delete newMap[id];
    setHitosMap(newMap);
    router.refresh();
  }

  async function toggleActivo(contrato: Contrato) {
    await toggleContratoActivo(contrato.id, !contrato.activo);
    setContratos((prev) => prev.map((c) => c.id === contrato.id ? { ...c, activo: !c.activo } : c));
  }

  // --- Hitos CRUD ---
  function abrirHitos(contrato: Contrato) {
    setContratoHitosId(contrato.id);
    const existing = hitosMap[contrato.id] || [];
    if (existing.length > 0) {
      setFormHitos(existing.map((h) => ({ id: h.id, nombre: h.nombre, porcentaje: String(h.porcentaje) })));
    } else {
      setFormHitos([
        { id: generarId(), nombre: "Anticipo", porcentaje: "50" },
        { id: generarId(), nombre: "Entrega Final", porcentaje: "50" },
      ]);
    }
    setErrorHitos(null);
    setModalHitos(true);
  }

  function addHitoRow() {
    setFormHitos((prev) => [...prev, { id: generarId(), nombre: "", porcentaje: "" }]);
  }

  function removeHitoRow(idx: number) {
    setFormHitos((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateHitoRow(idx: number, field: "nombre" | "porcentaje", value: string) {
    setFormHitos((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  }

  const sumaActual = formHitos.reduce((s, h) => s + (parseFloat(h.porcentaje) || 0), 0);

  async function guardarHitos() {
    const contrato = contratos.find((c) => c.id === contratoHitosId);
    if (!contrato) return;

    if (Math.abs(sumaActual - 100) > 0.01) {
      setErrorHitos(`Los porcentajes deben sumar exactamente 100% (actualmente ${sumaActual.toFixed(2)}%)`);
      return;
    }
    if (formHitos.some((h) => !h.nombre.trim())) {
      setErrorHitos("Todos los hitos deben tener un nombre");
      return;
    }

    setGuardandoHitos(true);
    setErrorHitos(null);
    try {
      const existingHitos = hitosMap[contrato.id] || [];
      const existingMap = new Map(existingHitos.map((h) => [h.id, h]));

      const hitos: Omit<Hito, "contratoId" | "creadoEn">[] = formHitos.map((h, idx) => {
        const pct = parseFloat(h.porcentaje);
        const monto = Number(((contrato.valorBase * pct) / 100).toFixed(2));
        const prev = existingMap.get(h.id);
        return {
          id: h.id,
          nombre: h.nombre.trim(),
          porcentaje: pct,
          monto,
          estado: (prev?.estado || "pendiente") as EstadoHito,
          facturaId: prev?.facturaId,
          orden: idx,
        };
      });

      await saveHitos(contrato.id, hitos);
      setHitosMap((prev) => ({ ...prev, [contrato.id]: hitos.map((h) => ({ ...h, contratoId: contrato.id, creadoEn: new Date().toISOString() })) }));
      setModalHitos(false);
    } catch (e) {
      setErrorHitos(e instanceof Error ? e.message : "Error al guardar hitos");
    } finally {
      setGuardandoHitos(false);
    }
  }

  // --- Generar Factura desde Hito ---
  async function generarFacturaHito(contrato: Contrato, hito: Hito) {
    setGenerando(hito.id);
    try {
      const { secuencia, numero } = await crearNumeroFactura();
      const descripcion = `${contrato.nombreProyecto} — ${hito.nombre} (${hito.porcentaje}%)`;
      const sub = hito.monto;
      const isvCalc = Number((sub * 0.15).toFixed(2));

      const factura: Factura = {
        id: generarId(),
        numero,
        secuencia,
        fecha: hoy.toISOString().split("T")[0],
        fechaVencimiento: new Date(Date.now() + 28 * 86400000).toISOString().split("T")[0],
        clienteId: cliente.id,
        cliente,
        lineas: [{ id: generarId(), descripcion, cantidad: 1, precioUnitario: sub, subtotal: sub }],
        subtotal: sub,
        isv: isvCalc,
        total: sub + isvCalc,
        estado: "emitida",
        nombreProyecto: contrato.nombreProyecto,
        tasaCambio: tasaCambio?.venta,
        notas: "",
        creadaEn: new Date().toISOString(),
      };

      await saveFactura(factura);
      await marcarHitoFacturado(hito.id, factura.id);
      setHitosMap((prev) => ({
        ...prev,
        [contrato.id]: (prev[contrato.id] || []).map((h) =>
          h.id === hito.id ? { ...h, estado: "facturado" as EstadoHito, facturaId: factura.id } : h
        ),
      }));
      router.push(`/facturas/${factura.id}`);
    } finally {
      setGenerando(null);
    }
  }

  // --- Factura desde Contrato (sin hitos) ---
  async function generarFacturaContrato(contrato: Contrato) {
    setGenerando(contrato.id);
    try {
      const monto = calcularMontoContrato(contrato, anoActual, mesActual);
      const descripcion = descripcionFacturaContrato(contrato, anoActual, mesActual);
      const { secuencia, numero } = await crearNumeroFactura();
      const isvCalc = Number((monto * 0.15).toFixed(2));

      const factura: Factura = {
        id: generarId(),
        numero,
        secuencia,
        fecha: hoy.toISOString().split("T")[0],
        fechaVencimiento: new Date(Date.now() + 28 * 86400000).toISOString().split("T")[0],
        clienteId: cliente.id,
        cliente,
        lineas: [{ id: generarId(), descripcion, cantidad: 1, precioUnitario: monto, subtotal: monto }],
        subtotal: monto,
        isv: isvCalc,
        total: monto + isvCalc,
        estado: "emitida",
        nombreProyecto: contrato.nombreProyecto,
        tasaCambio: tasaCambio?.venta,
        notas: "",
        creadaEn: new Date().toISOString(),
      };

      await saveFactura(factura);
      router.push(`/facturas/${factura.id}`);
    } finally {
      setGenerando(null);
    }
  }

  // --- Email ---
  async function enviarSeleccionadas() {
    const seleccionadas = facturas.filter((f) => facturasSeleccionadas.has(f.id));
    if (seleccionadas.length === 0) return;
    setEnviando(true);
    setEnvioResultado(null);
    try {
      const { generarHtmlFactura } = await import("@/lib/email/factura-html");
      const { pdfBase64FromHtml } = await import("@/lib/pdf-utils");
      const pdfs: { filename: string; content: string }[] = [];
      for (const f of seleccionadas) {
        const base64 = await pdfBase64FromHtml(generarHtmlFactura(f));
        pdfs.push({ filename: `${f.numero}.pdf`, content: base64 });
      }
      const res = await enviarFacturasAgrupadas(seleccionadas, emailPara.trim(), emailAsunto, emailMensaje, pdfs);
      setEnvioResultado({ ok: res.ok, msg: res.ok ? `${seleccionadas.length} factura(s) enviadas con PDF adjunto` : res.error || "Error al enviar" });
      if (res.ok) { setFacturasSeleccionadas(new Set()); setTimeout(() => setModalEmail(false), 2000); }
    } finally {
      setEnviando(false);
    }
  }

  function toggleSeleccion(id: string) {
    setFacturasSeleccionadas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalFacturado = facturas.filter((f) => f.estado !== "anulada").reduce((s, f) => s + f.total, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono">{cliente.codigo || "—"}</Badge>
            <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
          </div>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            {cliente.rtn && <span>RTN: <span className="font-mono">{cliente.rtn}</span></span>}
            {cliente.correo && <span>{cliente.correo}</span>}
            {cliente.telefono && <span>{cliente.telefono}</span>}
          </div>
        </div>
        <Button render={<Link href="/facturas/nueva" />} variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" />
          Nueva Factura
        </Button>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Facturado</p>
            <p className="text-2xl font-bold font-mono mt-1">{formatLempiras(totalFacturado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Facturas</p>
            <p className="text-2xl font-bold mt-1">{facturas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Contratos Activos</p>
            <p className="text-2xl font-bold mt-1">{contratos.filter((c) => c.activo).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Servicios Contratados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Servicios Contratados</CardTitle>
          {!isGestion && (
            <Button size="sm" onClick={() => abrirContrato()}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Servicio
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin servicios contratados — agrega el primer servicio</p>
          ) : (
            <div className="space-y-4">
              {contratos.map((c) => {
                const hitos = hitosMap[c.id] || [];
                const tieneHitos = hitos.length > 0;
                const hayFacturado = hitos.some((h) => h.estado === "facturado");
                const puedeEditarHitos = isAdmin || !hayFacturado;
                const monto = calcularMontoContrato(c, anoActual, mesActual);

                return (
                  <div key={c.id} className={`border rounded-lg p-4 ${!c.activo ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{c.nombreProyecto}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_BADGE[c.tipo]}`}>
                            {TIPO_LABELS[c.tipo]}
                          </span>
                          {!c.activo && <Badge variant="secondary">Inactivo</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                          <span>Base: <span className="font-mono">{formatLempiras(c.valorBase)}</span></span>
                          {c.tipo === "mantenimiento" ? (
                            <span>Mensual este mes: <span className="font-mono font-semibold text-foreground">{formatLempiras(monto)}</span></span>
                          ) : c.tipo !== "proyecto_app" ? (
                            <span>Mensual: <span className="font-mono font-semibold text-foreground">{formatLempiras(monto)}</span></span>
                          ) : null}
                          <span>Inicio: {formatFecha(c.fechaInicio)}</span>
                        </div>
                        {c.notas && <p className="text-xs text-muted-foreground mt-1 italic">{c.notas}</p>}

                        {/* Hitos de Proyecto */}
                        {c.tipo === "proyecto_app" && (
                          <div className="mt-3">
                            {tieneHitos ? (
                              <>
                                <ProgresoHitos hitos={hitos} valorBase={c.valorBase} facturas={facturas} />
                                <div className="mt-3 space-y-1">
                                  {hitos.map((h) => {
                                    const facturaHito = h.facturaId ? facturas.find((f) => f.id === h.facturaId) : undefined;
                                    const esPagada = facturaHito?.estado === "pagada";
                                    return (
                                    <div key={h.id} className="flex items-center justify-between text-sm py-1 border-b border-muted last:border-0">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`w-2 h-2 rounded-full ${
                                            h.estado === "facturado"
                                              ? esPagada ? "bg-green-500" : "bg-amber-400"
                                              : "bg-muted-foreground/40"
                                          }`}
                                          aria-hidden="true"
                                        />
                                        <span className={h.estado === "facturado" && esPagada ? "line-through text-muted-foreground" : ""}>{h.nombre}</span>
                                        <span className="text-xs text-muted-foreground">{h.porcentaje}%</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs">{formatLempiras(h.monto)}</span>
                                        {h.estado === "facturado" ? (
                                          h.facturaId ? (
                                            <Link href={`/facturas/${h.facturaId}`}>
                                              <Badge
                                                variant="outline"
                                                className={`text-xs cursor-pointer ${
                                                  esPagada
                                                    ? "text-green-600 border-green-600 hover:bg-green-50/20"
                                                    : "text-amber-500 border-amber-500 hover:bg-amber-50/20"
                                                }`}
                                              >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                {esPagada ? "Cobrado ✓" : "Emitida"}
                                              </Badge>
                                            </Link>
                                          ) : (
                                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                              <CheckCircle className="h-3 w-3 mr-1" />Facturado
                                            </Badge>
                                          )
                                        ) : (
                                          !isGestion ? (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-7 text-xs"
                                              onClick={() => generarFacturaHito(c, h)}
                                              disabled={!c.activo || generando === h.id}
                                            >
                                              <Zap className="h-3 w-3 mr-1" />
                                              {generando === h.id ? "Generando..." : "Generar Factura"}
                                            </Button>
                                          ) : null
                                        )}
                                      </div>
                                    </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">Sin hitos definidos — configura el plan de pagos del proyecto</p>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-2 h-7 text-xs gap-1"
                              onClick={() => abrirHitos(c)}
                              disabled={!puedeEditarHitos}
                              title={!puedeEditarHitos ? "Solo el administrador puede modificar hitos con facturación iniciada" : ""}
                            >
                              {puedeEditarHitos ? <Settings2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                              {tieneHitos ? "Editar Plan de Pagos" : "Definir Plan de Pagos"}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 shrink-0">
                        {!isGestion && (c.tipo !== "proyecto_app" || !tieneHitos) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => generarFacturaContrato(c)}
                            disabled={!c.activo || generando === c.id}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            {generando === c.id ? "Generando..." : "Facturar"}
                          </Button>
                        )}
                        {!isGestion && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => toggleActivo(c)} title={c.activo ? "Desactivar" : "Activar"}>
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => abrirContrato(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => eliminarContrato(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Facturas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Historial de Facturas</CardTitle>
          {facturas.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => { setFacturasSeleccionadas(new Set(facturas.filter((f) => f.estado !== "anulada").map((f) => f.id))); setModalEmail(true); }}>
              <Send className="h-4 w-4 mr-1" />
              Enviar por Correo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {facturas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin facturas emitidas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturas.map((f) => (
                  <TableRow key={f.id} className={facturasSeleccionadas.has(f.id) ? "bg-blue-50/10" : ""}>
                    <TableCell>
                      <input type="checkbox" checked={facturasSeleccionadas.has(f.id)} onChange={() => toggleSeleccion(f.id)} disabled={f.estado === "anulada"} className="rounded" />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/facturas/${f.id}`} className="hover:underline">{f.numero}</Link>
                    </TableCell>
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
          {facturasSeleccionadas.size > 0 && (
            <div className="flex items-center justify-between mt-3 p-3 bg-blue-50/10 border border-blue-200/30 rounded-lg text-sm">
              <span className="text-blue-400">{facturasSeleccionadas.size} factura(s) seleccionada(s)</span>
              <Button size="sm" onClick={() => setModalEmail(true)}>
                <Send className="h-4 w-4 mr-1" />Enviar seleccionadas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Contrato */}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Servicio" : "Agregar Servicio Contratado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del Proyecto / Servicio *</Label>
              <Input value={formContrato.nombreProyecto} onChange={(e) => setFormContrato({ ...formContrato, nombreProyecto: e.target.value })} placeholder="Ej: App Inventario, Portal Web, etc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Servicio *</Label>
                <Select value={formContrato.tipo} onValueChange={(v) => setFormContrato({ ...formContrato, tipo: v as TipoContrato })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mantenimiento">Mantenimiento / Soporte (17% anual)</SelectItem>
                    <SelectItem value="hosting">Hosting (mensual fijo)</SelectItem>
                    <SelectItem value="soporte">Soporte Técnico (mensual fijo)</SelectItem>
                    <SelectItem value="proyecto_app">Proyecto / App (hitos)</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{formContrato.tipo === "mantenimiento" ? "Valor del Proyecto (base 17%)" : "Valor Total"} *</Label>
                <Input type="number" min="0" step="0.01" value={formContrato.valorBase || ""} onChange={(e) => setFormContrato({ ...formContrato, valorBase: Number(e.target.value) })} placeholder="0.00" className="font-mono" />
                {formContrato.tipo === "mantenimiento" && formContrato.valorBase > 0 && (
                  <p className="text-xs text-muted-foreground">Anual: <span className="font-mono font-semibold">{formatLempiras(formContrato.valorBase * 0.17)}</span></p>
                )}
                {formContrato.tipo === "proyecto_app" && (
                  <p className="text-xs text-muted-foreground">Se distribuirá entre los hitos del proyecto</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha de Inicio *</Label>
                <Input type="date" value={formContrato.fechaInicio} onChange={(e) => setFormContrato({ ...formContrato, fechaInicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Día de Facturación</Label>
                <Select value={String(formContrato.diaFacturacion)} onValueChange={(v) => setFormContrato({ ...formContrato, diaFacturacion: Number(v) as 1 | 2 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Día 1 de cada mes</SelectItem>
                    <SelectItem value="2">Día 2 de cada mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={formContrato.notas} onChange={(e) => setFormContrato({ ...formContrato, notas: e.target.value })} rows={2} />
            </div>
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardarContrato} disabled={!formContrato.nombreProyecto.trim() || formContrato.valorBase <= 0 || guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hitos */}
      <Dialog open={modalHitos} onOpenChange={setModalHitos}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Plan de Pagos — Hitos del Proyecto</DialogTitle>
            <DialogDescription>
              {contratos.find((c) => c.id === contratoHitosId)?.nombreProyecto} · Base: {formatLempiras(contratos.find((c) => c.id === contratoHitosId)?.valorBase || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-6">Nombre del Hito</span>
              <span className="col-span-3 text-center">%</span>
              <span className="col-span-2 text-right">Monto</span>
              <span className="col-span-1"></span>
            </div>
            {formHitos.map((h, idx) => {
              const contratoBase = contratos.find((c) => c.id === contratoHitosId)?.valorBase || 0;
              const pct = parseFloat(h.porcentaje) || 0;
              const monto = (contratoBase * pct) / 100;
              const existingHitos = hitosMap[contratoHitosId || ""] || [];
              const existingHito = existingHitos.find((e) => e.id === h.id);
              const yaFacturado = existingHito?.estado === "facturado";

              return (
                <div key={h.id} className={`grid grid-cols-12 gap-2 items-center ${yaFacturado ? "opacity-60" : ""}`}>
                  <div className="col-span-6">
                    <Input
                      value={h.nombre}
                      onChange={(e) => updateHitoRow(idx, "nombre", e.target.value)}
                      placeholder="Ej: Anticipo, Pruebas..."
                      disabled={yaFacturado}
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
                      onChange={(e) => updateHitoRow(idx, "porcentaje", e.target.value)}
                      disabled={yaFacturado}
                      className="h-8 text-sm text-center"
                    />
                  </div>
                  <div className="col-span-2 text-right text-xs font-mono text-muted-foreground">
                    {formatLempiras(monto)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {yaFacturado ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHitoRow(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" onClick={addHitoRow} className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Agregar Hito
            </Button>

            {/* Indicador suma */}
            <div className={`flex items-center justify-between text-sm px-2 py-1.5 rounded ${Math.abs(sumaActual - 100) < 0.01 ? "bg-green-50/10 text-green-500" : "bg-red-950/30 text-red-400"}`}>
              <span>Suma de porcentajes</span>
              <span className="font-mono font-bold">{sumaActual.toFixed(2)}% / 100%</span>
            </div>

            {errorHitos && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800 rounded px-3 py-2">
                <XCircle className="h-4 w-4 shrink-0" />
                {errorHitos}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalHitos(false)}>Cancelar</Button>
            <Button onClick={guardarHitos} disabled={guardandoHitos || Math.abs(sumaActual - 100) > 0.01}>
              {guardandoHitos ? "Guardando..." : "Guardar Plan de Pagos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Email */}
      <Dialog open={modalEmail} onOpenChange={(o) => { setModalEmail(o); setEnvioResultado(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Facturas por Correo</DialogTitle>
            <DialogDescription>{facturasSeleccionadas.size} factura(s) seleccionada(s) para {cliente.nombre}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto text-sm">
              {facturas.filter((f) => f.estado !== "anulada").map((f) => (
                <label key={f.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
                  <input type="checkbox" checked={facturasSeleccionadas.has(f.id)} onChange={() => toggleSeleccion(f.id)} className="rounded" />
                  <span className="font-mono text-xs flex-1">{f.numero}</span>
                  <span className="text-muted-foreground text-xs">{f.nombreProyecto || f.fecha}</span>
                  <span className="font-mono font-semibold">{formatLempiras(f.total)}</span>
                </label>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Para *</Label>
              <Input type="email" value={emailPara} onChange={(e) => setEmailPara(e.target.value)} placeholder="correo@cliente.com" />
            </div>
            <div className="space-y-1">
              <Label>Asunto</Label>
              <Input value={emailAsunto} onChange={(e) => setEmailAsunto(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Mensaje (opcional)</Label>
              <Textarea value={emailMensaje} onChange={(e) => setEmailMensaje(e.target.value)} rows={2} />
            </div>
            {envioResultado && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${envioResultado.ok ? "bg-green-50/10 text-green-600" : "bg-red-50/10 text-red-400"}`}>
                {envioResultado.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {envioResultado.msg}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEmail(false)}>Cancelar</Button>
            <Button onClick={enviarSeleccionadas} disabled={facturasSeleccionadas.size === 0 || !emailPara.trim() || enviando}>
              <Send className="h-4 w-4 mr-1" />
              {enviando ? "Preparando PDFs..." : `Enviar con PDF${facturasSeleccionadas.size > 1 ? ` (${facturasSeleccionadas.size})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
