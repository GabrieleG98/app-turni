## Risposta sulla chat
Stato attuale dei canali:
- **#Generale** — tutti (manager e dipendenti) leggono e scrivono liberamente.
- **#Annunci** — tutti leggono, ma solo i manager possono scrivere (è pensato per comunicazioni ufficiali).

Se vuoi che **anche su Annunci** scrivano tutti dimmelo e tolgo la restrizione. Altrimenti lascio com'è: è il comportamento standard di una bacheca aziendale.

## Proteggere te (proprietario) dalle retrocessioni

### Obiettivo
Tu, primo utente registrato (Gabriele Genna), devi risultare **intoccabile**: nessun altro manager può retrocederti, cambiarti ruolo, né eliminare il tuo profilo. Tu invece mantieni il pieno controllo su tutti gli altri.

### Identificazione del proprietario
Il proprietario è il manager più "vecchio" — l'utente con il record `user_roles` di ruolo `manager` con `created_at` minimo. Con la funzione SECURITY DEFINER `is_owner(uid)` evitiamo qualunque rischio di ricorsione RLS.

```sql
create or replace function public.is_owner(_uid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select _uid = (
    select user_id from public.user_roles
    where role = 'manager'
    order by created_at asc limit 1
  );
$$;
```

### Modifiche

**1. `set_user_role` — blocco operazioni sul proprietario**
Aggiorno la funzione esistente: se `_user_id` è il proprietario e il chiamante NON è il proprietario, solleva eccezione "Non puoi modificare il ruolo del proprietario dell'app".

**2. RLS su `user_roles`**
Sostituisco la policy "Manager gestisce ruoli" (oggi un ALL aperto a tutti i manager) con due policy mirate:
- INSERT/UPDATE/DELETE consentito ai manager **solo se la riga target non appartiene al proprietario**, oppure se il chiamante stesso è il proprietario.
- SELECT invariato.

Questo chiude anche la strada a un manager che provasse a eliminare direttamente la riga `user_roles` del proprietario bypassando l'RPC.

**3. RLS su `profiles`**
Le policy "Manager modifica profili" e "Manager elimina profili" diventano:
- Update/Delete permessi ai manager **a meno che** il target sia il proprietario, salvo che il chiamante sia il proprietario stesso.
Così nessuno può cancellare/modificare il tuo profilo all'insaputa.

**4. UI — `src/routes/manager.dipendenti.index.tsx`**
- Carico l'id del proprietario (una query: prima riga `user_roles` manager per `created_at`).
- Sulla riga del proprietario:
  - badge **"Proprietario"** (oltre a "Manager") con stile distintivo.
  - pulsante "Retrocedi" **disabilitato** per chiunque non sia il proprietario, con tooltip "Solo il proprietario può modificare il proprio ruolo".
- Mantengo invariata la regola: il proprietario non può retrocedere sé stesso (già prevista).

### Cosa NON cambia
- Flusso di registrazione: il primo utente continua a diventare manager automaticamente (= proprietario).
- Permessi operativi degli altri manager su turni, timbrature, task, chat, scambi, report: invariati.
- Nessun nuovo campo nel database: il proprietario è dedotto dinamicamente, niente flag manuali da gestire.

### File toccati
- nuova migration: funzione `is_owner`, aggiornamento `set_user_role`, nuove policy RLS su `user_roles` e `profiles`.
- `src/routes/manager.dipendenti.index.tsx`: badge e disabilitazione pulsante.
