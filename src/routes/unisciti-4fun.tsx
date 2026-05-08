import { createFileRoute } from "@tanstack/react-router";
import { Route as RegistratiRoute } from "./registrati";

export const Route = createFileRoute("/unisciti-4fun")({
  component: RegistratiRoute.options.component!,
});
