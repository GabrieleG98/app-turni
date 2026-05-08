# Timbra anche da owner/manager e calcola la differenza ore

## Problema
1. Il bottone "Timbra" non si attiva per te perché la finestra è legata a un turno schedulato (`computeWindow` → `no-shift` se non hai turno) e tu, come owner, non ti pianifichi un turno.
2. La query `timb-oggi` non filtra per `dipendente_id`: con i permessi manager (vede tutte le timbrature) `maybeSingle()` può restituire la timbratura di qualcun altro o crashare se ce n'è più di una. Bug da fixare per chiunque sia manager.
3. Una volta timbrato, le ore + differenza sono già calcolate nel Report (`/manager/report`), ma:
   - oggi il report mostra TUTTI i profili indipendentemente dal ruolo: ✅ niente da cambiare per i totali per persona.
   - manca la tua riga personale evidenziata in alto come "Le mie ore".

## Modifiche

**`src/lib/timbra-window.ts`**
- Aggiungo un parametro `freeMode?: boolean` a `computeWindow`. Quando `true` (manager/owner) e non c'è turno → stato `available` invece di `no-shift`. Se c'è un turno, le regole restano identiche (per coerenza/ritardo).

**`src/hooks/use-timbratura.ts`**
- Filtro `timb-oggi` per `dipendente_id = user.id` (fix bug manager) e includo l'id utente nella `queryKey`.
- Stesso per `pause-oggi`.
- Espongo `isManagerFreeMode` (vero se ruolo = manager) e lo passo a `computeWindow`. → manager/owner possono timbrare in qualsiasi momento; dipendenti restano vincolati.

**`src/components/timbra-fab.tsx`**
- Tooltip aggiornato per i manager senza turno: "Timbratura libera (nessun turno schedulato)".
- Il pulsante non sparisce solo dopo `completato` per il manager: rimane invisibile come oggi (regola invariata).

**`src/routes/manager.report.tsx`**
- Aggiungo in alto una card "Le mie ore" che mostra, per la settimana corrente, la riga relativa all'utente loggato: ore pianificate, effettive, straordinario, differenza con badge verde/rosso. Riusa il calcolo `righe` esistente.

## Note
- Nessuna migration: usa tabelle e RLS esistenti (`timbrature` ha già policy "Dipendente crea/aggiorna/vede proprie timbrature" che funziona per chiunque, manager incluso).
- L'export Excel del report già include tutti i profili → automaticamente avrai anche le tue ore lì.
- Niente cambi al `dipendente.index` (non era richiesto vedere la differenza giornaliera).
