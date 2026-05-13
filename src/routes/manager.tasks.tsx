import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, ListChecks, Camera, CheckCircle2 } from "lucide-react";
import { isoData, fmtData } from "@/lib/date-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/tasks")({
  component: ManagerTasks,
});

const GIORNI = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mer" },
  { v: 4, l: "Gio" }, { v: 5, l: "Ven" }, { v: 6, l: "Sab" }, { v: 7, l: "Dom" },
];

async function inviaNotifica(
  userIds: string[],
  titolo: string,
  descrizione: string,
  link?: string
) {
  if (!userIds.length) return;
  await supabase.from("notifiche").insert(
    userIds.map((uid) => ({
      user_id: uid,
      titolo,
      descrizione,
      link: link ?? null,
    }))
  );
}

function ManagerTasks() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [ricorrenza, setRicorrenza] = useState<"daily" | "weekly">("daily");
  const [giorni, setGiorni] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [assegnatoA, setAssegnatoA] = useState<string>("__all__");
  const [reparto, setReparto] = useState("");
  const [richiedeFoto, setRichiedeFoto] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["task-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_template")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dipendenti = [] } = useQuery({
    queryKey: ["dipendenti-tutti"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nome, cognome, reparto");
      return data ?? [];
    },
  });

  const oggi = isoData(new Date());
  const { data: tasksOggi = [] } = useQuery({
    queryKey: ["task-oggi-manager", oggi],
    queryFn: async () => {
      const { data } = await supabase
        .from("task_assegnati")
        .select("id, titolo, completato_at, foto_url, dipendente_id")
        .eq("data", oggi)
        .order("completato_at", { ascending: true, nullsFirst: true });
      return data ?? [];
    },
  });

  const [fotoOpen, setFotoOpen] = useState<string | null>(null);
  const [fotoSignedUrl, setFotoSignedUrl] = useState<string | null>(null);
  const apriFoto = async (path: string) => {
    setFotoOpen(path);
    const { data } = await supabase.storage.from("task-foto").createSignedUrl(path, 3600);
    setFotoSignedUrl(data?.signedUrl ?? null);
  };

  const reset = () => {
    setTitolo(""); setDescrizione(""); setRicorrenza("daily");
    setGiorni([1, 2, 3, 4, 5, 6, 7]); setAssegnatoA("__all__");
    setReparto(""); setRichiedeFoto(false);
  };

  // FIX #4: la funzione destinatari esclude SEMPRE il manager corrente,
  // indipendentemente dal fatto che assegnatoA sia "__all__" o un ID specifico.
  // Prima escludeva il manager solo nel caso "__all__".
  const destinatari = (tAssegnatoA: string | null, tReparto: string | null): string[] => {
    if (tAssegnatoA) {
      // singolo destinatario: ok solo se non è il manager stesso
      return tAssegnatoA !== user?.id ? [tAssegnatoA] : [];
    }
    let dips: any[] = dipendenti;
    if (tReparto) dips = dips.filter((d: any) => d.reparto === tReparto);
    return dips.map((d: any) => d.id).filter((id: string) => id !== user?.id);
  };

  const crea = async () => {
    if (!titolo.trim()) return toast.error("Inserisci un titolo");
    const { data: newTemplate, error } = await supabase
      .from("task_template")
      .insert({
        titolo: titolo.trim(),
        descrizione: descrizione.trim() || null,
        ricorrenza,
        giorni_settimana: giorni.length ? giorni : [1, 2, 3, 4, 5, 6, 7],
        assegnato_a: assegnatoA !== "__all__" ? assegnatoA : null,
        reparto: assegnatoA === "__all__" && reparto.trim() ? reparto.trim() : null,
        richiede_foto: richiedeFoto,
        created_by: user!.id,
      })
      .select()
      .single();
    if (error) return toast.error("Errore", { description: error.message });

    const ids = destinatari(
      assegnatoA !== "__all__" ? assegnatoA : null,
      assegnatoA === "__all__" && reparto.trim() ? reparto.trim() : null
    );
    await inviaNotifica(
      ids,
      "📋 Nuova task assegnata",
      `È stata aggiunta una nuova task: "${titolo.trim()}"`,
      "/dipendente/tasks"
    );

    toast.success("Template creato");
    setOpen(false);
    reset();
    qc.invalidateQueries({ queryKey: ["task-templates"] });
  };

  const toggleAttivo = async (id: string, attivo: boolean) => {
    await supabase.from("task_template").update({ attivo }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["task-templates"] });
  };

  const elimina = async (id: string) => {
    if (!confirm("Eliminare questo template? Verranno rimossi anche i task generati.")) return;
    const template = templates.find((t: any) => t.id === id) as any;
    const { error } = await supabase.from("task_template").delete().eq("id", id);
    if (error) return toast.error("Errore", { description: error.message });

    if (template) {
      const ids = destinatari(template.assegnato_a, template.reparto);
      await inviaNotifica(
        ids,
        "🗑️ Task rimossa",
        `La task "${template.titolo}" è stata eliminata dal manager.`,
        "/dipendente/tasks"
      );
    }

    toast.success("Template eliminato");
    qc.invalidateQueries({ queryKey: ["task-templates"] });
  };

  const nomeDip = (id: string | null) => {
    if (!id) return "Tutti";
    const d = dipendenti.find((x: any) => x.id === id);
    return d ? `${(d as any).nome} ${(d as any).cognome}` : "—";
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" /> Tasks & checklist
          </h1>
          <p className="text-sm text-muted-foreground">
            I template generano automaticamente i task quotidiani per i dipendenti.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuovo template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuovo template di task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titolo</Label>
                <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Pulizia bancone" />
              </div>
              <div>
                <Label>Descrizione (opzionale)</Label>
                <Textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Ricorrenza</Label>
                <Select value={ricorrenza} onValueChange={(v) => setRicorrenza(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Giornaliero</SelectItem>
                    <SelectItem value="weekly">Settimanale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Giorni della settimana</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {GIORNI.map((g) => {
                    const on = giorni.includes(g.v);
                    return (
                      <button key={g.v} type="button"
                        onClick={() => setGiorni((prev) => (on ? prev.filter((x) => x !== g.v) : [...prev, g.v].sort()))}
                        className={`px-2.5 py-1 text-xs rounded-md border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                      >{g.l}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Assegna a</Label>
                <Select value={assegnatoA} onValueChange={setAssegnatoA}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tutti i dipendenti</SelectItem>
                    {dipendenti.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.nome} {d.cognome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {assegnatoA === "__all__" && (
                <div>
                  <Label>Reparto (opzionale)</Label>
                  <Input value={reparto} onChange={(e) => setReparto(e.target.value)} placeholder="Limita ad un reparto specifico" />
                </div>
              )}
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="cursor-pointer">Richiede foto a fine task</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Il dipendente dovrà allegare una foto per chiudere il task.</p>
                </div>
                <Switch checked={richiedeFoto} onCheckedChange={setRichiedeFoto} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button onClick={crea}>Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task di oggi */}
      <Card className="p-4 border-0 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Task di oggi · <span className="capitalize text-muted-foreground font-normal">{fmtData(new Date(), "EEEE d MMMM")}</span></h2>
          <span className="text-xs text-muted-foreground">
            {tasksOggi.filter((t: any) => t.completato_at).length}/{tasksOggi.length} completati
          </span>
        </div>
        {tasksOggi.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nessun task assegnato oggi.</p>
        ) : (
          <ul className="divide-y">
            {tasksOggi.map((t: any) => {
              const dip = dipendenti.find((d: any) => d.id === t.dipendente_id);
              const done = !!t.completato_at;
              return (
                <li key={t.id} className="py-2 flex items-center gap-3 text-sm">
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    : <div className="h-4 w-4 rounded-full border border-muted-foreground/40 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className={done ? "line-through text-muted-foreground" : ""}>{t.titolo}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {dip ? `${(dip as any).nome} ${(dip as any).cognome}` : "—"}
                      {done && ` · ${new Date(t.completato_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                  </div>
                  {t.foto_url && (
                    <Button variant="ghost" size="sm" onClick={() => apriFoto(t.foto_url)}>
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Dialog open={!!fotoOpen} onOpenChange={(o) => { if (!o) { setFotoOpen(null); setFotoSignedUrl(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Foto del task</DialogTitle></DialogHeader>
          {fotoSignedUrl
            ? <img src={fotoSignedUrl} alt="Foto task" className="w-full rounded-lg" />
            : <p className="text-sm text-muted-foreground text-center py-8">Caricamento…</p>}
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {templates.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nessun template. Creane uno per iniziare.
          </Card>
        )}
        {templates.map((t: any) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.titolo}</span>
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted">{t.ricorrenza}</span>
                </div>
                {t.descrizione && <p className="text-sm text-muted-foreground mt-1">{t.descrizione}</p>}
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                  <span>👤 {nomeDip(t.assegnato_a)}</span>
                  {t.reparto && <span>· 🏷️ {t.reparto}</span>}
                  <span>· 📅 {t.giorni_settimana.map((g: number) => GIORNI.find((x) => x.v === g)?.l).join(", ")}</span>
                  {t.richiede_foto && <span>· 📸 foto richiesta</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={t.attivo} onCheckedChange={(v) => toggleAttivo(t.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => elimina(t.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
