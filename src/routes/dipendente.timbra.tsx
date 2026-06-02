import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/dipendente/timbra")({ beforeLoad: () => { throw redirect({ to: "/dipendente" }); } });
