import { Sprout } from "lucide-react";
import Link from "next/link";

/** The same logo on every page. It always leads back to the landing page. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display whitespace-nowrap text-parchment sm:gap-2.5 sm:text-lg">
      <Sprout className="size-5 text-citron" strokeWidth={1.25} aria-hidden />
      EthnoSynergy AI
    </Link>
  );
}
