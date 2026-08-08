import JSZip from "jszip";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export type DocumentAsset = {
  id: string;
  kind: "image" | "page";
  src: string;
  label: string;
};

export type ExtractedDocument = {
  text: string;
  assets: DocumentAsset[];
  metadata: {
    format: string;
    sizeBytes: number;
    pageCount?: number;
    sheetCount?: number;
    imageCount: number;
  };
};

const MAX_ASSETS = 24;

function formatFromName(name: string) {
  return name.split(".").pop()?.toUpperCase() || "DOCUMENT";
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlText(xml: string) {
  return [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
    .map((match) => decodeXml(match[1]).trim())
    .filter(Boolean)
    .join(" ");
}

function mimeForImage(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension === "svg" ? "image/svg+xml" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "gif" ? "image/gif" : "image/png";
}

async function zipImages(zip: JSZip, prefix: string) {
  const names = Object.keys(zip.files)
    .filter((name) => name.startsWith(prefix) && /\.(png|jpe?g|gif|webp|svg)$/i.test(name))
    .slice(0, MAX_ASSETS);
  const assets: DocumentAsset[] = [];

  for (const name of names) {
    const file = zip.files[name];
    if (!file || file.dir) continue;
    const base64 = await file.async("base64");
    assets.push({
      id: `asset-${assets.length + 1}`,
      kind: "image",
      src: `data:${mimeForImage(name)};base64,${base64}`,
      label: name.split("/").pop() || "Embedded image",
    });
  }

  return assets;
}

async function extractPdf(file: File, onProgress?: (value: number, detail: string) => void): Promise<ExtractedDocument> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const textParts: string[] = [];
  const assets: DocumentAsset[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    textParts.push(`Page ${pageNumber}:\n${pageText || "[No selectable text detected]"}`);

    if (assets.length < MAX_ASSETS) {
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, 1000 / viewport.width);
      const preview = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(preview.width);
      canvas.height = Math.ceil(preview.height);
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: preview }).promise;
      assets.push({
        id: `page-${pageNumber}`,
        kind: "page",
        src: canvas.toDataURL("image/jpeg", 0.62),
        label: `Page ${pageNumber} preview`,
      });
    }

    onProgress?.(Math.round((pageNumber / pdf.numPages) * 100), `Extracting PDF page ${pageNumber} of ${pdf.numPages}`);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  return {
    text: textParts.join("\n\n"),
    assets,
    metadata: { format: "PDF", sizeBytes: file.size, pageCount: pdf.numPages, imageCount: assets.length },
  };
}

async function extractOfficeZip(file: File, kind: "docx" | "pptx" | "xlsx"): Promise<ExtractedDocument> {
  const buffer = await file.arrayBuffer();
  const format = formatFromName(file.name);

  if (kind === "docx") {
    const zip = await JSZip.loadAsync(buffer);
    const raw = await mammoth.extractRawText({ arrayBuffer: buffer });
    const html = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const assets = await zipImages(zip, "word/media/");
    const htmlText = html.value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      text: [raw.value.trim(), htmlText && htmlText !== raw.value.trim() ? `Document structure:\n${htmlText}` : "", assets.length ? `Embedded images: ${assets.length}` : ""].filter(Boolean).join("\n\n"),
      assets,
      metadata: { format, sizeBytes: file.size, imageCount: assets.length },
    };
  }

  if (kind === "pptx") {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1] ?? 0) - Number(b.match(/slide(\d+)/)?.[1] ?? 0));
    const slides = [];
    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async("string");
      const slideMatch = slideFile.match(/slide(\d+)/);
      const slideNumber: number = Number(slideMatch?.[1] ?? String(slides.length + 1));
      slides.push(`Slide ${slideNumber}:\n${xmlText(xml) || "[No visible slide text extracted]"}`);
    }
    const notes = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
        .sort()
        .map(async (name) => xmlText(await zip.files[name].async("string"))),
    );
    const assets = await zipImages(zip, "ppt/media/");
    return {
      text: [slides.join("\n\n"), notes.filter(Boolean).length ? `Speaker notes:\n${notes.filter(Boolean).join("\n\n")}` : "", assets.length ? `Embedded images: ${assets.length}` : ""].filter(Boolean).join("\n\n"),
      assets,
      metadata: { format, sizeBytes: file.size, pageCount: slideFiles.length, imageCount: assets.length },
    };
  }

  const workbook = XLSX.read(buffer, { type: "array", cellFormula: true, cellHTML: true });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    const formulas = XLSX.utils.sheet_to_formulae(sheet);
    return [`Sheet: ${name}`, csv, formulas.length ? `Formulas:\n${formulas.join("\n")}` : ""].filter(Boolean).join("\n");
  });
  const assets = file.name.toLowerCase().endsWith(".xls")
    ? []
    : await zipImages(await JSZip.loadAsync(buffer), "xl/media/");
  return {
    text: [sheets.join("\n\n"), assets.length ? `Embedded images: ${assets.length}` : ""].filter(Boolean).join("\n\n"),
    assets,
    metadata: { format, sizeBytes: file.size, sheetCount: workbook.SheetNames.length, imageCount: assets.length },
  };
}

export async function extractDocument(file: File, onProgress?: (value: number, detail: string) => void): Promise<ExtractedDocument> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type === "text/plain") {
    return {
      text: await file.text(),
      assets: [],
      metadata: { format: "TXT", sizeBytes: file.size, imageCount: 0 },
    };
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") return extractPdf(file, onProgress);
  if (name.endsWith(".docx")) return extractOfficeZip(file, "docx");
  if (name.endsWith(".pptx")) return extractOfficeZip(file, "pptx");
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm") || name.endsWith(".xls")) return extractOfficeZip(file, "xlsx");
  throw new Error("This format needs conversion first. Upload PDF, DOCX, PPTX, XLS, XLSX, XLSM, or TXT.");
}
