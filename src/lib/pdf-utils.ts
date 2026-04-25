// Browser-only utility — only import from client components

export async function pdfBase64FromHtml(html: string): Promise<string> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1200px;border:none;";
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, 1500);
      iframe.onload = () => { clearTimeout(timer); resolve(); };
      iframe.onerror = () => { clearTimeout(timer); reject(new Error("Error cargando el documento")); };
      iframe.srcdoc = html;
    });

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("No se pudo acceder al documento del iframe");

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    // JPEG + scale 1.5 = ~80% reducción vs PNG scale 2 — evita error 413
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.82), "JPEG", 0, 0, pdfW, pdfH);

    return pdf.output("datauristring").split(",")[1];
  } finally {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }
}
