"use server";

import { Resend } from "resend";
import { Factura, Cotizacion, Cliente } from "@/lib/types";
import { EMPRESA } from "@/lib/empresa";
import { generarHtmlFactura } from "@/lib/email/factura-html";
import { generarHtmlCotizacion } from "@/lib/email/cotizacion-html";
import { generarHtmlEstadoCuenta } from "@/lib/email/estado-cuenta-html";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EnvioResult {
  ok: boolean;
  error?: string;
}

function toArray(para: string | string[]): string[] {
  if (Array.isArray(para)) return para.filter(Boolean);
  return para.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function enviarFactura(
  factura: Factura,
  para: string | string[],
  asunto: string,
  mensaje: string,
  pdfBase64?: string
): Promise<EnvioResult> {
  try {
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/Logo%20DB.png`;
    const html = generarHtmlFactura(factura, logoUrl);
    const cuerpo = mensaje.trim()
      ? `<p style="font-family:Arial,sans-serif;color:#374151;margin-bottom:24px">${mensaje.replace(/\n/g, "<br>")}</p>${html}`
      : html;

    const { error } = await resend.emails.send({
      from: `${EMPRESA.nombre} <facturacion@dbconsulting.hn>`,
      to: toArray(para),
      subject: asunto,
      html: cuerpo,
      attachments: pdfBase64
        ? [{ filename: `${factura.numero}.pdf`, content: pdfBase64 }]
        : undefined,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function enviarCotizacion(
  cotizacion: Cotizacion,
  para: string | string[],
  asunto: string,
  mensaje: string,
  pdfBase64?: string
): Promise<EnvioResult> {
  try {
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/Logo%20DB.png`;
    const html = generarHtmlCotizacion(cotizacion, logoUrl);
    const cuerpo = mensaje.trim()
      ? `<p style="font-family:Arial,sans-serif;color:#374151;margin-bottom:24px">${mensaje.replace(/\n/g, "<br>")}</p>${html}`
      : html;

    const { error } = await resend.emails.send({
      from: `${EMPRESA.nombre} <facturacion@dbconsulting.hn>`,
      to: toArray(para),
      subject: asunto,
      html: cuerpo,
      attachments: pdfBase64
        ? [{ filename: `${cotizacion.numero}.pdf`, content: pdfBase64 }]
        : undefined,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function enviarFacturasAgrupadas(
  facturas: Factura[],
  para: string | string[],
  asunto: string,
  mensaje: string,
  pdfs?: { filename: string; content: string }[]
): Promise<EnvioResult> {
  if (facturas.length === 0) return { ok: false, error: "Sin facturas seleccionadas" };

  try {
    const secciones = facturas
      .map(
        (f) => `
        <div style="margin-bottom:48px">
          ${generarHtmlFactura(f, `${process.env.NEXT_PUBLIC_APP_URL}/Logo%20DB.png`)}
        </div>`
      )
      .join('<hr style="border:none;border-top:2px dashed #e5e7eb;margin:32px 0">');

    const cuerpo = mensaje.trim()
      ? `<p style="font-family:Arial,sans-serif;color:#374151;margin-bottom:32px">${mensaje.replace(/\n/g, "<br>")}</p>${secciones}`
      : secciones;

    const { error } = await resend.emails.send({
      from: `${EMPRESA.nombre} <facturacion@dbconsulting.hn>`,
      to: toArray(para),
      subject: asunto,
      html: cuerpo,
      attachments: pdfs?.length ? pdfs : undefined,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function enviarEstadoCuenta(
  cliente: Cliente,
  facturas: Factura[],
  para: string | string[],
  asunto: string,
  mensaje: string,
  pdfBase64?: string
): Promise<EnvioResult> {
  try {
    const html = generarHtmlEstadoCuenta(cliente, facturas);
    const cuerpo = mensaje.trim()
      ? `<p style="font-family:Arial,sans-serif;color:#374151;margin-bottom:24px">${mensaje.replace(/\n/g, "<br>")}</p>${html}`
      : html;

    const { error } = await resend.emails.send({
      from: `${EMPRESA.nombre} <facturacion@dbconsulting.hn>`,
      to: toArray(para),
      subject: asunto,
      html: cuerpo,
      attachments: pdfBase64
        ? [{ filename: `Estado-Cuenta-${cliente.nombre.replace(/\s+/g, "-")}.pdf`, content: pdfBase64 }]
        : undefined,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
