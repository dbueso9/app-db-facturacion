export const EMPRESA = {
  nombre: "DB Consulting",
  rtn: "04011980003740",
  direccion: "Res. San Roberto de Sula, San Pedro Sula, Honduras C.A.",
  telefono: "504 99787849",
  correo: "dbconsulting.hn@gmail.com",
  instagram: "https://www.instagram.com/dbconsulting.hn/",
  cai: "3E9D56-B1EC3B-C89DE0-63BE03-0909C5-42",
  rangoDesde: "000-001-04-00000101",
  rangoHasta: "000-001-04-00000150",
  fechaLimiteEmision: "12/09/2026",
  fechaRecepcion: "12/09/2025",
  establecimiento: "000",
  puntoEmision: "001",
  tipoDocumento: "04",
  secuenciaInicio: 101,
  secuenciaFin: 150,
  isv: 0.15,
  banco: { nombre: "BAC Credomatic", cuenta: "200296096", tipo: "Ahorro" },
} as const;

export function formatNumeroFactura(secuencia: number): string {
  const seq = String(secuencia).padStart(8, "0");
  return `N.${EMPRESA.establecimiento}-${EMPRESA.puntoEmision}-${EMPRESA.tipoDocumento}-${seq}`;
}
