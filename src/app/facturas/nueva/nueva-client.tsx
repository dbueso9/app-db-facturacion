"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { crearNumeroFactura, saveFactura } from "@/lib/actions/facturas";
import { saveContrato } from "@/lib/actions/contratos";
import { saveHitos } from "@/lib/actions/hitos";
import { Cliente, Servicio, Factura, MetodoPago, Contrato, Hito, EstadoHito } from "@/lib/types";
import { TasaCambio } from "@/lib/actions/tasa-cambio";
import { formatLempiras, generarId } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { Plus, Trash2, ArrowLeft, AlertTriangle, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";

const lineaSchema = z.object({
  descripcion: z.string().min(1, "Descripción requerida"),
  cantidad: z.number().min(1, "Mínimo 1"),
  precioUnitario: z.number().min(0.01, "Precio debe ser mayor a 0"),
});

const facturaSchema = z.object({
  clienteId: z.string().min(1, "Seleccione un cliente"),
  fecha: z.string().min(1, "Fecha requerida"),
  metodoPago: z.string().min(1, "Seleccione método de pago"),
  condicionPago: z.string().min(1, "Seleccione condición de pago"),
  nombreProyecto: z.string().min(1, "El nombre del proyecto es requerido"),
  notas: z.string().optional(),
  lineas: z.array(lineaSchema).min(1, "Agregue al menos un servicio"),
});

type FormValues = {
  clienteId: string;
  fecha: string;
  metodoPago: string;
  condicionPago: string;
  nombreProyecto: string;
  notas?: string;
  lineas: { descripcion: string; cantidad: number; precioUnitario: number }[];
};

type FormHito = { id: string; nombre: string; porcentaje: string };

interface NuevaFacturaClientProps {
  clientes: Cliente[];
  servicios: Servicio[];
  limiteAlcanzado: boolean;
  tasaCambio: TasaCambio | null;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-0.5">{msg}</p>;
}

export default function NuevaFacturaClient({ clientes, servicios, limiteAlcanzado, tasaCambio }: NuevaFacturaClientProps) {
  const router = useRouter();
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [catalogoKey, setCatalogoKey] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const [descuento, setDescuento] = useState(0);

  // Proyecto / contrato
  const [esProyecto, setEsProyecto] = useState(false);
  const [formHitos, setFormHitos] = useState<FormHito[]>([
    { id: generarId(), nombre: "Anticipo", porcentaje: "50" },
    { id: generarId(), nombre: "Entrega Final", porcentaje: "50" },
  ]);
  const [errorHitos, setErrorHitos] = useState<string | null>(null);

  const hoy = new Date().toISOString().split("T")[0];

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(facturaSchema),
    defaultValues: {
      clienteId: "",
      fecha: hoy,
      metodoPago: "",
      condicionPago: "",
      nombreProyecto: "",
      notas: "",
      lineas: [{ descripcion: "", cantidad: 1, precioUnitario: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineas" });
  const lineas = watch("lineas");
  const fechaValue = watch("fecha");
  const condicionPagoValue = watch("condicionPago");

  const fechaVencimientoCalc = (() => {
    if (!fechaValue || !condicionPagoValue) return "";
    const dias = parseInt(condicionPagoValue);
    return new Date(new Date(fechaValue + "T00:00:00").getTime() + dias * 86400000)
      .toISOString().split("T")[0];
  })();

  const subtotal = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0);
  const gravado = subtotal - descuento;
  const isv = gravado * EMPRESA.isv;
  const total = gravado + isv;

  const sumaHitos = formHitos.reduce((s, h) => s + (parseFloat(h.porcentaje) || 0), 0);

  function onClienteChange(id: string | null) {
    const c = clientes.find((c) => c.id === id);
    setClienteSeleccionado(c || null);
    setValue("clienteId", id || "", { shouldValidate: true });
  }

  function agregarServicioCatalogo(servicioId: string | null) {
    if (!servicioId) return;
    const s = servicios.find((s) => s.id === servicioId);
    if (!s) return;
    const precio = tasaCambio ? Number((s.precioBase * tasaCambio.venta).toFixed(2)) : s.precioBase;
    append({ descripcion: s.nombre, cantidad: 1, precioUnitario: precio });
    setCatalogoKey((k) => k + 1);
  }

  function handleDescripcionChange(idx: number, value: string, rhfOnChange: (e: React.ChangeEvent<HTMLInputElement>) => void, e: React.ChangeEvent<HTMLInputElement>) {
    rhfOnChange(e);
    const matched = servicios.find(s => s.nombre.toLowerCase() === value.toLowerCase());
    if (matched) {
      const precio = tasaCambio ? Number((matched.precioBase * tasaCambio.venta).toFixed(2)) : matched.precioBase;
      setValue(`lineas.${idx}.precioUnitario`, precio, { shouldValidate: true });
    }
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

  async function onSubmit(data: FormValues) {
    if (!clienteSeleccionado) return;

    if (esProyecto) {
      if (Math.abs(sumaHitos - 100) > 0.01) {
        setErrorHitos(`Los porcentajes deben sumar 100% (actualmente ${sumaHitos.toFixed(1)}%)`);
        return;
      }
      if (formHitos.some((h) => !h.nombre.trim())) {
        setErrorHitos("Todos los hitos deben tener nombre");
        return;
      }
    }

    setGuardando(true);
    try {
      const { secuencia, numero } = await crearNumeroFactura();
      const dias = parseInt(data.condicionPago);
      const fechaVenc = new Date(new Date(data.fecha + "T00:00:00").getTime() + dias * 86400000)
        .toISOString().split("T")[0];

      const lineasCalc = data.lineas.map((l) => ({
        id: generarId(),
        descripcion: l.descripcion,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
        subtotal: Number(l.cantidad) * Number(l.precioUnitario),
      }));

      const sub = lineasCalc.reduce((s, l) => s + l.subtotal, 0);
      const gravCalc = sub - descuento;
      const isvCalc = gravCalc * EMPRESA.isv;

      const facturaId = generarId();
      const factura: Factura = {
        id: facturaId,
        numero,
        secuencia,
        fecha: data.fecha,
        fechaVencimiento: fechaVenc,
        clienteId: clienteSeleccionado.id,
        cliente: clienteSeleccionado,
        lineas: lineasCalc,
        subtotal: sub,
        descuento,
        isv: isvCalc,
        total: gravCalc + isvCalc,
        estado: "emitida",
        metodoPago: data.metodoPago as MetodoPago,
        condicionPago: dias,
        tasaCambio: tasaCambio?.venta,
        nombreProyecto: data.nombreProyecto || undefined,
        notas: data.notas || "",
        creadaEn: new Date().toISOString(),
      };

      await saveFactura(factura);

      if (esProyecto) {
        const contratoId = generarId();
        const contrato: Contrato = {
          id: contratoId,
          clienteId: clienteSeleccionado.id,
          nombreProyecto: data.nombreProyecto,
          tipo: "proyecto_app",
          valorBase: sub,
          fechaInicio: data.fecha,
          diaFacturacion: 1,
          activo: true,
          notas: "",
          creadoEn: new Date().toISOString(),
        };
        await saveContrato(contrato);

        // Crear hitos — el primero (porcentaje mayor) ligado a esta factura
        const primerHitoIdx = formHitos.reduce(
          (maxIdx, h, idx) =>
            (parseFloat(h.porcentaje) || 0) > (parseFloat(formHitos[maxIdx].porcentaje) || 0) ? idx : maxIdx,
          0
        );

        const hitos: Omit<Hito, "creadoEn">[] = formHitos.map((h, idx) => {
          const pct = parseFloat(h.porcentaje);
          const monto = Number(((sub * pct) / 100).toFixed(2));
          return {
            id: generarId(),
            contratoId,
            nombre: h.nombre.trim(),
            porcentaje: pct,
            monto,
            estado: (idx === primerHitoIdx ? "facturado" : "pendiente") as EstadoHito,
            facturaId: idx === primerHitoIdx ? facturaId : undefined,
            orden: idx,
          };
        });

        await saveHitos(contratoId, hitos);
        router.push(`/clientes/${clienteSeleccionado.id}`);
      } else {
        router.push(`/facturas/${factura.id}`);
      }
    } finally {
      setGuardando(false);
    }
  }

  if (limiteAlcanzado) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ha alcanzado el límite del rango CAI autorizado. No puede emitir más facturas con el CAI actual.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <datalist id="srv-list-new">
        {servicios.map((s) => <option key={s.id} value={s.nombre} />)}
      </datalist>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Factura</h1>
          <p className="text-muted-foreground text-sm">Todos los campos con * son obligatorios</p>
        </div>
        {tasaCambio && (
          <div className="ml-auto text-right text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Tasa BCH · {tasaCambio.fecha}</p>
            <p className="font-mono font-bold text-blue-900">
              Compra: L.{tasaCambio.compra.toFixed(4)} · Venta: L.{tasaCambio.venta.toFixed(4)}
            </p>
          </div>
        )}
        {!tasaCambio && (
          <div className="ml-auto text-right text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
            <p className="text-xs text-yellow-600 font-medium">Sin tasa de cambio — precios del catálogo se usan tal cual</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register("clienteId")} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Controller
                name="clienteId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={(v) => { field.onChange(v); onClienteChange(v); }}
                  >
                    <SelectTrigger className={`w-full ${errors.clienteId ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Seleccione un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.length === 0 ? (
                        <SelectItem value="_none" disabled>No hay clientes — cree uno primero</SelectItem>
                      ) : (
                        clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError msg={errors.clienteId?.message} />
            </div>

            {clienteSeleccionado && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Cliente</p>
                  <p className="font-semibold">{clienteSeleccionado.nombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">RTN</p>
                  <p className="font-mono">{clienteSeleccionado.rtn || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Teléfono</p>
                  <p>{clienteSeleccionado.telefono || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Correo</p>
                  <p className="truncate">{clienteSeleccionado.correo || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Dirección</p>
                  <p>{clienteSeleccionado.direccion || "—"}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Nombre del Proyecto / Servicio *</Label>
              <Input
                placeholder="Ej: App Inventario, Portal Web, Hosting..."
                {...register("nombreProyecto")}
                className={errors.nombreProyecto ? "border-red-500" : ""}
              />
              <FieldError msg={errors.nombreProyecto?.message} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha de Emisión *</Label>
                <Input type="date" {...register("fecha")} className={errors.fecha ? "border-red-500" : ""} />
                <FieldError msg={errors.fecha?.message} />
              </div>
              <div className="space-y-1">
                <Label>Condición de Pago *</Label>
                <Controller
                  name="condicionPago"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.condicionPago ? "border-red-500" : ""}>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 días</SelectItem>
                        <SelectItem value="60">60 días</SelectItem>
                        <SelectItem value="90">90 días</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError msg={errors.condicionPago?.message} />
                {fechaVencimientoCalc && (
                  <p className="text-xs text-muted-foreground">Vence: <span className="font-medium text-foreground">{fechaVencimientoCalc}</span></p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Método de Pago *</Label>
              <Controller
                name="metodoPago"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.metodoPago ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia bancaria</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError msg={errors.metodoPago?.message} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Servicios / Productos</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Escribe el nombre del servicio para autocompletar · precios en L. (convertidos desde USD con tasa BCH)
              </p>
            </div>
            {servicios.length > 0 && (
              <Select key={catalogoKey} onValueChange={agregarServicioCatalogo}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Agregar del catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {servicios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-5">Descripción</span>
              <span className="col-span-2 text-center">Cantidad</span>
              <span className="col-span-3 text-right">Precio Unit. (L.)</span>
              <span className="col-span-2 text-right">Subtotal</span>
            </div>

            {fields.map((field, idx) => {
              const sub = (Number(lineas[idx]?.cantidad) || 0) * (Number(lineas[idx]?.precioUnitario) || 0);
              const { onChange: rhfOnChange, ...rhfRest } = register(`lineas.${idx}.descripcion`);
              return (
                <div key={field.id} className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <Input
                        {...rhfRest}
                        list="srv-list-new"
                        placeholder="Descripción del servicio"
                        className={errors.lineas?.[idx]?.descripcion ? "border-red-500" : ""}
                        onChange={(e) => handleDescripcionChange(idx, e.target.value, rhfOnChange, e)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        className={`text-center ${errors.lineas?.[idx]?.cantidad ? "border-red-500" : ""}`}
                        {...register(`lineas.${idx}.cantidad`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`text-right ${errors.lineas?.[idx]?.precioUnitario ? "border-red-500" : ""}`}
                        {...register(`lineas.${idx}.precioUnitario`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1 pt-1">
                      <span className="text-sm font-mono flex-1 text-right">{formatLempiras(sub)}</span>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {(errors.lineas?.[idx]?.descripcion || errors.lineas?.[idx]?.cantidad || errors.lineas?.[idx]?.precioUnitario) && (
                    <div className="grid grid-cols-12 gap-2 px-0">
                      <div className="col-span-5">
                        <FieldError msg={errors.lineas?.[idx]?.descripcion?.message} />
                      </div>
                      <div className="col-span-2 text-center">
                        <FieldError msg={errors.lineas?.[idx]?.cantidad?.message} />
                      </div>
                      <div className="col-span-3 text-right">
                        <FieldError msg={errors.lineas?.[idx]?.precioUnitario?.message} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {errors.lineas && !Array.isArray(errors.lineas) && (
              <FieldError msg={(errors.lineas as { message?: string }).message} />
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ descripcion: "", cantidad: 1, precioUnitario: 0 })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar línea
            </Button>

            <Separator />

            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono w-32 text-right">{formatLempiras(subtotal)}</span>
              </div>
              <div className="flex items-center gap-8">
                <span className="text-muted-foreground">Descuento</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={descuento || ""}
                  onChange={(e) => setDescuento(Number(e.target.value) || 0)}
                  className="w-32 text-right font-mono h-7 text-sm px-2"
                  placeholder="0.00"
                />
              </div>
              {descuento > 0 && (
                <div className="flex gap-8">
                  <span className="text-muted-foreground">Gravado</span>
                  <span className="font-mono w-32 text-right">{formatLempiras(gravado)}</span>
                </div>
              )}
              <div className="flex gap-8">
                <span className="text-muted-foreground">ISV (15%)</span>
                <span className="font-mono w-32 text-right">{formatLempiras(isv)}</span>
              </div>
              <Separator className="w-48 my-1" />
              <div className="flex gap-8 text-base font-bold">
                <span>Total</span>
                <span className="font-mono w-32 text-right">{formatLempiras(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección Proyecto con Hitos */}
        <Card className={esProyecto ? "border-purple-500/40" : ""}>
          <CardHeader
            className="pb-3 cursor-pointer select-none"
            onClick={() => { setEsProyecto((v) => !v); setErrorHitos(null); }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${esProyecto ? "bg-purple-600 border-purple-600" : "border-muted-foreground"}`}>
                  {esProyecto && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-purple-400" />
                    Gestionar como proyecto con hitos
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Crea un contrato y plan de pagos vinculado a esta factura
                  </p>
                </div>
              </div>
              {esProyecto ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardHeader>

          {esProyecto && (
            <CardContent className="space-y-4 pt-0">
              <div className="bg-purple-50/10 border border-purple-500/20 rounded-lg p-3 text-xs text-purple-300">
                Se creará un contrato de proyecto para este cliente. El primer hito con mayor porcentaje quedará vinculado a esta factura. Los demás hitos podrás facturarlos desde el perfil del cliente.
              </div>

              <div>
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1 mb-2">
                  <span className="col-span-6">Nombre del Hito</span>
                  <span className="col-span-3 text-center">%</span>
                  <span className="col-span-2 text-right">Monto (sin ISV)</span>
                  <span className="col-span-1"></span>
                </div>

                {formHitos.map((h, idx) => {
                  const pct = parseFloat(h.porcentaje) || 0;
                  const monto = (subtotal * pct) / 100;
                  return (
                    <div key={h.id} className="grid grid-cols-12 gap-2 items-center mb-2">
                      <div className="col-span-6">
                        <Input
                          value={h.nombre}
                          onChange={(e) => updateHitoRow(idx, "nombre", e.target.value)}
                          placeholder="Ej: Anticipo, Entrega..."
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={h.porcentaje}
                          onChange={(e) => updateHitoRow(idx, "porcentaje", e.target.value)}
                          className="h-8 text-sm text-center"
                        />
                      </div>
                      <div className="col-span-2 text-right text-xs font-mono text-muted-foreground">
                        {formatLempiras(monto)}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {formHitos.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHitoRow(idx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Button type="button" variant="outline" size="sm" onClick={addHitoRow} className="w-full mt-1">
                  <Plus className="h-4 w-4 mr-1" /> Agregar hito
                </Button>

                <div className={`flex items-center justify-between text-sm px-2 py-1.5 rounded mt-2 ${Math.abs(sumaHitos - 100) < 0.01 ? "bg-green-50/10 text-green-500" : "bg-red-950/30 text-red-400"}`}>
                  <span>Suma de porcentajes</span>
                  <span className="font-mono font-bold">{sumaHitos.toFixed(1)}% / 100%</span>
                </div>

                {errorHitos && (
                  <p className="text-sm text-red-400 mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {errorHitos}
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Observaciones, instrucciones de pago, etc."
              rows={3}
              {...register("notas")}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando || (esProyecto && Math.abs(sumaHitos - 100) > 0.01)}>
            {guardando ? "Emitiendo..." : esProyecto ? "Emitir y Crear Proyecto" : "Emitir Factura"}
          </Button>
        </div>
      </form>
    </div>
  );
}
