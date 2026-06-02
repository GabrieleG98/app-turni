import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/manager/report")({ beforeLoad: () => { throw redirect({ to: "/manager/dashboard" }); } });
