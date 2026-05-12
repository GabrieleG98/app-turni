import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/registrati")({
  beforeLoad: () => {
    throw redirect({ to: "/unisciti-4fun", replace: true });
  },
  component: () => null,
});
