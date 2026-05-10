import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fmtData,
  fmtOre,
  fmtSettimana,
  giorniSettimana,
  inizioSettimana,
  isoData,
  oreTimbratura,
  GIORNI,
} from "@/lib/date-utils";
import { addDays, addWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, ArrowLeft, Save, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useServerFn } from "@tanstack/react-start";
import { eliminaDipendente } from "@/lib/elimina-dipendente.functions";
import { FotoTimbratura } from "@/components/foto-timbratura";

export const Route = createFileRoute("/manager/dipendenti/$id")({
  component: DettaglioDipendente,
});

function DettaglioDipendente() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [inizio, setInizio] = useState(inizioSettimana());
  const fine = addDays(inizio, 6);
  const [me, setMe] = useState<string | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const eliminaFn = useServerFn(eliminaDipendente);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const { data: ruoli = [] } = useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });
  const ownerId = ruoli.find((r) => r.role === "manager")?.user_id ?? null;
  const iAmOwner = me !== null && me === ownerId;

  const { data: profilo } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const [ruoloLavoro, setRuoloLavoro] = useState("");
  const [reparto, setReparto] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profilo && savedKey !== profilo.id) {
      setRuoloLavoro(profilo.ruolo_lavoro ?? "");
      setReparto(profilo.reparto ?? "");
      setSavedKey(profilo.id);
    }
  }, [profilo, savedKey]);

  const salvaDatiLavoro = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ruolo_lavoro: ruoloLavoro.trim(), reparto: reparto.trim() })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Errore salvataggio", { description: error.message });
    } else {
      toast.success("Dati lavorativi aggiornati");
      qc.invalidateQueries({ queryKey: ["profile", id] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    }
  };

  const { data: turni = [] } = useQuery({
    queryKey: ["turni-dip", id, isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("turni").select("*")
        .eq("dipendente_id", id)
        .gte("data", isoData(inizio)).lte("data", isoData(fine))
        .order("data");
      return data ?? [];
    },
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timb-dip", id, isoData(inizio)],
    queryFn: async () => {
      const { data } = await supabase
        .from("timbrature").select("*")
        .eq("dipendente_id", id)
        .gte("data", isoData(inizio)).lte("data", isoData(fine));
      return data ?? [];
    },
  });

  const oreEffettive = timbrature.reduce(
    (s, t) => s + (oreTimbratura(t.orario_clock_in, t.orario_clock_out) ?? 0),
    0,
  );

  const giorni = giorniSettimana(inizio);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/manager/dipendenti" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Torna alla lista
      </Link>

      {profilo && (
        <Card className="p-6">
          <h1 className="text-2xl font-bold">{profilo.nome} {profilo.cognome}</h1>
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span>Ruolo: <span className="text-foreground">{profilo.ruolo_lavoro || "—"}</span></span>
            <span>Reparto: <span className="text-foreground">{profilo.reparto || "—"}</span></span>
          </div>
        </Card>
      )}

      {iAmOwner && profilo && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Modifica dati lavorativi</h2>
            <p className="text-xs text-muted-foreground">Solo il proprietario può modificare ruolo e reparto di tutti i membri.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rl">Ruolo lavoro</Label>
              <Input id="rl" value={ruoloLavoro} onChange={(e) => setRuoloLavoro(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp">Reparto</Label>
              <Input id="rp" value={reparto} onChange={(e) => setReparto(e.target.value)} maxLength={80} />
            </div>
          </div>
          <Button onClick={salvaDatiLavoro} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salva
          </Button>
        </Card>
      )}

      <Card className="p-4 flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium min-w-[220px] text-center">{fmtSettimana(inizio)}</div>
        <Button variant="outline" size="icon" onClick={() => setInizio(addWeeks(inizio, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-auto text-sm">
          Ore lavorate: <span className="font-bold">{fmtOre(oreEffettive)}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {giorni.map((g, i) => {
          const t = turni.find((x) => x.data === isoData(g));
          return (
            <Card key={i} className="p-3">
              <div className="text-xs text-muted-foreground">{GIORNI[i]}</div>
              <div className="text-sm font-medium mb-2">{fmtData(g, "dd/MM")}</div>
              {t ? (
                <div className={`rounded-md p-2 text-xs ${
                  t.tipo_turno === "mattina" ? "bg-turno-mattina text-turno-mattina-foreground"
                  : t.tipo_turno === "pomeriggio" ? "bg-turno-pomeriggio text-turno-pomeriggio-foreground"
                  : "bg-turno-sera text-turno-sera-foreground"
                }`}>
                  <div className="font-semibold capitalize">{t.tipo_turno}</div>
                  <div>{t.ora_inizio.slice(0, 5)}–{t.ora_fine.slice(0, 5)}</div>
                  {t.location && <div className="opacity-80">{t.location}</div>}
                </div>
              ) : (
                <div className="rounded-md p-2 text-xs bg-turno-libero text-turno-libero-foreground text-center">
                  Libero
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
  <h2 className="font-semibold mb-3">Timbrature</h2>
  {timbrature.length === 0 ? (
    <p className="text-sm text-muted-foreground">Nessuna timbratura</p>
  ) : (
    <div className="space-y-2 text-sm">
      {timbrature.map((t) => {
        const ore = oreTimbratura(t.orario_clock_in, t.orario_clock_out);
        return (
          <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0 gap-2">
            {/* Data */}
            <span className="shrink-0 w-24">{fmtData(t.data)}</span>

            {/* Foto entrata + orari + Foto uscita */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <FotoTimbratura
                url={t.foto_in_url ?? null}
                timbratura_id={t.id}
                campo="foto_in_url"
                onDeleted={() => qc.invalidateQueries({ queryKey: ["timb-dip", id, isoData(inizio)] })}
              />
              <span className="text-muted-foreground tabular-nums">
                {new Date(t.orario_clock_in).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                {" → "}
                {t.orario_clock_out
                  ? new Date(t.orario_clock_out).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
                  : <em>in corso</em>}
              </span>
              <FotoTimbratura
                url={t.foto_out_url ?? null}
                timbratura_id={t.id}
                campo="foto_out_url"
                onDeleted={() => qc.invalidateQueries({ queryKey: ["timb-dip", id, isoData(inizio)] })}
              />
            </div>

            {/* Ore */}
            <span className="font-medium shrink-0 w-12 text-right">
              {ore !== null ? fmtOre(ore) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  )}
</Card>

      {profilo && me !== id && ownerId !== id && (
        <Card className="p-6 border-destructive/40">
          <h2 className="font-semibold text-destructive">Zona pericolo</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Rimuovi {profilo.nome} {profilo.cognome} dal team. L'account e tutti i suoi dati
            (turni, timbrature, pause, task, disponibilità, scambi, correzioni, messaggi e
            notifiche) verranno eliminati definitivamente.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => { setDelConfirm(""); setDelOpen(true); }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Elimina dal team
          </Button>
        </Card>
      )}

      <AlertDialog open={delOpen} onOpenChange={(o) => !o && !deleting && setDelOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminare {profilo?.nome} {profilo?.cognome}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Azione irreversibile. Tutti i dati associati verranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="conf-del">
              Per confermare, digita{" "}
              <span className="font-mono font-semibold">
                {profilo?.nome} {profilo?.cognome}
              </span>
            </Label>
            <Input
              id="conf-del"
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                deleting ||
                delConfirm.trim() !== `${profilo?.nome ?? ""} ${profilo?.cognome ?? ""}`.trim()
              }
              onClick={async (e) => {
                e.preventDefault();
                setDeleting(true);
                try {
                  await eliminaFn({ data: { user_id: id } });
                  toast.success("Dipendente eliminato");
                  qc.invalidateQueries({ queryKey: ["profiles"] });
                  qc.invalidateQueries({ queryKey: ["user_roles"] });
                  navigate({ to: "/manager/dipendenti" });
                } catch (err) {
                  toast.error("Eliminazione fallita", {
                    description: err instanceof Error ? err.message : String(err),
                  });
                  setDeleting(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
