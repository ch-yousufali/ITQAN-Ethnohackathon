import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-body">This page does not exist or has moved.</p>
      <ButtonLink href="/" variant="secondary" className="mt-5">Back to overview</ButtonLink>
    </div>
  );
}
