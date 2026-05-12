# 🏨 App Turni — Staff 4FUN Timi Ama

Applicazione web per la gestione dei turni del personale, timbrature, scambi turno ed eventi speciali.

## ✨ Funzionalità principali

### Area Manager
- **Dashboard** con panoramica giornaliera e notifiche
- **Gestione turni** settimanale con pubblicazione
- **Calendario eventi** mensile con categorie personalizzabili
- **Scambi turno** — approvazione/rifiuto richieste con notifica automatica
- **Dipendenti** — gestione profili e ruoli
- **Timbratura per conto di** un dipendente
- **Tasks** — assegnazione compiti al personale
- **Report** presenze e ore lavorate
- **Chat** interna
- **Export PowerPoint** del turno settimanale

### Area Dipendente
- **Dashboard** con turno del giorno e stato timbratura
- **I miei turni** con richiesta scambio turno
- **Calendario** condiviso con eventi
- **Timbratura** con foto, gestione pause
- **Tasks** assegnati
- **Chat** interna
- **Profilo** personale

---

## 🛠 Stack tecnico

| Tecnologia | Utilizzo |
|---|---|
| [TanStack Start](https://tanstack.com/start) | Framework React SSR |
| [Supabase](https://supabase.com) | Database, Auth, Storage, Realtime |
| [shadcn/ui](https://ui.shadcn.com) | Componenti UI |
| [TanStack Query](https://tanstack.com/query) | Data fetching e cache |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [date-fns](https://date-fns.org) | Gestione date |

---

## 🚀 Setup locale

```bash
# Installa dipendenze
npm install

# Avvia in sviluppo
npm run dev
```

Crea un file `.env` nella root con:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=la_tua_chiave
```

---

## 👥 Ruoli utente

| Ruolo | Permessi |
|---|---|
| `owner` | Accesso completo, gestione categorie, impostazioni |
| `manager` | Gestione turni, dipendenti, scambi, report |
| `dipendente` | Visualizzazione turni, timbratura, tasks, chat |

---

## 📁 Struttura progetto

```
src/
├── components/       # Componenti riutilizzabili
├── hooks/            # Custom hooks (useTimbratura, useAuth…)
├── integrations/     # Client Supabase e tipi generati
├── lib/              # Utility (date-utils, auth, export…)
└── routes/
    ├── manager/      # Pagine area manager
    └── dipendente/   # Pagine area dipendente
supabase/
└── migrations/       # Migrazioni database
```
