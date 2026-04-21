"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { saveCotizacion } from "@/lib/actions/cotizaciones";
import { Cliente, Servicio, Cotizacion } from "@/lib/types";
import { formatLempiras, generarId } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

const lineaSchema = z.object({
  descripcion: z.string().min(1, "Descripción requerida"),
  cantidad: z.number().min(1),
  precioUnitario: z.number().min(0.01),
});

const schema = z.object({
  clienteId: z.string().min(1),
  fecha: z.string().min(1),
  fechaValidez: z.string().min(1),
  nombreProyecto: z.string().optional(),
  notas: z.string().optional(),
  lineas: z.array(lineaSchema).min(1),
});

type FormValues = z.infer<typeof schema>;

export default function EditarCotizacionClient({
  cotizacion,
  clientes,
  servicios,
}: {
  cotizacion: Cotizacion;
  clientes: Cliente[];
  servicios: Servicio[];
}) {
  const router = useRouter();
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente>(cotizacion.cliente);
  const [catalogoKey, setCatalogoKey] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      clienteId: cotizacion.clienteId,
      fecha: cotizacion.fecha,
      fechaValidez: cotizacion.fechaValidez,
      nombreProyecto: cotizacion.nombreProyecto || "",
      notas: cotizacion.notas,
      lineas: cotizacion.lineas.map((l) => ({
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineas" });
  const lineas = watch("lineas");

  const subtotal = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0);
  const isv = subtotal * EMPRESA.isv;
  const total = subtotal + isv;

  function onClienteChange(id: string | null) {
    if (!id) return;
    const c = clientes.find((c) => c.id === id);
    if (c) { setClienteSeleccionado(c); setValue("clienteId", id); }
  }

  function agregarServicioCatalogo(servicioId: string | null) {
    if (!servicioId) return;
    const s = servicios.find((s) => s.id === servicioId);
    if (!s) return;
    append({ descripcion: s.nombre, cantidad: 1, precioUnitario: s.precioBase });
    setCatalogoKey((k) => k + 1);
  }

  async function onSubmit(data: FormValues) {
    setGuardando(true);
    try {
      const lineasCalc = data.lineas.map((l, idx) => ({
        id: cotizacion.lineas[idx]?.id || generarId(),
        descripcion: l.descripcion,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
        subtotal: Number(l.cantidad) * Number(l.precioUnitario),
      }));
      const sub = lineasCalc.reduce((s, l) => s + l.subtotal, 0);
      const isvCalc = sub * EMPRESA.isv;

      await saveCotizacion({
        ...cotizacion,
        fecha: data.fecha,
        fechaValidez: data.fechaValidez,
        clienteId: clienteSeleccionado.id,
        cliente: clienteSeleccionado,
        lineas: lineasCalc,
        subtotal: sub,
        isv: isvCalc,
        total: sub + isvCalc,
        nombreProyecto: data.nombreProyecto || undefined,
        notas: data.notas || "",
      });

      router.push(`/cotizaciones/${cotizacion.id}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar {cotizacion.numero}</h1>
          <p className="text-muted-foreground text-sm">Solo disponible en estado Borrador</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select defaultValue={cotizacion.clienteId} onValueChange={onClienteChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}{c.rtn ? ` — RTN: ${c.rtn}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Nombre del Proyecto / Servicio</Label>
              <Input {...register("nombreProyecto")} />
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
            <CardTitle className="text-base">Servicios / Productos</CardTitle>
            {servicios.length > 0 && (
              <Select key={catalogoKey} onValueChange={agregarServicioCatalogo}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Agregar del catálogo" /></SelectTrigger>
                <SelectContent>
                  {servicios.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
              <span className="col-span-5">Descripción</span>
              <span className="col-span-2 text-center">Cantidad</span>
              <span className="col-span-3 text-right">Precio Unit.</span>
              <span className="col-span-2 text-right">Subtotal</span>
            </div>

            {fields.map((field, idx) => {
              const sub = (Number(lineas[idx]?.cantidad) || 0) * (Number(lineas[idx]?.precioUnitario) || 0);
              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input {...register(`lineas.${idx}.descripcion`)} />
                    {errors.lineas?.[idx]?.descripcion && <p className="text-destructive text-xs">{errors.lineas[idx]?.descripcion?.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <Input type="number" min="1" className="text-center" {...register(`lineas.${idx}.cantidad`, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="0" step="0.01" className="text-right" {...register(`lineas.${idx}.precioUnitario`, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1 pt-1">
                    <span className="text-sm font-mono flex-1 text-right">{formatLempiras(sub)}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" onClick={() => append({ descripcion: "", cantidad: 1, precioUnitario: 0 })}>
              <Plus className="h-4 w-4" />
              Agregar línea
            </Button>

            <Separator />

            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono w-32 text-right">{formatLempiras(subtotal)}</span>
              </div>
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

        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={3} {...register("notas")} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar Cambios"}</Button>
        </div>
      </form>
    </div>
  );
}
