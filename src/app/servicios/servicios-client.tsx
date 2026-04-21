"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { saveServicio, deleteServicio } from "@/lib/actions/servicios";
import { Servicio, CategoriaServicio } from "@/lib/types";
import { formatDolares, generarId } from "@/lib/utils";
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react";

const CATEGORIAS: Record<CategoriaServicio, string> = {
  consultoria: "Consultoría",
  hosting: "Hosting",
  desarrollo_web: "Desarrollo Web",
  desarrollo_app: "Desarrollo App",
  soporte: "Soporte",
  otro: "Otro",
};

type FormData = { nombre: string; descripcion: string; precioBase: number; categoria: CategoriaServicio };
type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY: FormData = { nombre: "", descripcion: "", precioBase: 0, categoria: "consultoria" };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-0.5">{msg}</p>;
}

export default function ServiciosClient({ initialServicios }: { initialServicios: Servicio[] }) {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[]>(initialServicios);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  useEffect(() => { setServicios(initialServicios); }, [initialServicios]);

  function abrir(s?: Servicio) {
    if (s) {
      setEditandoId(s.id);
      setForm({ nombre: s.nombre, descripcion: s.descripcion, precioBase: s.precioBase, categoria: s.categoria });
    } else {
      setEditandoId(null);
      setForm(EMPTY);
    }
    setFormErrors({});
    setAbierto(true);
  }

  async function guardar() {
    const errs: FormErrors = {};
    if (!form.nombre.trim()) errs.nombre = "El nombre es requerido";
    if (!form.precioBase || form.precioBase <= 0) errs.precioBase = "Ingrese un precio mayor a 0";

    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setGuardando(true);
    try {
      const servicio: Servicio = { id: editandoId || generarId(), ...form };
      await saveServicio(servicio);
      setServicios(prev => {
        const exists = prev.find(s => s.id === servicio.id);
        return exists ? prev.map(s => s.id === servicio.id ? servicio : s) : [...prev, servicio];
      });
      setAbierto(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    setEliminando(id);
    try {
      await deleteServicio(id);
      setServicios(prev => prev.filter(s => s.id !== id));
      router.refresh();
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Servicios</h1>
          <p className="text-muted-foreground text-sm">{servicios.length} servicios disponibles · precios en USD</p>
        </div>
        <Button onClick={() => abrir()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {servicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No hay servicios en el catálogo</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Precio Base (USD)</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicios.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CATEGORIAS[s.categoria]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.descripcion || "—"}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-700">{formatDolares(s.precioBase)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrir(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => eliminar(s.id)} disabled={eliminando === s.id}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => { setForm({ ...form, nombre: e.target.value }); if (formErrors.nombre) setFormErrors({ ...formErrors, nombre: undefined }); }}
                placeholder="Ej: Consultoría IT"
                className={formErrors.nombre ? "border-red-500" : ""}
              />
              <FieldError msg={formErrors.nombre} />
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={form.categoria} onValueChange={(v) => v && setForm({ ...form, categoria: v as CategoriaServicio })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIAS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} placeholder="Descripción del servicio" />
            </div>
            <div className="space-y-1">
              <Label>Precio Base (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precioBase || ""}
                  onChange={(e) => { setForm({ ...form, precioBase: Number(e.target.value) }); if (formErrors.precioBase) setFormErrors({ ...formErrors, precioBase: undefined }); }}
                  className={`pl-7 ${formErrors.precioBase ? "border-red-500" : ""}`}
                  placeholder="0.00"
                />
              </div>
              <FieldError msg={formErrors.precioBase} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
