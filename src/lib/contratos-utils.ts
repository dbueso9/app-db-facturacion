import { Contrato } from "@/lib/types";
import { MESES_LARGO } from "@/lib/utils";

export function calcularMontoContrato(contrato: Contrato, año: number, mes: number): number {
  const inicio = new Date(contrato.fechaInicio + "T00:00:00");
  const mesInicio = inicio.getMonth() + 1;
  const anoInicio = inicio.getFullYear();

  if (contrato.tipo === "mantenimiento") {
    const valorAnual = contrato.valorBase * 0.17;
    if (anoInicio === año) {
      const mesesRestantes = 12 - mesInicio + 1;
      return Math.round((valorAnual / 12) * mesesRestantes * 100) / 100;
    }
    return Math.round(valorAnual * 100) / 100;
  }

  return contrato.valorBase;
}

export function descripcionFacturaContrato(contrato: Contrato, año: number, mes: number): string {
  const mesNombre = MESES_LARGO[mes - 1];

  switch (contrato.tipo) {
    case "mantenimiento":
      return `Mantenimiento y Soporte — ${contrato.nombreProyecto} ${año}`;
    case "hosting":
      return `Hosting — ${contrato.nombreProyecto} ${mesNombre} ${año}`;
    case "soporte":
      return `Soporte Técnico — ${contrato.nombreProyecto} ${mesNombre} ${año}`;
    case "proyecto_app":
      return `Servicio App — ${contrato.nombreProyecto} ${mesNombre} ${año}`;
    default:
      return `${contrato.nombreProyecto} — ${mesNombre} ${año}`;
  }
}
