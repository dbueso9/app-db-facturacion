"use client";

import { Cliente, Factura, Servicio } from "./types";
import { EMPRESA, formatNumeroFactura } from "./empresa";

const KEYS = {
  clientes: "dbc_clientes",
  facturas: "dbc_facturas",
  servicios: "dbc_servicios",
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// Clientes
export function getClientes(): Cliente[] {
  return load<Cliente[]>(KEYS.clientes, []);
}

export function saveCliente(cliente: Cliente): void {
  const lista = getClientes();
  const idx = lista.findIndex((c) => c.id === cliente.id);
  if (idx >= 0) lista[idx] = cliente;
  else lista.push(cliente);
  save(KEYS.clientes, lista);
}

export function deleteCliente(id: string): void {
  save(KEYS.clientes, getClientes().filter((c) => c.id !== id));
}

// Facturas
export function getFacturas(): Factura[] {
  return load<Factura[]>(KEYS.facturas, []);
}

export function getFactura(id: string): Factura | undefined {
  return getFacturas().find((f) => f.id === id);
}

export function getSiguienteSecuencia(): number {
  const facturas = getFacturas().filter((f) => f.estado !== "anulada");
  if (facturas.length === 0) return EMPRESA.secuenciaInicio;
  const max = Math.max(...facturas.map((f) => f.secuencia));
  return max + 1;
}

export function saveFactura(factura: Factura): void {
  const lista = getFacturas();
  const idx = lista.findIndex((f) => f.id === factura.id);
  if (idx >= 0) lista[idx] = factura;
  else lista.push(factura);
  save(KEYS.facturas, lista);
}

export function deleteFactura(id: string): void {
  save(KEYS.facturas, getFacturas().filter((f) => f.id !== id));
}

export function crearNumeroFactura(): { secuencia: number; numero: string } {
  const secuencia = getSiguienteSecuencia();
  return { secuencia, numero: formatNumeroFactura(secuencia) };
}

// Servicios
const SERVICIOS_DEFAULT: Servicio[] = [
  { id: "s1", nombre: "Consultoría IT", descripcion: "Asesoría y consultoría en tecnología", precioBase: 1500, categoria: "consultoria" },
  { id: "s2", nombre: "Hosting Web", descripcion: "Alojamiento web anual", precioBase: 800, categoria: "hosting" },
  { id: "s3", nombre: "Desarrollo Web", descripcion: "Desarrollo de sitio web corporativo", precioBase: 15000, categoria: "desarrollo_web" },
  { id: "s4", nombre: "Desarrollo de App", descripcion: "Desarrollo de aplicación móvil", precioBase: 25000, categoria: "desarrollo_app" },
  { id: "s5", nombre: "Soporte Técnico", descripcion: "Soporte técnico mensual", precioBase: 500, categoria: "soporte" },
  { id: "s6", nombre: "Mantenimiento Web", descripcion: "Mantenimiento mensual de sitio web", precioBase: 700, categoria: "desarrollo_web" },
];

export function getServicios(): Servicio[] {
  return load<Servicio[]>(KEYS.servicios, SERVICIOS_DEFAULT);
}

export function saveServicio(servicio: Servicio): void {
  const lista = getServicios();
  const idx = lista.findIndex((s) => s.id === servicio.id);
  if (idx >= 0) lista[idx] = servicio;
  else lista.push(servicio);
  save(KEYS.servicios, lista);
}

export function deleteServicio(id: string): void {
  save(KEYS.servicios, getServicios().filter((s) => s.id !== id));
}
