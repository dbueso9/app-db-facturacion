"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { saveCliente, deleteCliente, checkRtnExiste } from "@/lib/actions/clientes";
import { Cliente } from "@/lib/types";
import { generarId } from "@/lib/utils";
import { Plus, Pencil, Trash2, Users, ChevronRight } from "lucide-react";

type FormData = Omit<Cliente, "id" | "creadoEn">;
type FormErrors = Partial<Record<keyof FormData, string>>;

const EMPTY: FormData = { codigo: "", nombre: "", rtn: "", direccion: "", correo: "", telefono: "" };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-0.5">{msg}</p>;
}

export default function ClientesClient({ initialClientes }: { initialClientes: Cliente[] }) {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  // Sync local state with fresh server data after router.refresh()
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setClientes(initialClientes); }, [initialClientes]);

  function abrir(cliente?: Cliente) {
    if (cliente) {
      setEditandoId(cliente.id);
      setForm({ codigo: cliente.codigo, nombre: cliente.nombre, rtn: cliente.rtn, direccion: cliente.direccion, correo: cliente.correo, telefono: cliente.telefono });
    } else {
      setEditandoId(null);
      setForm(EMPTY);
    }
    setFormErrors({});
    setAbierto(true);
  }

  function handleRtn(val: string) {
    setForm({ ...form, rtn: val.replace(/\D/g, "").slice(0, 14) });
    if (formErrors.rtn) setFormErrors({ ...formErrors, rtn: undefined });
  }

  function handleTelefono(raw: string) {
    const digits = raw.replace(/\D/g, "");
    // Strip leading 504 if user typed it
    const core = (digits.startsWith("504") ? digits.slice(3) : digits).slice(0, 8);
    let formatted = "";
    if (core.length > 0) {
      formatted = "+504 " + core.slice(0, 4);
      if (core.length > 4) formatted += "-" + core.slice(4);
    }
    setForm({ ...form, telefono: formatted });
    if (formErrors.telefono) setFormErrors({ ...formErrors, telefono: undefined });
  }

  async function guardar() {
    const errs: FormErrors = {};
    if (!form.nombre.trim()) errs.nombre = "El nombre es requerido";
    if (!form.rtn.trim()) errs.rtn = "El RTN es requerido";
    else if (form.rtn.length !== 14) errs.rtn = "El RTN debe tener exactamente 14 dígitos";
    else {
      const existe = await checkRtnExiste(form.rtn, editandoId || undefined);
      if (existe) errs.rtn = "Ya existe otro cliente con este RTN";
    }
    if (!form.direccion.trim()) errs.direccion = "La dirección es requerida";
    if (!form.correo.trim()) errs.correo = "El correo es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) errs.correo = "Correo inválido";
    if (!form.telefono.trim()) errs.telefono = "El teléfono es requerido";
    else if (!/^\+504 \d{4}-\d{4}$/.test(form.telefono)) errs.telefono = "Formato requerido: +504 XXXX-XXXX";

    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setGuardando(true);
    try {
      const cliente: Cliente = { id: editandoId || generarId(), creadoEn: new Date().toISOString(), ...form };
      await saveCliente(cliente);
      setClientes(prev => {
        const exists = prev.find(c => c.id === cliente.id);
        return exists ? prev.map(c => c.id === cliente.id ? cliente : c) : [...prev, cliente];
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
      await deleteCliente(id);
      setClientes(prev => prev.filter(c => c.id !== id));
      router.refresh();
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">{clientes.length} clientes registrados</p>
        </div>
        <Button onClick={() => abrir()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No hay clientes registrados</p>
              <Button className="mt-4" size="sm" onClick={() => abrir()}>Agregar primer cliente</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RTN</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{c.codigo || "—"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/clientes/${c.id}`} className="hover:underline flex items-center gap-1">
                        {c.nombre}
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{c.rtn || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.correo || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.telefono || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrir(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => eliminar(c.id)} disabled={eliminando === c.id}>
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
            <DialogTitle>{editandoId ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Código</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="DBC-001 (auto)" className="font-mono" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => { setForm({ ...form, nombre: e.target.value }); if (formErrors.nombre) setFormErrors({ ...formErrors, nombre: undefined }); }}
                  placeholder="Nombre del cliente o empresa"
                  className={formErrors.nombre ? "border-red-500" : ""}
                />
                <FieldError msg={formErrors.nombre} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>RTN * <span className="text-muted-foreground text-xs font-normal">(14 dígitos)</span></Label>
              <Input
                value={form.rtn}
                onChange={(e) => handleRtn(e.target.value)}
                inputMode="numeric"
                placeholder="00000000000000"
                className={`font-mono tracking-widest ${formErrors.rtn ? "border-red-500" : ""}`}
                maxLength={14}
              />
              <div className="flex items-center justify-between">
                <FieldError msg={formErrors.rtn} />
                <span className={`text-xs ml-auto ${form.rtn.length === 14 ? "text-green-600" : "text-muted-foreground"}`}>
                  {form.rtn.length}/14
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Dirección *</Label>
              <Input
                value={form.direccion}
                onChange={(e) => { setForm({ ...form, direccion: e.target.value }); if (formErrors.direccion) setFormErrors({ ...formErrors, direccion: undefined }); }}
                placeholder="Dirección completa"
                className={formErrors.direccion ? "border-red-500" : ""}
              />
              <FieldError msg={formErrors.direccion} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Correo *</Label>
                <Input
                  type="email"
                  value={form.correo}
                  onChange={(e) => { setForm({ ...form, correo: e.target.value }); if (formErrors.correo) setFormErrors({ ...formErrors, correo: undefined }); }}
                  placeholder="correo@ejemplo.com"
                  className={formErrors.correo ? "border-red-500" : ""}
                />
                <FieldError msg={formErrors.correo} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono *</Label>
                <Input
                  value={form.telefono}
                  onChange={(e) => handleTelefono(e.target.value)}
                  placeholder="+504 XXXX-XXXX"
                  inputMode="tel"
                  className={formErrors.telefono ? "border-red-500" : ""}
                />
                <FieldError msg={formErrors.telefono} />
              </div>
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
