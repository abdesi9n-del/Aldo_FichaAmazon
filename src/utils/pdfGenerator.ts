import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExtractedProduct } from '../../server.ts';

// Helper to load image as base64 data URL for jsPDF
async function getBase64ImageFromUrl(url: string): Promise<{ data: string; format: string } | null> {
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
        resolve({ data: base64data, format });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

export async function generateProductPDF(product: ExtractedProduct): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 16;

  // Header Banner with Navy/Indigo Gradient style
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // App / Brand Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FICHA TÉCNICA Y ESPECIFICACIONES', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const sourceName = product.source === 'amazon' ? 'Amazon México' : product.source === 'mercadolibre' ? 'Mercado Libre México' : 'Comercio Electrónico';
  doc.text(`Origen: ${sourceName}  |  Identificador: ${product.skuOrAsin}  |  Emisión: ${new Date().toLocaleDateString('es-MX')}`, margin, 20);

  currentY = 35;

  // Try to load product main image
  let imageAdded = false;
  const imageWidth = 45;
  const imageHeight = 45;
  const imgBoxX = margin;
  const textLeftX = margin + imageWidth + 8;
  const textRightLimit = pageWidth - margin;

  if (product.mainImage) {
    const imgData = await getBase64ImageFromUrl(product.mainImage);
    if (imgData) {
      try {
        // Draw subtle border around image
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(imgBoxX, currentY, imageWidth, imageHeight, 2, 2, 'FD');
        doc.addImage(imgData.data, imgData.format, imgBoxX + 2, currentY + 2, imageWidth - 4, imageHeight - 4, undefined, 'FAST');
        imageAdded = true;
      } catch (err) {
        console.warn('Could not render image in PDF:', err);
      }
    }
  }

  const startTextX = imageAdded ? textLeftX : margin;
  const maxTitleWidth = imageAdded ? (pageWidth - margin - textLeftX) : (pageWidth - 2 * margin);

  // Product Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(product.title, maxTitleWidth);
  const titleHeight = titleLines.length * 5.2;
  doc.text(titleLines, startTextX, currentY + 4);

  let metaY = currentY + 4 + titleHeight + 3;

  // Pricing & Brand
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 116, 144); // cyan-700
  const formattedPrice = new Intl.NumberFormat('es-MX', { style: 'currency', currency: product.currency || 'MXN' }).format(product.price);
  let priceStr = `Precio: ${formattedPrice}`;
  if (product.originalPrice && product.originalPrice > product.price) {
    const origFormatted = new Intl.NumberFormat('es-MX', { style: 'currency', currency: product.currency || 'MXN' }).format(product.originalPrice);
    priceStr += ` (Antes: ${origFormatted}${product.discountPercentage ? ` -${product.discountPercentage}% OFF` : ''})`;
  }
  doc.text(priceStr, startTextX, metaY);

  metaY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Marca: ${product.brand || 'No especificada'}   |   Modelo: ${product.model || 'Estándar'}`, startTextX, metaY);

  metaY += 5;
  doc.text(`Disponibilidad: ${product.availability}   |   Vendedor: ${product.seller}`, startTextX, metaY);

  // Advance Y past image or text
  currentY = Math.max(currentY + (imageAdded ? imageHeight : 0), metaY + 6) + 4;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // Key Features / Bullet points
  if (product.bulletPoints && product.bulletPoints.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('CARACTERÍSTICAS PRINCIPALES', margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const bpList = product.bulletPoints.slice(0, 5);
    for (const bp of bpList) {
      if (currentY > pageHeight - 25) {
        doc.addPage();
        currentY = 20;
      }
      const lines = doc.splitTextToSize(`• ${bp}`, pageWidth - 2 * margin);
      doc.text(lines, margin + 2, currentY);
      currentY += lines.length * 4.2 + 1;
    }
    currentY += 3;
  }

  // Technical Specifications Table
  if (product.specifications && product.specifications.length > 0) {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('ESPECIFICACIONES TÉCNICAS', margin, currentY);
    currentY += 3;

    const tableRows = product.specifications.map((s) => [s.key, s.value]);

    autoTable(doc, {
      startY: currentY,
      head: [['Especificación / Atributo', 'Valor / Detalle']],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', textColor: [51, 65, 85] },
        1: { cellWidth: 'auto', textColor: [30, 41, 59] },
      },
      margin: { left: margin, right: margin },
    });

    // @ts-ignore
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Description section
  if (product.description && product.description.length > 20) {
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('DESCRIPCIÓN DEL PRODUCTO', margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(product.description.slice(0, 1400), pageWidth - 2 * margin);
    doc.text(descLines, margin, currentY);
    currentY += descLines.length * 3.8 + 6;
  }

  // Warranty Box
  if (product.warranty) {
    if (currentY > pageHeight - 25) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Garantía y Respaldo: ${product.warranty}`, margin + 4, currentY + 7.5);
    currentY += 16;
  }

  // Add Page Numbers and Footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Generado con Extractor de Fichas (Amazon MX & Mercado Libre) - Página ${i} de ${totalPages}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Ref: ${product.url.slice(0, 60)}...`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Save the PDF
  const sanitizedTitle = (product.title || 'Ficha_Producto')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  doc.save(`${sanitizedTitle}_Ficha_Tecnica.pdf`);
}
