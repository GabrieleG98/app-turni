# Modifiche richieste

## 1. Nome nell'header del manager
In `src/components/manager-sidebar.tsx` cambio "Schedule Timi Ama 4Fun" in **"Turni Staff 4FUN - Timi Ama"** (uguale al login).

## 2. Sessione persistente
Il client Supabase (`src/integrations/supabase/client.ts`) ha già `persistSession: true` + `autoRefreshToken: true` su `localStorage`, quindi gli utenti restano loggati anche chiudendo/riaprendo il browser o la PWA. Verifico che nessun flusso forzi logout e lascio così.

**Nota importante sulle notifiche "in tempo reale anche ad app chiusa":**  
Le notifiche realtime di Supabase funzionano solo mentre l'app è aperta (websocket attivo). Per ricevere notifiche con app **completamente chiusa** servono le **Web Push Notifications** (Service Worker + VAPID + tabella subscription + invio push da trigger DB). È un lavoro più grosso e separato — fammi sapere se vuoi che lo pianifichi a parte. Per ora la sessione resta loggata e le notifiche arrivano in tempo reale finché l'app è aperta in una scheda (anche in background).

## 3. Chiusura sidebar al click su una voce
In `src/components/manager-sidebar.tsx` uso `useSidebar()` per ottenere `setOpenMobile` e (su desktop) `setOpen`, e su click del menu chiudo la sidebar così la navigazione è più fluida.

## 4. Voce "Turni" — mostra ruolo invece del reparto
In `src/routes/manager.turni.tsx` riga 408, sostituisco `{p.reparto}` con `{p.ruolo_lavoro}` sotto al nome dipendente.

## File toccati
- `src/components/manager-sidebar.tsx` (nome + auto-close)
- `src/routes/manager.turni.tsx` (ruolo al posto del reparto)
