import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/task-reminder")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey") || request.headers.get("authorization")?.replace("Bearer ", "");
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Missing apikey" }), { status: 401 });
        }
        const supabase = createClient(
          process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        const oggi = new Date().toISOString().slice(0, 10);

        // Aggrega task aperti per dipendente
        const { data: aperti, error } = await supabase
          .from("task_assegnati")
          .select("dipendente_id")
          .eq("data", oggi)
          .is("completato_at", null);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const counts = new Map<string, number>();
        for (const r of aperti ?? []) {
          counts.set(r.dipendente_id, (counts.get(r.dipendente_id) ?? 0) + 1);
        }

        if (counts.size === 0) {
          return Response.json({ ok: true, sent: 0 });
        }

        const rows = Array.from(counts.entries()).map(([user_id, n]) => ({
          user_id,
          tipo: "task" as const,
          titolo: "Hai task da completare",
          descrizione: `Sono rimasti ${n} task aperti per oggi.`,
          link: "/dipendente/tasks",
        }));

        const { error: insErr } = await supabase.from("notifiche").insert(rows);
        if (insErr) {
          return new Response(JSON.stringify({ error: insErr.message }), { status: 500 });
        }
        return Response.json({ ok: true, sent: rows.length });
      },
    },
  },
});
