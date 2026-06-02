import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/dipendente/report")({ beforeLoad: () => { throw redirect({ to: "/dipendente" }); } });
