# Sincronizza "Aggiungi evento" con la legenda categorie

Attualmente il dialog `EventoDialog` usa una lista hardcoded (`CATEGORIA_LABEL`) per il select Categoria. Le modifiche fatte in "Legenda categorie" (tabella `evento_categorie`) non si riflettono.

## Modifiche

**`src/components/evento-dialog.tsx`**
- Rimuovo l'uso hardcoded di `CATEGORIA_LABEL` / `CATEGORIA_COLORE` per il dropdown.
- Aggiungo `useQuery(["evento-categorie"])` che legge da `supabase.from("evento_categorie").select("*").order("ordine")` (stessa queryKey usata in `calendario.tsx` → si sincronizza automaticamente quando l'owner aggiunge/elimina/cambia colore una categoria).
- Il select mostra le categorie dinamiche con relativo colore.
- Lo state del form usa `categoria_id` (uuid, colonna già presente in `eventi_speciali`) + `colore` (preso dalla categoria scelta).
- Al salvataggio scrivo `categoria_id` e `colore`. Mantengo il campo legacy `categoria` impostato a `'altro'` per compatibilità con la colonna NOT NULL esistente.
- All'apertura in modifica: pre-seleziono la categoria via `categoria_id` se presente, altrimenti fallback sul colore.
- Se non esistono categorie, mostro un messaggio "Nessuna categoria — chiedi al proprietario di crearne una nella Legenda".

**`src/routes/calendario.tsx`** (piccolo)
- Quando si crea/elimina/aggiorna una categoria nella `CategorieLegenda`, invalido anche `["eventi-speciali"]` per refrescare i pallini colorati nel calendario.

## Note
- Solo cambi frontend, nessuna migration: `evento_categorie` e `eventi_speciali.categoria_id` esistono già.
- L'enum legacy `categoria` resta com'è (default `altro`) per non rompere righe esistenti.
