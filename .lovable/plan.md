## Modifiche richieste

### 1. Voce "Correzione timbratura" nei menu

Esiste già `CorrezioneDialog`, ma non c'è un punto d'accesso dedicato dal menu. Aggiungerò:

- **Sidebar dipendente** (`src/components/dipendente-sidebar.tsx`): nuova voce "Correzioni" con icona `FileWarning` che apre una pagina dedicata.
- **Sidebar manager** (`src/components/manager-sidebar.tsx`): la voce "Correzioni" punta già a `/manager/correzioni` — verificherò sia ben in evidenza.
- **Nuova pagina** `src/routes/dipendente.correzioni.tsx`: lista delle proprie richieste (pending / approvate / rifiutate) con bottone "Nuova richiesta" che apre `CorrezioneDialog`. Mostra status e note del manager.

### 2. "Timbra per" sempre disponibile per ogni clock-in/out

Stato attuale: `manager.timbra-per.tsx` è ristretto a `isOwner` e mostra una sola riga per dipendente al giorno.

Modifiche:
- **Accesso**: aprire la pagina a tutti i manager (non solo owner) → cambiare il guard da `isOwner` a `has_role manager`.
- **Voce sidebar**: assicurarsi che sia visibile nella sidebar manager con icona chiara.
- **Multi-sessione**: rimuovere `timbOf()` che prende solo la prima timbratura. Per ogni dipendente mostrare:
  - tutte le sessioni di oggi (lista o conteggio + ultima)
  - bottone "Clock-in" sempre disponibile (anche se ce ne sono già state, per gestire multi-sessione)
  - bottone "Clock-out" sulla sessione attualmente aperta
- **Manager nella lista**: includere anche i profili manager nell'elenco, così ognuno (inclusi i manager) può essere timbrato in qualsiasi momento.

### 3. Foto obbligatoria per ogni clock-in/out

Stato attuale: la foto è opzionale (il file picker si apre ma se l'utente annulla la timbratura va comunque a buon fine senza foto).

Modifiche:
- **Hook `use-timbratura.ts`**: in `clockIn` / `clockOut`, se `file` è `null` → mostrare errore e abortire ("Foto richiesta per timbrare").
- **`TimbraFAB`**: nel handler `onFile`, se l'utente chiude il picker senza selezionare nulla, non chiamare clock-in/out e mostrare un toast "Scatta una foto per timbrare".
- **`manager.timbra-per`**: aggiungere selettore foto obbligatorio per riga (input `capture="environment"`) prima di permettere clock-in/out manuale; foto salvata in `timbrature-foto/<dipendente_id>/...` riutilizzando `uploadSelfie`.
- **UI feedback**: il dialog di conferma `TimbraConfermaDialog` già supporta `fotoUrl`, mostriamo sempre la miniatura della foto appena scattata.

### Aspetti tecnici

- `timbrature-foto` bucket esiste già (privato). Le RLS attuali permettono al dipendente di caricare nella propria cartella. Per la pagina "Timbra per" il manager carica nella cartella del dipendente target → serve aggiornare la policy storage del bucket per consentire `INSERT` ai manager su qualsiasi path. Migrazione dedicata.
- Nessuna nuova tabella richiesta. La tabella `timbrature_correzioni` esiste già con RLS adeguate.
- Nessuna modifica al trigger `restrict_dipendente_timbrature_update` (continua a impedire modifiche manuali).

### File toccati

- `src/components/dipendente-sidebar.tsx` — nuova voce
- `src/components/manager-sidebar.tsx` — verifica voce "Timbra per" / "Correzioni"
- `src/routes/dipendente.correzioni.tsx` — nuova pagina
- `src/hooks/use-timbratura.ts` — foto obbligatoria
- `src/components/timbra-fab.tsx` — gestione cancellazione picker
- `src/routes/manager.timbra-per.tsx` — accesso a tutti i manager, multi-sessione, foto obbligatoria, include manager nella lista
- Migrazione SQL: policy storage `timbrature-foto` per consentire INSERT ai manager su qualsiasi cartella
