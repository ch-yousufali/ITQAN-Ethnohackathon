import type { Metadata } from "next";
import { ManuscriptsView } from "./view";

export const metadata: Metadata = { title: "Manuscripts" };

export default function Page() {
  return <ManuscriptsView />;
}
