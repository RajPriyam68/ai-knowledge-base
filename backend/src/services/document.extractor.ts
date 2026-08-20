import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import mammoth from "mammoth";
import { BadRequestError } from "../utils/errors.js";

export type DocumentExtension = "pdf" | "docx" | "txt" | "md";

export async function extractTextFromBuffer(
  extension: DocumentExtension,
  buffer: Buffer,
): Promise<string> {
  switch (extension) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractDocxText(buffer);
    case "txt":
    case "md":
      return buffer.toString("utf8");
    default:
      throw new BadRequestError(`Unsupported document extension: ${extension}`);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { getDocument } = pdfjsLib;
  let pdf: pdfjsLib.PDFDocumentProxy | null = null;
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0,
    });
    pdf = await loadingTask.promise;
    const textParts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ("str" in item && item.str) {
          textParts.push(item.str);
        }
      }
    }
    const text = textParts.join(" ").replace(/\s+/g, " ").trim();
    if (text.length === 0) {
      throw new BadRequestError("The PDF appears to contain no extractable text (scanned image PDF?)");
    }
    return text;
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  } finally {
    if (pdf) {
      await pdf.destroy().catch(() => undefined);
    }
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value ?? "").trim();
    if (text.length === 0) {
      throw new BadRequestError("The DOCX file appears to contain no extractable text.");
    }
    return text;
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
