import PDFDocument from "pdfkit";
import { NotFoundError } from "../utils/errors.js";
import * as chatRepo from "../repositories/chat.repo.js";
import { sanitizeFilename } from "../utils/text.js";

export interface ExportResult {
  content: Buffer;
  contentType: string;
  filename: string;
}

function roleLabel(role: string): string {
  return role === "USER" ? "User" : "Assistant";
}

export async function exportChatMarkdown(userId: string, chatId: string): Promise<ExportResult> {
  const { chat, messages } = await loadChat(userId, chatId);
  const lines: string[] = [
    `# ${chat.title}`,
    "",
    `Exported from AI Knowledge Base on ${new Date().toISOString()}`,
    "",
    "---",
    "",
  ];
  for (const message of messages) {
    lines.push(`## ${roleLabel(message.role)}`);
    lines.push("");
    lines.push(message.content);
    lines.push("");
    if (message.citations && Array.isArray(message.citations) && message.citations.length > 0) {
      lines.push("**Sources:**");
      const citations = message.citations as { index: number; documentName: string }[];
      for (const citation of citations.slice(0, 10)) {
        lines.push(`- [${citation.index}] ${citation.documentName}`);
      }
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  const content = Buffer.from(lines.join("\n"), "utf8");
  return {
    content,
    contentType: "text/markdown",
    filename: `${sanitizeFilename(chat.title)}.md`,
  };
}

export async function exportChatPdf(userId: string, chatId: string): Promise<ExportResult> {
  const { chat, messages } = await loadChat(userId, chatId);

  const doc = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 48, left: 48, right: 48 } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const title = chat.title.slice(0, 100);
  doc.fontSize(18).fillColor("#0f172a").text(title, { align: "left" });
  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .fillColor("#64748b")
    .text(`AI Knowledge Base • ${new Date().toISOString()}`, { align: "left" });
  doc.moveDown(1);

  for (const message of messages) {
    const label = roleLabel(message.role);
    const color = message.role === "USER" ? "#1d4ed8" : "#0f766e";
    doc.fontSize(11).fillColor(color).text(label);
    doc.moveDown(0.2);

    const text = message.content
      .replace(/```[\s\S]*?```/g, (block) => block.split("\n").slice(0, 12).join("\n"))
      .replace(/([#>*`[\]()-])/g, "");

    doc.fontSize(9.5).fillColor("#1e293b").text(text, { lineGap: 3 });
    doc.moveDown(0.5);

    if (message.citations && Array.isArray(message.citations) && message.citations.length > 0) {
      const citations = message.citations as { index: number; documentName: string }[];
      doc
        .fontSize(8)
        .fillColor("#64748b")
        .text(
          `Sources: ${citations
            .slice(0, 10)
            .map((c) => `[${c.index}] ${c.documentName}`)
            .join(", ")}`,
        );
      doc.moveDown(0.5);
    }

    if (doc.y > 720) {
      doc.addPage();
    }
  }

  doc.end();

  const content = await new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  return {
    content,
    contentType: "application/pdf",
    filename: `${sanitizeFilename(chat.title)}.pdf`,
  };
}

async function loadChat(userId: string, chatId: string) {
  const chat = await chatRepo.findChatById(chatId);
  if (!chat || chat.userId !== userId) {
    throw new NotFoundError("Chat not found");
  }
  const messages = await chatRepo.listMessagesByChat(chatId);
  return { chat, messages };
}
