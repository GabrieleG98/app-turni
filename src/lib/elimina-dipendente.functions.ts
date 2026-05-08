import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const eliminaDipendente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const targetId = data.user_id;

    if (targetId === userId) {
      throw new Error("Non puoi eliminare te stesso.");
    }

    // Caller must be manager
    const { data: rolesCaller } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isManager = (rolesCaller ?? []).some((r) => r.role === "manager");
    if (!isManager) throw new Error("Solo i manager possono eliminare i membri.");

    // Owner check: cannot delete owner unless caller is owner (and owner can't delete self handled above)
    const { data: ownerRow } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "manager")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const ownerId = ownerRow?.user_id ?? null;
    if (targetId === ownerId) {
      throw new Error("Non puoi eliminare il proprietario dell'app.");
    }

    // Cascade cleanup with service role
    await supabaseAdmin.from("chat_messaggi").delete().eq("autore_id", targetId);
    await supabaseAdmin.from("chat_membri").delete().eq("user_id", targetId);
    await supabaseAdmin.from("notifiche").delete().eq("user_id", targetId);
    await supabaseAdmin.from("pause").delete().eq("dipendente_id", targetId);
    await supabaseAdmin.from("timbrature_correzioni").delete().eq("dipendente_id", targetId);
    await supabaseAdmin.from("timbrature").delete().eq("dipendente_id", targetId);
    await supabaseAdmin
      .from("turno_swap_requests")
      .delete()
      .or(`da_dipendente.eq.${targetId},a_dipendente.eq.${targetId}`);
    await supabaseAdmin.from("turni").delete().eq("dipendente_id", targetId);
    await supabaseAdmin.from("disponibilita").delete().eq("dipendente_id", targetId);
    await supabaseAdmin.from("task_assegnati").delete().eq("dipendente_id", targetId);
    await supabaseAdmin.from("task_template").delete().eq("assegnato_a", targetId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", targetId);
    await supabaseAdmin.from("profiles").delete().eq("id", targetId);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
    if (delErr) {
      console.error("[elimina-dipendente] auth.admin.deleteUser failed:", delErr);
      throw new Error(`Errore eliminando l'account: ${delErr.message}`);
    }

    return { ok: true };
  });
