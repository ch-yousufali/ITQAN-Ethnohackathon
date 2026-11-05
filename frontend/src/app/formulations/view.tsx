"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, tableKit, type Columns } from "@/components/data-table";
import { EmptyState, QueryView } from "@/components/states";
import { Select } from "@/components/select";
import { Botanical, ButtonLink, Input, PageHeader, formatDate } from "@/components/ui";
import { useFormulations } from "@/lib/api";
import type { Formulation } from "@/lib/api/schemas";

const col = createColumnHelper<typeof tableKit, Formulation>();

const columns: Columns<Formulation> = [
  col.accessor("name", {
    header: "Formulation",
    sortFn: "text",
    cell: (c) => (
      <Link href={`/formulations/${c.row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-leaf">
        {c.getValue()}
      </Link>
    ),
  }),
  col.accessor("tradition", { header: "Tradition", sortFn: "text" }),
  col.accessor("period", { header: "Period", sortFn: "text" }),
  col.display({
    id: "ingredients",
    header: "Ingredients",
    cell: (c) => {
      const named = c.row.original.ingredients.flatMap((i) => (i.botanical_name ? [i.botanical_name] : []));
      const unidentified = c.row.original.ingredients.length - named.length;
      return (
        <span className="text-body">
          {named.map((n, i) => (
            <span key={n}>
              {i > 0 && ", "}
              <Botanical>{n}</Botanical>
            </span>
          ))}
          {unidentified > 0 && (
            <span className="text-warn">
              {named.length > 0 && ", "}
              {unidentified} unidentified
            </span>
          )}
        </span>
      );
    },
  }),
  col.accessor("updated_at", { header: "Updated", sortFn: "datetime", cell: (c) => <span className="whitespace-nowrap text-body">{formatDate(c.getValue())}</span> }),
];

export function FormulationsView() {
  const router = useRouter();
  const query = useFormulations();
  const [search, setSearch] = useState("");
  const [tradition, setTradition] = useState("");
  const [period, setPeriod] = useState("");

  const all = query.data;
  const traditions = useMemo(() => [...new Set(all?.map((f) => f.tradition))].sort(), [all]);
  const periods = useMemo(() => [...new Set(all?.map((f) => f.period))].sort(), [all]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (all ?? []).filter(
      (f) =>
        (!tradition || f.tradition === tradition) &&
        (!period || f.period === period) &&
        (!q ||
          f.name.toLowerCase().includes(q) ||
          f.ingredients.some(
            (i) => i.traditional_name.toLowerCase().includes(q) || i.botanical_name?.toLowerCase().includes(q),
          )),
    );
  }, [all, search, tradition, period]);

  return (
    <>
      <PageHeader
        title="Formulations"
        description="Browse traditional polyherbal formulations and their identified ingredients."
        actions={
          <ButtonLink href="/formulations/new">
            <Plus className="size-4" aria-hidden />
            New formulation
          </ButtonLink>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ingredient"
            aria-label="Search formulations"
            className="pl-9"
          />
        </div>
        <Select
          value={tradition}
          onChange={setTradition}
          aria-label="Filter by tradition"
          className="sm:w-52"
          options={[{ value: "", label: "All traditions" }, ...traditions.map((t) => ({ value: t, label: t }))]}
        />
        <Select
          value={period}
          onChange={setPeriod}
          aria-label="Filter by historical period"
          className="sm:w-52"
          options={[{ value: "", label: "All periods" }, ...periods.map((p) => ({ value: p, label: p }))]}
        />
      </div>

      <QueryView query={query}>
        {(data) =>
          data.length === 0 ? (
            <EmptyState
              title="No formulations yet"
              action={<ButtonLink href="/manuscripts">Upload a manuscript</ButtonLink>}
            >
              Create one from an uploaded manuscript, or add it by hand.
            </EmptyState>
          ) : rows.length === 0 ? (
            <EmptyState title="No matching formulations">Try a different search or clear the filters.</EmptyState>
          ) : (
            <DataTable
              caption="Traditional formulations"
              columns={columns}
              data={rows}
              hideOnMobile={["tradition", "period", "updated_at"]}
              onRowClick={(f) => router.push(`/formulations/${f.id}`)}
            />
          )
        }
      </QueryView>
    </>
  );
}
