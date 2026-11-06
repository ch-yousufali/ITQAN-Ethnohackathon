import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-display text-[clamp(40px,5vw,72px)] leading-[1.05]">Page not found</h1>
      <p className="mt-2 text-sm text-body">This page does not exist or has moved.</p>
      <ButtonLink href="/dashboard" variant="secondary" className="mt-5">Back to dashboard</ButtonLink>
    </div>
  );
}
