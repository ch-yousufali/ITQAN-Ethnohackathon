import type { Metadata } from "next";
import { FindingsView } from "./view";

export const metadata: Metadata = { title: "Molecular findings" };

export default function Page() {
  return <FindingsView />;
}
