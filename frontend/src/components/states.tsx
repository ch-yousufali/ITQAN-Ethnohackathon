"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api/http";
import { Button } from "./ui";

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3 py-2">
      <div className="h-7 w-1/3 animate-pulse rounded-md bg-subtle" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-md bg-subtle" />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const notFound = error instanceof ApiError && error.status === 404;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div role="alert" className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <AlertCircle className="mx-auto size-6 text-danger" aria-hidden />
      <h2 className="mt-3 text-base font-semibold">{title ?? (notFound ? "Not found" : "Could not load this")}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-body">{message}</p>
      {onRetry && !notFound && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-body">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Renders the loading and error states of a query, then its data. */
export function QueryView<T>({
  query,
  rows,
  children,
}: {
  query: UseQueryResult<T>;
  rows?: number;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <LoadingState rows={rows} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <>{children(query.data)}</>;
}
