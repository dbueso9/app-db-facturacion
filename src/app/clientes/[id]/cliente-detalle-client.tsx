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
import { calcularMontoContrato, descripcionFacturaContrato } from "@/lib/contratos-utils";
import { crearNumeroFactura, saveFactura } from "@/lib/actions/facturas";
import { enviarFacturasAgrupadas } from "@/lib/actions/email";
import { Cliente, Contrato, TipoContrato, Factura } from "@/lib/types";
import { TasaCambio } from "@/lib/actions/tasa-cambio";
import { formatLempiras, formatFecha, generarId } from "@/lib/utils";
import { ArrowLeft, Plus, Pencil, Trash2, FileText, Zap, Power, Send, CheckCircle, XCircle } from "lucide-react";

const TIPO_LABELS: Record<TipoContrato, string> = {
  mantenimiento: "Mantenimiento / Soporte",
  hosting: "Hosting",
  proyecto_app: "Proyecto / App",
  otro: "Otro",
};

const TIPO_BADGE: Record<TipoContrato, string> = {
  mantenimiento: "bg-orange-100 text-orange-800",
  hosting: "bg-blue-100 text-blue-800",
  proyecto_app: "bg-purple-100 text-purple-800",
  otro: "bg-gray-100 text-gray-800",
};

type FormData = Omit<Contrato, "id" | "clienteId" | "creadoEn" | "activo">;

const EMPTY_FORM: FormData = {
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
}

export default function ClienteDetalleClient({ cliente, contratos: init, facturas, tasaCambio }: Props) {
  const router = useRouter();
  const [contratos, setContratos] = useState<Contrato[]>(init);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState<string | null>(null);
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

  function abrir(c?: Contrato) {
    if (c) {
      setEditandoId(c.id);
      setForm({
        nombreProyecto: c.nombreProyecto,
        tipo: c.tipo,
        valorBase: c.valorBase,
        fechaInicio: c.fechaInicio,
        diaFacturacion: c.diaFacturacion,
        notas: c.notas,
      });
    } else {
      setEditandoId(null);
      setForm(EMPTY_FORM);
    }
    setAbierto(true);
  }

  async function guardar() {
    if (!form.nombreProyecto.trim() || form.valorBase <= 0) return;
    setGuardando(true);
    try {
      const contrato: Contrato = {
        id: editandoId || generarId(),
        clienteId: cliente.id,
        activo: true,
        creadoEn: new Date().toISOString(),
        ...form,
      };
      await saveContrato(contrato);
      setAbierto(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    await deleteContrato(id);
    setContratos((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  async function toggleActivo(contrato: Contrato) {
    await toggleContratoActivo(contrato.id, !contrato.activo);
    setContratos((prev) => prev.map((c) => c.id === contrato.id ? { ...c, activo: !c.activo } : c));
  }

  async function generarFactura(contrato: Contrato) {
    setGenerando(contrato.id);
    try {
      const monto = calcularMontoContrato(contrato, anoActual, mesActual);
      const descripcion = descripcionFacturaContrato(contrato, anoActual, mesActual);
      const { secuencia, numero } = await crearNumeroFactura();
      const sub = monto;
      const isvCalc = sub * 0.15;

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
      router.push(`/facturas/${factura.id}`);
    } finally {
      setGenerando(null);
    }
  }

  async function enviarSeleccionadas() {
    const seleccionadas = facturas.filter((f) => facturasSeleccionadas.has(f.id));
    if (seleccionadas.length === 0) return;
    setEnviando(true);
    setEnvioResultado(null);
    try {
      const res = await enviarFacturasAgrupadas(seleccionadas, emailPara.trim(), emailAsunto, emailMensaje);
      setEnvioResultado({ ok: res.ok, msg: res.ok ? `${seleccionadas.length} factura(s) enviadas` : res.error || "Error al enviar" });
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

  const totalFacturado = facturas
    .filter((f) => f.estado !== "anulada")
    .reduce((s, f) => s + f.total, 0);

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
        <Button render={<Link href={`/facturas/nueva`} />} variant="outline" size="sm">
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

      {/* Contratos / Servicios contratados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Servicios Contratados</CardTitle>
          <Button size="sm" onClick={() => abrir()}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar Servicio
          </Button>
        </CardHeader>
        <CardContent>
          {contratos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin servicios contratados — agrega el primer servicio
            </p>
          ) : (
            <div className="space-y-3">
              {contratos.map((c) => {
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
                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                          <span>
                            Base: <span className="font-mono">{formatLempiras(c.valorBase)}</span>
                          </span>
                          {c.tipo === "mantenimiento" ? (
                            <span>
                              Mantenimiento anual: <span className="font-mono font-semibold text-foreground">{formatLempiras(c.valorBase * 0.17)}</span>
                              {" · "}Este mes: <span className="font-mono text-foreground">{formatLempiras(monto)}</span>
                            </span>
                          ) : (
                            <span>
                              Mensual: <span className="font-mono font-semibold text-foreground">{formatLempiras(monto)}</span>
                            </span>
                          )}
                          <span>Inicio: {formatFecha(c.fechaInicio)}</span>
                          <span>Factura día {c.diaFacturacion}</span>
                        </div>
                        {c.notas && <p className="text-xs text-muted-foreground mt-1 italic">{c.notas}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => generarFactura(c)}
                          disabled={!c.activo || generando === c.id}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {generando === c.id ? "Generando..." : "Facturar"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleActivo(c)} title={c.activo ? "Desactivar" : "Activar"}>
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => abrir(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => eliminar(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de facturas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Historial de Facturas</CardTitle>
          {facturas.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setFacturasSeleccionadas(new Set(facturas.filter(f => f.estado !== "anulada").map(f => f.id))); setModalEmail(true); }}
            >
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
                  <TableRow key={f.id} className={facturasSeleccionadas.has(f.id) ? "bg-blue-50" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={facturasSeleccionadas.has(f.id)}
                        onChange={() => toggleSeleccion(f.id)}
                        disabled={f.estado === "anulada"}
                        className="rounded"
                      />
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
            <div className="flex items-center justify-between mt-3 p-3 bg-blue-50 rounded-lg text-sm">
              <span className="text-blue-700">{facturasSeleccionadas.size} factura(s) seleccionada(s)</span>
              <Button size="sm" onClick={() => setModalEmail(true)}>
                <Send className="h-4 w-4 mr-1" />
                Enviar seleccionadas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog contrato */}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Servicio" : "Agregar Servicio Contratado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del Proyecto / Servicio *</Label>
              <Input
                value={form.nombreProyecto}
                onChange={(e) => setForm({ ...form, nombreProyecto: e.target.value })}
                placeholder="Ej: App Inventario, Portal Web, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tipo de Servicio *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoContrato })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mantenimiento">Mantenimiento / Soporte (17% anual)</SelectItem>
                    <SelectItem value="hosting">Hosting (mensual)</SelectItem>
                    <SelectItem value="proyecto_app">Proyecto / App (mensual)</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  {form.tipo === "mantenimiento" ? "Valor del Proyecto (base 17%)" : "Valor Mensual"}
                  {" *"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorBase || ""}
                  onChange={(e) => setForm({ ...form, valorBase: Number(e.target.value) })}
                  placeholder="0.00"
                  className="font-mono"
                />
                {form.tipo === "mantenimiento" && form.valorBase > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Mantenimiento anual: <span className="font-mono font-semibold">{formatLempiras(form.valorBase * 0.17)}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha de Inicio *</Label>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Día de Facturación</Label>
                <Select
                  value={String(form.diaFacturacion)}
                  onValueChange={(v) => setForm({ ...form, diaFacturacion: Number(v) as 1 | 2 })}
                >
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
              <Textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Condiciones, detalles adicionales..."
                rows={2}
              />
            </div>
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.nombreProyecto.trim() || form.valorBase <= 0 || guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog envío por correo */}
      <Dialog open={modalEmail} onOpenChange={(o) => { setModalEmail(o); setEnvioResultado(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Facturas por Correo</DialogTitle>
            <DialogDescription>
              {facturasSeleccionadas.size} factura(s) seleccionada(s) para {cliente.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Selección de facturas */}
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto text-sm">
              {facturas.filter(f => f.estado !== "anulada").map((f) => (
                <label key={f.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={facturasSeleccionadas.has(f.id)}
                    onChange={() => toggleSeleccion(f.id)}
                    className="rounded"
                  />
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
              <Textarea value={emailMensaje} onChange={(e) => setEmailMensaje(e.target.value)} placeholder="Estimado cliente..." rows={2} />
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
            <Button onClick={enviarSeleccionadas} disabled={facturasSeleccionadas.size === 0 || !emailPara.trim() || enviando}>
              <Send className="h-4 w-4 mr-1" />
              {enviando ? "Enviando..." : `Enviar ${facturasSeleccionadas.size > 1 ? `(${facturasSeleccionadas.size})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
