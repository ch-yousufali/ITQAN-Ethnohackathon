"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, QueryView } from "@/components/states";
import { Botanical, Input, PageHeader } from "@/components/ui";
import { usePlants } from "@/lib/api";

export function PlantsView() {
  const query = usePlants();
  const [search, setSearch] = useState("");
  const all = query.data;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all ?? [];
    return (all ?? []).filter((p) =>
      [p.botanical_name, p.family ?? "", ...p.common_names, ...p.traditional_names, ...p.compounds.map((c) => c.name)]
        .some((text) => text.toLowerCase().includes(q)),
    );
  }, [all, search]);

  return (
    <>
      <PageHeader
        title="Plant & phytochemical explorer"
        description="Botanical records, associated compounds, biological targets and their scientific references."
      />
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted" aria-hidden />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plants, names or compounds"
          aria-label="Search plants"
          className="pl-9"
        />
      </div>

      <QueryView query={query}>
        {(data) =>
          data.length === 0 ? (
            <EmptyState title="No plants on record">Plants appear here once they are available from the research database.</EmptyState>
          ) : rows.length === 0 ? (
            <EmptyState title="No matching plants">Try a botanical, common or traditional name.</EmptyState>
          ) : (
            <ul className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((p) => (
                <li key={p.id} className="bg-surface">
                  <Link href={`/plants/${p.id}`} className="block h-full p-5 hover:bg-paper">
                    <Botanical className="text-lg text-ink">{p.botanical_name}</Botanical>
                    <p className="mt-0.5 text-[13px] text-muted">{p.family ?? "Family not recorded"}</p>
                    <p className="mt-3 text-sm text-body">{p.common_names.join(", ") || "No common name recorded"}</p>
                    <p className={`mt-3 text-[13px] tabular-nums ${p.compounds.length ? "text-muted" : "text-warn"}`}>
                      {p.compounds.length
                        ? `${p.compounds.length} compound${p.compounds.length === 1 ? "" : "s"} on record`
                        : "No compound data available"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )
        }
      </QueryView>
    </>
  );
}
