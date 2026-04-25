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
import { crearNumeroCotizacion, saveCotizacion } from "@/lib/actions/cotizaciones";
import { Cliente, Servicio, Cotizacion } from "@/lib/types";
import { formatDolares, generarId } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

const lineaSchema = z.object({
  descripcion: z.string().min(1, "Descripción requerida"),
  cantidad: z.number().min(1, "Mínimo 1"),
  precioUnitario: z.number().min(0.01, "Precio requerido"),
});

const schema = z.object({
  clienteId: z.string().min(1, "Seleccione un cliente"),
  fecha: z.string().min(1),
  fechaValidez: z.string().min(1),
  nombreProyecto: z.string().optional(),
  notas: z.string().optional(),
  lineas: z.array(lineaSchema).min(1, "Agregue al menos un servicio"),
});

type FormValues = z.infer<typeof schema>;

export default function NuevaCotizacionClient({
  clientes,
  servicios,
}: {
  clientes: Cliente[];
  servicios: Servicio[];
}) {
  const router = useRouter();
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [catalogoKey, setCatalogoKey] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [descuento, setDescuento] = useState(0);

  const hoy = new Date().toISOString().split("T")[0];
  const validez = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clienteId: "",
      fecha: hoy,
      fechaValidez: validez,
      nombreProyecto: "",
      notas: "",
      lineas: [{ descripcion: "", cantidad: 1, precioUnitario: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineas" });
  const lineas = watch("lineas");

  const subtotal = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0);
  const gravado = subtotal - descuento;
  const isv = gravado * EMPRESA.isv;
  const total = gravado + isv;

  function onClienteChange(id: string) {
    const c = clientes.find((c) => c.id === id);
    setClienteSeleccionado(c || null);
    setValue("clienteId", id);
  }

  function agregarServicioCatalogo(servicioId: string | null) {
    if (!servicioId) return;
    const s = servicios.find((s) => s.id === servicioId);
    if (!s) return;
    append({ descripcion: s.nombre, cantidad: 1, precioUnitario: s.precioBase });
    setCatalogoKey((k) => k + 1);
  }

  function onDescripcionChange(idx: number, value: string) {
    const matched = servicios.find((s) => s.nombre.toLowerCase() === value.toLowerCase());
    if (matched) setValue(`lineas.${idx}.precioUnitario`, matched.precioBase);
  }

  async function onSubmit(data: FormValues) {
    if (!clienteSeleccionado) return;
    setGuardando(true);
    try {
      const { secuencia, numero } = await crearNumeroCotizacion();
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

      const cotizacion: Cotizacion = {
        id: generarId(),
        numero,
        secuencia,
        fecha: data.fecha,
        fechaValidez: data.fechaValidez,
        clienteId: clienteSeleccionado.id,
        cliente: clienteSeleccionado,
        lineas: lineasCalc,
        subtotal: sub,
        descuento,
        isv: isvCalc,
        total: gravCalc + isvCalc,
        estado: "borrador",
        nombreProyecto: data.nombreProyecto || undefined,
        notas: data.notas || "",
        creadaEn: new Date().toISOString(),
      };

      await saveCotizacion(cotizacion);
      router.push(`/cotizaciones/${cotizacion.id}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <datalist id="srv-list-nueva">
        {servicios.map((s) => <option key={s.id} value={s.nombre} />)}
      </datalist>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Cotización</h1>
          <p className="text-muted-foreground text-sm">Complete los datos para generar la propuesta</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="hidden" {...register("clienteId")} />
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Controller
                control={control}
                name="clienteId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(val) => { if (!val) return; field.onChange(val); onClienteChange(val); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione un cliente">
                        {field.value ? (clientes.find(c => c.id === field.value)?.nombre) : undefined}
                      </SelectValue>
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
              {errors.clienteId && <p className="text-destructive text-xs">{errors.clienteId.message}</p>}
            </div>

            {clienteSeleccionado && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">RTN</p>
                  <p className="font-mono">{clienteSeleccionado.rtn || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Correo</p>
                  <p>{clienteSeleccionado.correo || "—"}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Nombre del Proyecto / Servicio</Label>
              <Input placeholder="Ej: App Inventario, Portal Web..." {...register("nombreProyecto")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Fecha *</Label>
                <Input type="date" {...register("fecha")} />
              </div>
              <div className="space-y-1">
                <Label>Válida hasta *</Label>
                <Input type="date" {...register("fechaValidez")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Servicios / Productos (USD)</CardTitle>
            {servicios.length > 0 && (
              <Select key={catalogoKey} onValueChange={agregarServicioCatalogo}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Agregar del catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {servicios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-5">Descripción</span>
              <span className="col-span-2 text-center">Cantidad</span>
              <span className="col-span-3 text-right">Precio Unit. (USD)</span>
              <span className="col-span-2 text-right">Subtotal</span>
            </div>

            {fields.map((field, idx) => {
              const sub = (Number(lineas[idx]?.cantidad) || 0) * (Number(lineas[idx]?.precioUnitario) || 0);
              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input
                      placeholder="Descripción"
                      list="srv-list-nueva"
                      {...register(`lineas.${idx}.descripcion`, {
                        onChange: (e) => onDescripcionChange(idx, e.target.value),
                      })}
                    />
                    {errors.lineas?.[idx]?.descripcion && (
                      <p className="text-destructive text-xs">{errors.lineas[idx]?.descripcion?.message}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      className="text-center"
                      {...register(`lineas.${idx}.cantidad`, { valueAsNumber: true })}
                    />
                    {errors.lineas?.[idx]?.cantidad && (
                      <p className="text-destructive text-xs">{errors.lineas[idx]?.cantidad?.message}</p>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="text-right"
                      {...register(`lineas.${idx}.precioUnitario`, { valueAsNumber: true })}
                    />
                    {errors.lineas?.[idx]?.precioUnitario && (
                      <p className="text-destructive text-xs">{errors.lineas[idx]?.precioUnitario?.message}</p>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 pt-1">
                    <span className="text-sm font-mono flex-1 text-right">{formatDolares(sub)}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {errors.lineas && !Array.isArray(errors.lineas) && (
              <p className="text-destructive text-xs">{(errors.lineas as { message?: string }).message}</p>
            )}

            <Button type="button" variant="outline" size="sm" onClick={() => append({ descripcion: "", cantidad: 1, precioUnitario: 0 })}>
              <Plus className="h-4 w-4" />
              Agregar línea
            </Button>

            <Separator />

            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono w-32 text-right">{formatDolares(subtotal)}</span>
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
                  <span className="font-mono w-32 text-right">{formatDolares(gravado)}</span>
                </div>
              )}
              <div className="flex gap-8">
                <span className="text-muted-foreground">ISV (15%)</span>
                <span className="font-mono w-32 text-right">{formatDolares(isv)}</span>
              </div>
              <Separator className="w-48 my-1" />
              <div className="flex gap-8 text-base font-bold">
                <span>Total</span>
                <span className="font-mono w-32 text-right">{formatDolares(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent>
            <Textarea placeholder="Condiciones, alcance, términos de pago..." rows={3} {...register("notas")} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Crear Cotización"}
          </Button>
        </div>
      </form>
    </div>
  );
}
