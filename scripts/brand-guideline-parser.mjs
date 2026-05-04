import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

if (!process.getBuiltinModule) {
  process.getBuiltinModule = (name) => require(name);
}

if (!globalThis.DOMMatrix) {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init = null) {
      if (init && typeof init === "object") {
        Object.assign(this, init);
      }
    }

    preMultiplySelf() {
      return this;
    }

    translate() {
      return this;
    }

    scale() {
      return this;
    }

    invertSelf() {
      return this;
    }

    multiplySelf() {
      return this;
    }
  };
}

if (!globalThis.ImageData) {
  globalThis.ImageData = class ImageData {};
}

if (!globalThis.Path2D) {
  globalThis.Path2D = class Path2D {
    addPath() {}
  };
}

async function parsePdf(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false
  });

  const document = await loadingTask.promise;
  try {
    const textParts = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (item && typeof item === "object" && "str" in item ? String(item.str ?? "") : ""))
        .join(" ");
      if (pageText.trim()) {
        textParts.push(pageText);
      }
    }

    process.stdout.write(textParts.join("\n\n"));
  } finally {
    await document.destroy();
  }
}

async function parseDocx(buffer) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  process.stdout.write(result.value ?? "");
}

async function main() {
  const filePath = process.argv[2];
  const kind = process.argv[3] || path.extname(filePath || "").toLowerCase().replace(/^\./, "");

  if (!filePath) {
    throw new Error("A file path is required.");
  }

  const buffer = await readFile(filePath);
  if (kind === "pdf") {
    await parsePdf(buffer);
    return;
  }

  if (kind === "docx") {
    await parseDocx(buffer);
    return;
  }

  throw new Error(`Unsupported file kind: ${kind}`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
