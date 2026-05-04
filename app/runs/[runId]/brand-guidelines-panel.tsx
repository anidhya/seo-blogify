"use client";

import { useState } from "react";
import type { RunBrandGuidelines } from "@/lib/types";

type Props = {
  runId: string;
  domain: string;
  initialGuidelines: RunBrandGuidelines | null;
};

type ApiResponse = {
  brandGuidelines?: RunBrandGuidelines | null;
  error?: string;
};

function formatBytes(byteLength: number) {
  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  if (byteLength < 1024 * 1024) {
    return `${Math.round(byteLength / 102.4) / 10} KB`;
  }

  return `${Math.round(byteLength / (1024 * 102.4)) / 10} MB`;
}

function formatDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export default function BrandGuidelinesPanel({ runId, domain, initialGuidelines }: Props) {
  const [guidelines, setGuidelines] = useState<RunBrandGuidelines | null>(initialGuidelines);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFiles() {
    if (selectedFiles.length === 0) {
      setError("Choose at least one file to upload.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("Uploading brand guidelines...");

    try {
      const formData = new FormData();
      formData.append("runId", runId);
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      const response = await fetch("/api/brand-guidelines", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Upload failed.");
      }

      setGuidelines(data.brandGuidelines ?? null);
      setSelectedFiles([]);
      setInputKey((value) => value + 1);
      setStatus("Brand guidelines saved.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Upload failed.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function removeFile(fileId: string) {
    setBusy(true);
    setError(null);
    setStatus("Updating brand guidelines...");

    try {
      const response = await fetch(
        `/api/brand-guidelines?runId=${encodeURIComponent(runId)}&fileId=${encodeURIComponent(fileId)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Update failed.");
      }

      setGuidelines(data.brandGuidelines ?? null);
      setStatus("Brand guidelines updated.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Update failed.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  const files = guidelines?.snapshot.files ?? [];

  return (
    <section className="rounded-xl border border-black/8 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Brand guidelines</p>
          <h4 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {guidelines ? "Guidelines are active for this brand" : `Upload files for ${domain}`}
          </h4>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Uploaded files are saved to this domain and used automatically when drafting, scoring, and rewriting articles.
          </p>
        </div>
        <div className="rounded-full border border-[#0f7b49]/15 bg-[#0f7b49]/8 px-3 py-1 text-[11px] font-semibold text-[#0f7b49] dark:border-[#86efac]/20 dark:bg-[#86efac]/10 dark:text-[#86efac]">
          {guidelines ? `${files.length} file${files.length === 1 ? "" : "s"}` : "Not set"}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-dashed border-black/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/3">
          <input
            key={inputKey}
            type="file"
            multiple
            accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
            className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0f172a] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#111827] dark:text-zinc-400"
            disabled={busy}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={uploadFiles}
              disabled={busy || selectedFiles.length === 0}
              className="rounded-lg bg-[#0f172a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving..." : "Upload files"}
            </button>
            <p className="text-xs text-zinc-400">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected`
                : "TXT, MD, PDF, and DOCX supported"}
            </p>
          </div>
        </div>

        {status ? <p className="text-xs font-medium text-[#0f7b49] dark:text-[#86efac]">{status}</p> : null}
        {error ? <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}

        {guidelines ? (
          <div className="grid gap-3">
            <details className="rounded-xl border border-black/8 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/3">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-lg text-left outline-none [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Current summary</p>
                  <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    {guidelines.snapshot.summary}
                  </p>
                </div>
                <span className="mt-0.5 rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
                  Expand
                </span>
              </summary>
              <div className="mt-3 border-t border-black/8 pt-3 dark:border-white/10">
                <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{guidelines.snapshot.guidanceText}</p>
              </div>
            </details>
            <div className="grid gap-2">
              {files.map((file) => (
                <div
                  key={file.fileId}
                  className="rounded-xl border border-black/8 bg-white p-3 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{file.fileName}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {file.extension.toUpperCase()} · {formatBytes(file.byteLength)} · {formatDate(file.uploadedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.fileId)}
                      disabled={busy}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {file.extractedText.slice(0, 220)}
                    {file.extractedText.length > 220 ? "..." : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-black/10 bg-zinc-50 p-3 text-sm text-zinc-500 dark:border-white/10 dark:bg-white/3 dark:text-zinc-400">
            No guideline files have been uploaded for this brand yet.
          </div>
        )}
      </div>
    </section>
  );
}
