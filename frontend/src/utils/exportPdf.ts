import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PdfColumn {
  header: string
  dataKey: string
}

export interface PdfSection {
  title: string
  columns: PdfColumn[]
  rows: Record<string, string | number>[]
}

export interface ExportPdfOptions {
  title: string
  subtitle?: string
  filename: string
  sections: PdfSection[]
}

/**
 * jsPDF ships only the core Helvetica font, which lacks glyphs such as the
 * rupee sign. Normalise non-Latin characters and control chars so PDF text
 * renders cleanly.
 */
export function sanitizePdfText(value: string): string {
  return value
    .replace(/₹/g, 'Rs. ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function exportTablePdf(options: ExportPdfOptions): void {
  const { title, subtitle, filename, sections } = options
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  doc.setFillColor(21, 94, 177)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 34, 'F')
  doc.setFontSize(15)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(sanitizePdfText(title), 14, 21)

  if (subtitle) {
    doc.setFontSize(9)
    doc.setTextColor(220, 230, 245)
    doc.setFont('helvetica', 'normal')
    doc.text(sanitizePdfText(subtitle), 14, 29)
  }

  let cursorY = 40

  sections.forEach((section, index) => {
    if (section.rows.length === 0) return

    if (index > 0) {
      if (cursorY > 180) {
        doc.addPage()
        cursorY = 16
      } else {
        cursorY += 12
      }
    }

    doc.setFontSize(11)
    doc.setTextColor(21, 94, 177)
    doc.setFont('helvetica', 'bold')
    doc.text(sanitizePdfText(section.title), 14, cursorY)
    cursorY += 4

    autoTable(doc, {
      startY: cursorY + 2,
      head: [section.columns.map((c) => sanitizePdfText(c.header))],
      body: section.rows.map((row) =>
        section.columns.map((c) => sanitizePdfText(String(row[c.dataKey] ?? '')))
      ),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: {
        fillColor: [30, 90, 168],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [242, 246, 251] },
    })

    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } })
      .lastAutoTable.finalY
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Sovereign Cyber-Risk Observatory · Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    )
  }

  doc.save(filename)
}