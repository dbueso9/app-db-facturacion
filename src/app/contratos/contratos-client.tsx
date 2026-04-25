"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveFactura, crearNumeroFactura } from "@/lib/actions/facturas";
import { calcularMontoContrato, descripcionFacturaContrato } from "@/lib/contratos-utils";
import { Contrato, TipoContrato, Cliente, Factura } from "@/lib/types";
import { TasaCambio } from "@/lib/actions/tasa-cambio";
import { formatLempiras, formatFecha, generarId } from "@/lib/utils";
import { Zap, ExternalLink, Search, Filter, CalendarDays, TrendingUp, RefreshCw, CheckCircle } from "lucide-react";

const TIPO_LABELS: Record<TipoContrato, string> = {
  mantenimiento: "Mantenimiento / Soporte",
  hosting: "Hosting",
  soporte: "Soporte Técnico",
  proyecto_app: "Proyecto / App",
  otro: "Otro",
};

const TIPO_BADGE: Record<TipoContrato, string> = {
  mantenimiento: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  hosting: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  soporte: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  proyecto_app: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  otro: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const TIPOS_RECURRENTES: TipoContrato[] = ["mantenimiento", "hosting", "soporte", "otro"];

interface Props {
  contratos: Contrato[];
  clientes: Cliente[];
  facturas: Factura[];
  tasaCambio: TasaCambio | null;
  isAdmin: boolean;
  isGestion: boolean;
}

export default function ContratosClient({
  contratos, clientes, facturas, tasaCambio, isGestion,
}: Props) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [generando, setGenerando] = useState<string | null>(null);

  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anoActual = hoy.getFullYear();

  const clienteMap = useMemo(
    () => new Map(clientes.map((c) => [c.id, c])),
    [clientes]
  );

  // Solo contratos recurrentes activos
  const contratosRecurrentes = useMemo(
    () =>
      contratos.filter(
        (c) => c.activo && TIPOS_RECURRENTES.includes(c.tipo)
      ),
    [contratos]
  );

  // Detectar si ya se facturó este mes (busca factura con mismo nombre_proyecto del cliente en el mes actual)
  const facturadoEsteMes = useMemo(() => {
    const set = new Set<string>();
    facturas.forEach((f) => {
      if (f.estado === "anulada") return;
      const fecha = new Date(f.fecha + "T00:00:00");
      if (fecha.getFullYear() === anoActual && fecha.getMonth() + 1 === mesActual) {
        // key = clienteId + nombreProyecto
        set.add(`${f.clienteId}::${f.nombreProyecto || ""}`);
      }
    });
    return set;
  }, [facturas, anoActual, mesActual]);

  const filtrados = useMemo(() => {
    let lista = contratosRecurrentes;
    if (filtroTipo !== "todos") lista = lista.filter((c) => c.tipo === filtroTipo);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter((c) => {
        const cliente = clienteMap.get(c.clienteId);
        return (
          c.nombreProyecto.toLowerCase().includes(q) ||
          cliente?.nombre.toLowerCase().includes(q) ||
          cliente?.codigo?.toLowerCase().includes(q)
        );
      });
    }
    return lista;
  }, [contratosRecurrentes, filtroTipo, busqueda, clienteMap]);

  // Resumen
  const totalMensual = useMemo(
    () =>
      contratosRecurrentes.reduce(
        (s, c) => s + calcularMontoContrato(c, anoActual, mesActual),
        0
      ),
    [contratosRecurrentes, anoActual, mesActual]
  );

  const pendientesEsteMes = useMemo(
    () =>
      contratosRecurrentes.filter(
        (c) => !facturadoEsteMes.has(`${c.clienteId}::${c.nombreProyecto}`)
      ).length,
    [contratosRecurrentes, facturadoEsteMes]
  );

  async function generarFactura(contrato: Contrato) {
    const cliente = clienteMap.get(contrato.clienteId);
    if (!cliente) return;
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Servicios Recurrentes</h1>
          <p className="text-sm text-muted-foreground">
            Contratos activos de mantenimiento, hosting y soporte — factura mensual o anual
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="h-4 w-4 text-blue-400" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Contratos Activos</p>
            </div>
            <p className="text-2xl font-bold">{contratosRecurrentes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total este mes</p>
            </div>
            <p className="text-2xl font-bold font-mono">{formatLempiras(totalMensual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-amber-400" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes de facturar</p>
            </div>
            <p className="text-2xl font-bold text-amber-400">{pendientesEsteMes}</p>
            <p className="text-xs text-muted-foreground">este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o servicio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v ?? "todos")}>
          <SelectTrigger className="w-52">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="mantenimiento">Mantenimiento / Soporte</SelectItem>
            <SelectItem value="hosting">Hosting</SelectItem>
            <SelectItem value="soporte">Soporte Técnico</SelectItem>
            <SelectItem value="otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtrados.length} contrato{filtrados.length !== 1 ? "s" : ""}
            {filtroTipo !== "todos" ? ` · ${TIPO_LABELS[filtroTipo as TipoContrato]}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {contratosRecurrentes.length === 0
                ? "No hay contratos de servicios recurrentes activos. Créalos desde el detalle de un cliente."
                : "Sin resultados para la búsqueda"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead className="text-right">Monto este mes</TableHead>
                  <TableHead className="text-center">Este mes</TableHead>
                  {!isGestion && <TableHead className="w-28"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => {
                  const cliente = clienteMap.get(c.clienteId);
                  const monto = calcularMontoContrato(c, anoActual, mesActual);
                  const yaBilledKey = `${c.clienteId}::${c.nombreProyecto}`;
                  const yaFacturado = facturadoEsteMes.has(yaBilledKey);

                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/clientes/${c.clienteId}`}
                          className="font-medium hover:underline flex items-center gap-1"
                        >
                          {cliente?.nombre ?? "—"}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </Link>
                        {cliente?.codigo && (
                          <span className="text-xs text-muted-foreground font-mono">{cliente.codigo}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{c.nombreProyecto}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_BADGE[c.tipo]}`}>
                          {TIPO_LABELS[c.tipo]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatFecha(c.fechaInicio)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatLempiras(monto)}</TableCell>
                      <TableCell className="text-center">
                        {yaFacturado ? (
                          <Badge variant="outline" className="text-green-600 border-green-600 text-xs gap-1">
                            <CheckCircle className="h-3 w-3" /> Facturado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-amber-500 text-xs">Pendiente</Badge>
                        )}
                      </TableCell>
                      {!isGestion && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs w-full"
                            onClick={() => generarFactura(c)}
                            disabled={generando === c.id}
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            {generando === c.id ? "..." : "Facturar"}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Nota */}
      <p className="text-xs text-muted-foreground text-center">
        Para agregar o gestionar contratos, entra al{" "}
        <Link href="/clientes" className="underline hover:text-foreground">detalle del cliente</Link>
        {' → sección "Servicios Contratados". Los proyectos con hitos se gestionan desde el mismo detalle.'}
      </p>
    </div>
  );
}
