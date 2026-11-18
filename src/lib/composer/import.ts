// Opens a document file in the composer: Word (.docx), web pages (.html),
// Markdown (.md) and plain text (.txt). PDFs don't come here; they go
// straight to field placement as before.

import { docxToHtml, type ImportedDocument } from "./docx.ts";
import { markdownToHtml } from "./markdown.ts";
import { sanitizeHtml, textToHtml } from "./sanitize.ts";

export type { ImportedDocument };

export const COMPOSER_IMPORT_ACCEPT =
  ".docx,.htm,.html,.md,.markdown,.txt,.text,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,text/markdown,text/plain";

const MAX_IMPORT_BYTES = 30 * 1024 * 1024;

type Kind = "docx" | "html" | "markdown" | "text";

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

function kindOf(file: File): Kind | "doc" | "other" {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".doc")) return "doc";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "html";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "markdown";
  if (name.endsWith(".txt") || name.endsWith(".text")) return "text";
  if (file.type === "text/html") return "html";
  if (file.type === "text/markdown") return "markdown";
  if (file.type === "text/plain") return "text";

  return "other";
}

/** Whether a dropped or chosen file opens in the composer. */
export function isComposerImportable(file: File) {
  const kind = kindOf(file);

  return kind !== "other";
}

export function titleFromFileName(name: string) {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function importDocumentFile(
  file: File,
): Promise<ImportedDocument> {
  const kind = kindOf(file);

  if (kind === "doc") {
    throw new ImportError(
      "That's an older Word file (.doc). Open it in Word or Google Docs and save it as .docx or PDF, then try again.",
    );
  }

  if (kind === "other") {
    throw new ImportError(
      "That kind of file can't be opened here. Use a PDF, a Word document (.docx), HTML, Markdown or plain text.",
    );
  }

  if (file.size > MAX_IMPORT_BYTES) {
    throw new ImportError(
      "That document is larger than 30 MB. Choose a smaller one.",
    );
  }

  const title = titleFromFileName(file.name);

  try {
    if (kind === "docx") {
      const imported = await docxToHtml(await file.arrayBuffer());
      return {
        ...imported,
        html: sanitizeHtml(imported.html) || "<p><br></p>",
        title: imported.title || title,
      };
    }

    const text = await file.text();
    const html =
      kind === "html"
        ? sanitizeHtml(text)
        : kind === "markdown"
          ? sanitizeHtml(markdownToHtml(text))
          : textToHtml(text);

    return { html: html || "<p><br></p>", notes: [], title };
  } catch (error) {
    if (error instanceof ImportError) throw error;
    console.error("Document import failed.", error);
    throw new ImportError(
      kind === "docx"
        ? "This Word document couldn't be read. It may be damaged or password-protected. Try saving it again, or export it as a PDF."
        : "This file couldn't be read. Try saving it again.",
    );
  }
}
