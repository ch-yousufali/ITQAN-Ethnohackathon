"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CompoundDetail } from "@/components/compound-detail";
import { QueryView } from "@/components/states";
import { Botanical, PageHeader, Panel, Section } from "@/components/ui";
import { useCompound, usePlants } from "@/lib/api";

export function CompoundDetailView() {
  const { id } = useParams<{ id: string }>();
  const query = useCompound(id);
  const plants = usePlants();

  return (
    <QueryView query={query}>
      {(c) => (
        <>
          <PageHeader
            title={c.name}
            description="Structure, biological targets and scientific references for this compound."
          />

          <Panel className="mb-10 p-4 sm:mb-12 sm:p-5">
            <CompoundDetail compound={c} />
          </Panel>

          <Section title="Found in" className="mb-0">
            {c.plant_ids.length === 0 ? (
              <p className="text-sm text-warn">No source plant is on record for this compound.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {c.plant_ids.map((plantId) => {
                  const name = plants.data?.find((p) => p.id === plantId)?.botanical_name;
                  return (
                    <li key={plantId}>
                      <Link href={`/plants/${plantId}`} className="block rounded-lg border border-line bg-surface px-4 py-2.5 text-sm hover:border-leaf">
                        {name ? <Botanical>{name}</Botanical> : "Open plant record"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </>
      )}
    </QueryView>
  );
}
