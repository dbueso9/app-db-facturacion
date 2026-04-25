"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  crearUsuario, actualizarRolUsuario, actualizarPasswordUsuario, eliminarUsuario, type UsuarioApp, type RolUsuario,
} from "@/lib/actions/usuarios";
import { formatFecha } from "@/lib/utils";
import { ArrowLeft, Plus, Pencil, Trash2, ShieldCheck, UserRound, Eye, Key, AlertTriangle } from "lucide-react";

const ROL_LABELS: Record<RolUsuario, string> = {
  admin: "Administrador",
  asistente: "Asistente",
  gestion: "Solo Gestión",
};

const ROL_BADGE: Record<RolUsuario, string> = {
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  asistente: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  gestion: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const ROL_DESC: Record<RolUsuario, string> = {
  admin: "Acceso total — puede crear usuarios, eliminar facturas y modificar precios",
  asistente: "Puede crear y gestionar facturas, clientes, cotizaciones. No puede eliminar ni cambiar precios del catálogo",
  gestion: "Solo lectura — puede ver facturas y reportes, no puede crear ni eliminar",
};

interface Props {
  usuarios: UsuarioApp[];
  currentUserId: string;
}

export default function UsuariosClient({ usuarios: init, currentUserId }: Props) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioApp[]>(init);

  // Modal crear
  const [modalCrear, setModalCrear] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<RolUsuario>("asistente");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Modal editar
  const [modalEditar, setModalEditar] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<UsuarioApp | null>(null);
  const [editRole, setEditRole] = useState<RolUsuario>("asistente");
  const [editPassword, setEditPassword] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  // Modal eliminar
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminandoUsuario, setEliminandoUsuario] = useState<UsuarioApp | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function handleCrear() {
    if (!formUsername.trim() || !formPassword.trim()) return;
    setCreando(true);
    setErrorCrear(null);
    try {
      const res = await crearUsuario(formUsername.trim(), formPassword.trim(), formRole);
      if (!res.ok) { setErrorCrear(res.error || "Error al crear usuario"); return; }
      setModalCrear(false);
      setFormUsername(""); setFormPassword(""); setFormRole("asistente");
      router.refresh();
    } finally {
      setCreando(false);
    }
  }

  function abrirEditar(u: UsuarioApp) {
    setEditandoUsuario(u);
    setEditRole(u.role);
    setEditPassword("");
    setErrorEditar(null);
    setModalEditar(true);
  }

  async function handleGuardarEdicion() {
    if (!editandoUsuario) return;
    setGuardandoEdicion(true);
    setErrorEditar(null);
    try {
      const resRol = await actualizarRolUsuario(editandoUsuario.id, editRole);
      if (!resRol.ok) { setErrorEditar(resRol.error || "Error al actualizar rol"); return; }

      if (editPassword.trim().length > 0) {
        if (editPassword.trim().length < 6) { setErrorEditar("La contraseña debe tener al menos 6 caracteres"); return; }
        const resPwd = await actualizarPasswordUsuario(editandoUsuario.id, editPassword.trim());
        if (!resPwd.ok) { setErrorEditar(resPwd.error || "Error al actualizar contraseña"); return; }
      }

      setUsuarios((prev) => prev.map((u) => u.id === editandoUsuario.id ? { ...u, role: editRole } : u));
      setModalEditar(false);
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function handleEliminar() {
    if (!eliminandoUsuario) return;
    setEliminando(true);
    try {
      const res = await eliminarUsuario(eliminandoUsuario.id);
      if (res.ok) {
        setUsuarios((prev) => prev.filter((u) => u.id !== eliminandoUsuario.id));
        setModalEliminar(false);
      }
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">Crea y administra usuarios con control de acceso por rol</p>
        </div>
        <Button size="sm" onClick={() => { setErrorCrear(null); setModalCrear(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Leyenda de roles */}
      <div className="grid grid-cols-3 gap-3">
        {(["admin", "asistente", "gestion"] as RolUsuario[]).map((rol) => (
          <Card key={rol} className="border-0 bg-muted/40">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                {rol === "admin" ? <ShieldCheck className="h-4 w-4 text-purple-400" /> :
                  rol === "asistente" ? <UserRound className="h-4 w-4 text-blue-400" /> :
                    <Eye className="h-4 w-4 text-gray-400" />}
                <span className="font-semibold text-sm">{ROL_LABELS[rol]}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ROL_DESC[rol]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuarios del sistema ({usuarios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{u.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROL_BADGE[u.role]}`}>
                      {ROL_LABELS[u.role]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatFecha(u.creadoEn.split("T")[0])}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(u)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEliminandoUsuario(u); setModalEliminar(true); }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Crear */}
      <Dialog open={modalCrear} onOpenChange={(o) => { setModalCrear(o); setErrorCrear(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>El email se genera automáticamente como usuario@dbconsulting.hn</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre de usuario *</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="ej: maria"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">@dbconsulting.hn</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Contraseña *</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Rol *</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as RolUsuario)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="asistente">Asistente</SelectItem>
                  <SelectItem value="gestion">Solo Gestión (solo lectura)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{ROL_DESC[formRole]}</p>
            </div>
            {errorCrear && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {errorCrear}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCrear(false)}>Cancelar</Button>
            <Button onClick={handleCrear} disabled={!formUsername.trim() || !formPassword.trim() || creando}>
              {creando ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={modalEditar} onOpenChange={(o) => { setModalEditar(o); setErrorEditar(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar — {editandoUsuario?.username}</DialogTitle>
            <DialogDescription>{editandoUsuario?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as RolUsuario)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="asistente">Asistente</SelectItem>
                  <SelectItem value="gestion">Solo Gestión (solo lectura)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{ROL_DESC[editRole]}</p>
            </div>
            <div className="space-y-1">
              <Label>Nueva Contraseña (dejar vacío para no cambiar)</Label>
              <Input
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            {errorEditar && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {errorEditar}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEditar(false)}>Cancelar</Button>
            <Button onClick={handleGuardarEdicion} disabled={guardandoEdicion}>
              {guardandoEdicion ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar */}
      <Dialog open={modalEliminar} onOpenChange={setModalEliminar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              ¿Eliminar a <span className="font-semibold text-foreground">{eliminandoUsuario?.username}</span>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEliminar(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEliminar} disabled={eliminando}>
              {eliminando ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
