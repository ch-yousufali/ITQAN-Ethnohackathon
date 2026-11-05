import type { Metadata } from "next";
import { ManuscriptReviewView } from "./view";

export const metadata: Metadata = { title: "Manuscript review" };

export default function Page() {
  return <ManuscriptReviewView />;
}
