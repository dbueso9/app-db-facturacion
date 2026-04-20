"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getClientes, saveCliente, deleteCliente } from "@/lib/store";
import { Cliente } from "@/lib/types";
import { generarId } from "@/lib/utils";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

const EMPTY: Omit<Cliente, "id" | "creadoEn"> = {
  nombre: "", rtn: "", direccion: "", correo: "", telefono: "",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Omit<Cliente, "id" | "creadoEn">>(EMPTY);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  function cargar() {
    setClientes(getClientes().sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  useEffect(() => { cargar(); }, []);

  function abrir(cliente?: Cliente) {
    if (cliente) {
      setEditandoId(cliente.id);
      setForm({ nombre: cliente.nombre, rtn: cliente.rtn, direccion: cliente.direccion, correo: cliente.correo, telefono: cliente.telefono });
    } else {
      setEditandoId(null);
      setForm(EMPTY);
    }
    setAbierto(true);
  }

  function guardar() {
    if (!form.nombre.trim()) return;
    const cliente: Cliente = {
      id: editandoId || generarId(),
      creadoEn: new Date().toISOString(),
      ...form,
    };
    saveCliente(cliente);
    cargar();
    setAbierto(false);
  }

  function eliminar(id: string) {
    deleteCliente(id);
    cargar();
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>RTN</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{c.rtn || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.correo || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.telefono || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrir(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => eliminar(c.id)}>
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
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del cliente o empresa" />
            </div>
            <div className="space-y-1">
              <Label>RTN</Label>
              <Input value={form.rtn} onChange={(e) => setForm({ ...form, rtn: e.target.value })} placeholder="Registro Tributario Nacional" />
            </div>
            <div className="space-y-1">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Correo</Label>
                <Input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="correo@ejemplo.com" />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="504 XXXXXXXX" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!form.nombre.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
