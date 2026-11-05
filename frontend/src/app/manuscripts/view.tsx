"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { Notice } from "@/components/evidence";
import { EmptyState, QueryView } from "@/components/states";
import { Button, PageHeader, Panel, Section, formatDate } from "@/components/ui";
import { useManuscripts, useUploadManuscript } from "@/lib/api";
import type { Manuscript } from "@/lib/api/schemas";

const ACCEPTED = ["image/png", "image/jpeg", "image/tiff", "image/webp", "application/pdf"];
const MAX_MB = 25;

const STATUS: Record<Manuscript["status"], { label: string; className: string }> = {
  processing: { label: "Processing", className: "bg-subtle text-body" },
  review: { label: "Needs review", className: "bg-warn-soft text-warn" },
  confirmed: { label: "Confirmed", className: "bg-leaf-soft text-leaf-dark" },
  failed: { label: "Failed", className: "bg-danger-soft text-danger" },
};

export function ManuscriptsView() {
  const router = useRouter();
  const query = useManuscripts();
  const upload = useUploadManuscript();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setFileError("Choose a PNG, JPEG, TIFF or WebP image, or a PDF.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setFileError(`Files must be ${MAX_MB} MB or smaller.`);
      return;
    }
    setFileError(null);
    upload.mutate(file, { onSuccess: (m) => router.push(`/manuscripts/${m.id}`) });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <>
      <PageHeader
        title="Manuscripts"
        description="Upload a manuscript to extract its text and identify ingredients. You review every result before it is used."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mb-4 rounded-xl border border-dashed px-6 py-12 text-center transition-colors ${
          dragging ? "border-leaf bg-leaf-soft" : "border-line-strong bg-surface"
        }`}
      >
        <FileUp className="mx-auto size-6 text-leaf" aria-hidden />
        <p className="mt-3 text-sm font-medium">Drag a manuscript here, or choose a file</p>
        <p className="mt-1 text-[13px] text-muted">PNG, JPEG, TIFF, WebP or PDF, up to {MAX_MB} MB</p>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          aria-label="Choose a manuscript file"
          tabIndex={-1}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" className="mt-4" disabled={upload.isPending} onClick={() => input.current?.click()}>
          {upload.isPending ? "Uploading…" : "Choose file"}
        </Button>
      </div>

      <div className="mb-10 space-y-3 sm:mb-12" aria-live="polite">
        {fileError && <Notice title="File not accepted">{fileError}</Notice>}
        {upload.isError && <Notice title="Upload failed">{upload.error.message}</Notice>}
      </div>

      <Section title="Uploaded manuscripts" className="mb-0">
        <QueryView query={query} rows={3}>
          {(data) =>
            data.length === 0 ? (
              <EmptyState title="No manuscripts yet">Uploaded manuscripts appear here for review.</EmptyState>
            ) : (
              <Panel>
                <ul className="divide-y divide-line">
                  {data.map((m) => (
                    <li key={m.id}>
                      <Link href={`/manuscripts/${m.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{m.filename}</span>
                          <span className="block text-[13px] text-muted">Uploaded {formatDate(m.uploaded_at)}</span>
                        </span>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${STATUS[m.status].className}`}>
                          {STATUS[m.status].label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )
          }
        </QueryView>
      </Section>
    </>
  );
}
