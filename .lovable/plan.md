
# Piano: rebranding "Schedule Timi Ama 4Fun" + palette blu scuro elegante

## 1. Nuovo nome ovunque appaia "Turni Resort"

Sostituzione di tutte le occorrenze del nome con **"Schedule Timi Ama 4Fun"** (form lungo) e una variante corta **"Timi Ama"** dove serve compattezza.

File interessati:
- `src/routes/__root.tsx` — `<title>`, meta description, `apple-mobile-web-app-title`
- `src/components/manager-sidebar.tsx` — header sidebar
- `public/manifest.webmanifest` — `name`, `short_name`, `description`, `theme_color`
- `index.html` (se presente un title statico) — verifica
- Eventuali stringhe nei route pubblici (login, registrati, header dipendente)

## 2. Nuova palette: blu scuro elegante

Sostituisco l'attuale verde Homebase con un blu navy elegante in `src/styles.css`.

Nuovi token (light mode):
- `--primary` / `--brand`: blu navy profondo (`oklch(0.32 0.09 255)`) — colore principale (header dipendente, sidebar attiva, CTA)
- `--brand-foreground`: bianco
- `--brand-soft`: azzurro pallido (`oklch(0.95 0.03 250)`) — sfondi card brand
- `--accent`: oro caldo opaco (`oklch(0.78 0.12 80)`) — tocchi premium su badge/highlight
- `--ring`: stesso blu navy
- Gradiente `bg-brand-gradient`: da blu navy a blu reale leggermente più chiaro per dare profondità

Token turni rivisti per leggibilità sul nuovo brand:
- Mattina: rimane giallo soft (contrasto col navy)
- Pomeriggio: arancio caldo (richiama l'accent oro)
- Sera: blu più chiaro del brand (così non si confonde col navy primario)
- Libero: grigio chiaro neutro

Dark mode: navy ancora più profondo come sfondo, brand schiarito per contrasto.

Aggiorno anche:
- `theme-color` meta tag in `__root.tsx` → `#1e2a44` (corrisponde al navy)
- `theme_color` nel manifest PWA → stesso valore
- Icona PWA (`public/icon-512.png`): rigenero in blu navy con simbolo bianco coerente

## 3. Tipografia

La pairing attuale Sora + Manrope resta — funziona benissimo anche in chiave "elegante". Se preferisci un look più editoriale (es. serif display tipo "Instrument Serif" + Inter), dimmelo nel prossimo giro: in questo piano la lascio invariata per non snaturare la leggibilità.

## 4. Cosa NON cambia

- Struttura route, layout dipendente con bottom-nav, sidebar manager
- Funzionalità: turni, timbrature, RLS, ruoli
- Tipografia (Sora/Manrope)

## 5. Verifica

Dopo le modifiche controllo che:
- Header verde gradiente → diventa navy gradiente in tutte le tab dipendente
- Sidebar manager attiva → blu navy
- Bottoni primari (Inizio turno, Salva, Nuovo turno) → blu navy
- Toast/anelli focus → blu navy
- Manifest e theme-color allineati al nuovo blu

Procedo?
