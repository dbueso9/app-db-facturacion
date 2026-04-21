"use server";

import { unstable_cache } from "next/cache";
import * as XLSX from "xlsx";

const BCH_URL =
  "https://www.bch.hn/estadisticos/GIE/LIBTipo%20de%20cambio/Precio%20Promedio%20Diario%20del%20D%C3%B3lar.xlsx";

export interface TasaCambio {
  fecha: string;
  compra: number;
  venta: number;
}

async function _fetchTasaCambio(): Promise<TasaCambio> {
  const res = await fetch(BCH_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`BCH fetch failed: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i] as unknown[];
    if (row[0] instanceof Date && typeof row[1] === "number" && typeof row[2] === "number") {
      return {
        fecha: (row[0] as Date).toISOString().split("T")[0],
        compra: Math.round((row[1] as number) * 10000) / 10000,
        venta: Math.round((row[2] as number) * 10000) / 10000,
      };
    }
  }
  throw new Error("No se encontró tasa de cambio válida en el archivo BCH");
}

// Cache por 1 hora — el BCH actualiza una vez al día
export const getTasaCambio = unstable_cache(_fetchTasaCambio, ["tasa-cambio-bch"], {
  revalidate: 3600,
  tags: ["tasa-cambio"],
});
