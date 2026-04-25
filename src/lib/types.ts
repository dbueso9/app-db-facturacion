export interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  rtn: string;
  direccion: string;
  correo: string;
  correo2?: string;
  correo3?: string;
  telefono: string;
  creadoEn: string;
}

export type TipoContrato = "mantenimiento" | "hosting" | "soporte" | "proyecto_app" | "otro";

export interface Contrato {
  id: string;
  clienteId: string;
  nombreProyecto: string;
  tipo: TipoContrato;
  valorBase: number;
  fechaInicio: string;
  diaFacturacion: 1 | 2;
  activo: boolean;
  notas: string;
  creadoEn: string;
}

export interface LineaFactura {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export type EstadoFactura = "borrador" | "emitida" | "pagada" | "anulada";
export type MetodoPago = "transferencia" | "cheque" | "efectivo";

export interface Factura {
  id: string;
  numero: string;
  secuencia: number;
  fecha: string;
  fechaVencimiento: string;
  clienteId: string;
  cliente: Cliente;
  lineas: LineaFactura[];
  subtotal: number;
  isv: number;
  total: number;
  estado: EstadoFactura;
  metodoPago?: MetodoPago;
  condicionPago?: number;
  tasaCambio?: number;
  nombreProyecto?: string;
  notas: string;
  creadaEn: string;
}

export type EstadoHito = "pendiente" | "facturado";

export interface Hito {
  id: string;
  contratoId: string;
  nombre: string;
  porcentaje: number;
  monto: number;
  estado: EstadoHito;
  facturaId?: string;
  orden: number;
  creadoEn: string;
}

export type EstadoCotizacion = "borrador" | "enviada" | "aceptada" | "rechazada";

export interface LineaCotizacion {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  numero: string;
  secuencia: number;
  fecha: string;
  fechaValidez: string;
  clienteId: string;
  cliente: Cliente;
  lineas: LineaCotizacion[];
  subtotal: number;
  isv: number;
  total: number;
  estado: EstadoCotizacion;
  nombreProyecto?: string;
  notas: string;
  convertidaAFacturaId?: string;
  convertidaAContratoId?: string;
  creadaEn: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  precioBase: number;
  categoria: CategoriaServicio;
}

export type CategoriaServicio =
  | "consultoria"
  | "hosting"
  | "desarrollo_web"
  | "desarrollo_app"
  | "soporte"
  | "otro";
