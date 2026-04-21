"use server";

import { Resend } from "resend";
import { Factura, Cotizacion } from "@/lib/types";
import { EMPRESA } from "@/lib/empresa";
import { generarHtmlFactura } from "@/lib/email/factura-html";
import { generarHtmlCotizacion } from "@/lib/email/cotizacion-html";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EnvioResult {
  ok: boolean;
  error?: string;
}

export async function enviarFactura(
  factura: Factura,
  para: string,
  asunto: string,
  mensaje: string
): Promise<EnvioResult> {
  try {
    const html = generarHtmlFactura(factura);
    const cuerpo = mensaje.trim()
      ? `<p style="font-family:Arial,sans-serif;color:#374151;margin-bottom:24px">${mensaje.replace(/\n/g, "<br>")}</p>${html}`
      : html;

    const { error } = await resend.emails.send({
      from: `${EMPRESA.nombre} <onboarding@resend.dev>`,
      to: [para],
      subject: asunto,
      html: cuerpo,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function enviarCotizacion(
  cotizacion: Cotizacion,
  para: string,
  asunto: string,
  mensaje: string
): Promise<EnvioResult> {
  try {
    const html = generarHtmlCotizacion(cotizacion);
    const cuerpo = mensaje.trim()
      ? `<p style="font-family:Arial,sans-serif;color:#374151;margin-bottom:24px">${mensaje.replace(/\n/g, "<br>")}</p>${html}`
      : html;

    const { error } = await resend.emails.send({
      from: `${EMPRESA.nombre} <onboarding@resend.dev>`,
      to: [para],
      subject: asunto,
      html: cuerpo,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function enviarFacturasAgrupadas(
  facturas: Factura[],
  para: string,
  asunto: string,
  mensaje: string
): Promise<EnvioResult> {
  if (facturas.length === 0) return { ok: false, error: "Sin facturas seleccionadas" };

  try {
    // Build combined email: message + one invoice section per factura
    const secciones = facturas
      .map(
        (f) => `
        <div style="margin-bottom:48px">
          ${generarHtmlFactura(f)}
        </div>`
      )
      .join('<hr style="border:none;border-top:2px dashed #e5e7eb;margin:32px 0">');

    const cuerpo = mensaje.trim()
      ? `<p style="font-family:Arial,sans-serif;color:#374151;margin-bottom:32px">${mensaje.replace(/\n/g, "<br>")}</p>${secciones}`
      : secciones;

    const { error } = await resend.emails.send({
      from: `${EMPRESA.nombre} <onboarding@resend.dev>`,
      to: [para],
      subject: asunto,
      html: cuerpo,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
