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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { crearNumeroFactura, saveFactura } from "@/lib/actions/facturas";
import { Cliente, Servicio, Factura, MetodoPago } from "@/lib/types";
import { TasaCambio } from "@/lib/actions/tasa-cambio";
import { formatLempiras, generarId } from "@/lib/utils";
import { EMPRESA } from "@/lib/empresa";
import { Plus, Trash2, ArrowLeft, AlertTriangle } from "lucide-react";

const lineaSchema = z.object({
  descripcion: z.string().min(1, "Descripción requerida"),
  cantidad: z.number().min(1, "Mínimo 1"),
  precioUnitario: z.number().min(0.01, "Precio requerido"),
});

const facturaSchema = z.object({
  clienteId: z.string().min(1, "Seleccione un cliente"),
  fecha: z.string().min(1, "Fecha requerida"),
  fechaVencimiento: z.string().min(1, "Fecha de vencimiento requerida"),
  metodoPago: z.enum(["transferencia", "cheque", "efectivo"]).optional(),
  nombreProyecto: z.string().optional(),
  notas: z.string().optional(),
  lineas: z.array(lineaSchema).min(1, "Agregue al menos un servicio"),
});

type FormValues = {
  clienteId: string;
  fecha: string;
  fechaVencimiento: string;
  metodoPago?: MetodoPago;
  nombreProyecto?: string;
  notas?: string;
  lineas: { descripcion: string; cantidad: number; precioUnitario: number }[];
};

interface NuevaFacturaClientProps {
  clientes: Cliente[];
  servicios: Servicio[];
  limiteAlcanzado: boolean;
  tasaCambio: TasaCambio | null;
}

export default function NuevaFacturaClient({ clientes, servicios, limiteAlcanzado, tasaCambio }: NuevaFacturaClientProps) {
  const router = useRouter();
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [catalogoKey, setCatalogoKey] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const hoy = new Date().toISOString().split("T")[0];
  const vencimiento = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(facturaSchema) as Resolver<FormValues>,
    defaultValues: {
      clienteId: "",
      fecha: hoy,
      fechaVencimiento: vencimiento,
      metodoPago: undefined,
      nombreProyecto: "",
      notas: "",
      lineas: [{ descripcion: "", cantidad: 1, precioUnitario: 0 }],
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

  async function onSubmit(data: FormValues) {
    if (!clienteSeleccionado) return;
    setGuardando(true);
    try {
      const { secuencia, numero } = await crearNumeroFactura();

      const lineasCalc = data.lineas.map((l) => ({
        id: generarId(),
        descripcion: l.descripcion,
        cantidad: Number(l.cantidad),
        precioUnitario: Number(l.precioUnitario),
        subtotal: Number(l.cantidad) * Number(l.precioUnitario),
      }));

      const sub = lineasCalc.reduce((s, l) => s + l.subtotal, 0);
      const isvCalc = sub * EMPRESA.isv;

      const factura: Factura = {
        id: generarId(),
        numero,
        secuencia,
        fecha: data.fecha,
        fechaVencimiento: data.fechaVencimiento,
        clienteId: clienteSeleccionado.id,
        cliente: clienteSeleccionado,
        lineas: lineasCalc,
        subtotal: sub,
        isv: isvCalc,
        total: sub + isvCalc,
        estado: "emitida",
        metodoPago: data.metodoPago,
        tasaCambio: tasaCambio?.venta,
        nombreProyecto: data.nombreProyecto || undefined,
        notas: data.notas || "",
        creadaEn: new Date().toISOString(),
      };

      await saveFactura(factura);
      router.push(`/facturas/${factura.id}`);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Factura</h1>
          <p className="text-muted-foreground text-sm">Complete los datos para emitir la factura</p>
        </div>
        {tasaCambio && (
          <div className="ml-auto text-right text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Tasa BCH · {tasaCambio.fecha}</p>
            <p className="font-mono font-bold text-blue-900">
              Compra: L.{tasaCambio.compra.toFixed(4)} · Venta: L.{tasaCambio.venta.toFixed(4)}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select onValueChange={onClienteChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No hay clientes — cree uno primero
                    </SelectItem>
                  ) : (
                    clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}{c.rtn ? ` — RTN: ${c.rtn}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.clienteId && <p className="text-destructive text-xs">{errors.clienteId.message}</p>}
            </div>

            {clienteSeleccionado && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">RTN</p>
                  <p className="font-mono">{clienteSeleccionado.rtn || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Teléfono</p>
                  <p>{clienteSeleccionado.telefono || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Dirección</p>
                  <p>{clienteSeleccionado.direccion || "—"}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Nombre del Proyecto / Servicio</Label>
              <Input
                placeholder="Ej: App Inventario, Portal Web, Hosting..."
                {...register("nombreProyecto")}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Fecha de Emisión *</Label>
                <Input type="date" {...register("fecha")} />
                {errors.fecha && <p className="text-destructive text-xs">{errors.fecha.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Fecha de Vencimiento *</Label>
                <Input type="date" {...register("fechaVencimiento")} />
                {errors.fechaVencimiento && <p className="text-destructive text-xs">{errors.fechaVencimiento.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Método de Pago</Label>
                <Select onValueChange={(v) => setValue("metodoPago", v as MetodoPago)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Servicios / Productos</CardTitle>
            {servicios.length > 0 && (
              <Select key={catalogoKey} onValueChange={agregarServicioCatalogo}>
                <SelectTrigger className="w-48">
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
              <span className="col-span-3 text-right">Precio Unit.</span>
              <span className="col-span-2 text-right">Subtotal</span>
            </div>
            {fields.map((field, idx) => {
              const sub = (Number(lineas[idx]?.cantidad) || 0) * (Number(lineas[idx]?.precioUnitario) || 0);
              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input placeholder="Descripción del servicio" {...register(`lineas.${idx}.descripcion`)} />
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
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="text-right"
                      {...register(`lineas.${idx}.precioUnitario`, { valueAsNumber: true })}
                    />
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

            {errors.lineas && !Array.isArray(errors.lineas) && (
              <p className="text-destructive text-xs">{(errors.lineas as { message?: string }).message}</p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ descripcion: "", cantidad: 1, precioUnitario: 0 })}
            >
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
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Notas adicionales, condiciones de pago, etc."
              rows={3}
              {...register("notas")}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Emitiendo..." : "Emitir Factura"}
          </Button>
        </div>
      </form>
    </div>
  );
}
