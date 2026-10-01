import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function captureInvoice(element, filename, format = "pdf") {
  if (!element) throw new Error("Invoice preview not ready");
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  if (format === "png") {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    link.click();
    return;
  }
  const image = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297;
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
  const w = canvas.width * ratio, h = canvas.height * ratio;
  pdf.addImage(image, "PNG", (pageW - w) / 2, 8, w, h);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function openWhatsApp(phone, message) {
  const clean = String(phone || "").replace(/\D/g, "");
  const normalized = clean.length === 10 ? `91${clean}` : clean;
  window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}
