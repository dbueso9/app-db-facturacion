export interface Cliente {
  id: string;
  nombre: string;
  rtn: string;
  direccion: string;
  correo: string;
  telefono: string;
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
  notas: string;
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
