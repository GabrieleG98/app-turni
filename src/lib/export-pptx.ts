import pptxgen from "pptxgenjs";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { GIORNI, isoData, oreTraOrari } from "@/lib/date-utils";

interface Profilo {
  id: string;
  nome: string;
  cognome: string;
  ruolo_lavoro: string;
}

interface Turno {
  id: string;
  dipendente_id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  tipo_turno: string;
  location: string;
}

interface Evento {
  titolo: string;
  data: string;
  ora_inizio: string | null;
  ora_fine: string | null;
  location: string | null;
  categoria: string;
  colore: string;
}

const COL_TURNO: Record<string, string> = {
  mattina: "FFE69A",
  pomeriggio: "F4A261",
  sera: "3B5BA5",
};
const COL_TURNO_TXT: Record<string, string> = {
  mattina: "5C3A00",
  pomeriggio: "3D1A00",
  sera: "FFFFFF",
};

const BRAND = "1E3A8A";
const BRAND_LIGHT = "DBEAFE";

export async function exportSettimanaPPTX(opts: {
  giorni: Date[];
  profili: Profilo[];
  turni: Turno[];
  eventi: Evento[];
  titoloSettimana: string;
}) {
  const { giorni, profili, turni, eventi, titoloSettimana } = opts;
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.title = `Turni ${titoloSettimana}`;

  // ===== SLIDE 1: Riepilogo settimanale =====
  const s1 = pptx.addSlide();
  s1.background = { color: "FFFFFF" };
  s1.addText("Turni Staff 4FUN — Timi Ama", {
    x: 0.4, y: 0.2, w: 12.5, h: 0.4,
    fontSize: 18, bold: true, color: BRAND, fontFace: "Calibri",
  });
  s1.addText(titoloSettimana, {
    x: 0.4, y: 0.6, w: 12.5, h: 0.4,
    fontSize: 13, color: "555555", fontFace: "Calibri",
  });

  // Tabella
  const headerRow = [
    { text: "Dipendente", options: { bold: true, fill: { color: BRAND }, color: "FFFFFF", align: "left" as const, valign: "middle" as const } },
    ...giorni.map((g, i) => ({
      text: `${GIORNI[i].slice(0, 3)}\n${format(g, "dd/MM")}`,
      options: { bold: true, fill: { color: BRAND }, color: "FFFFFF", align: "center" as const, valign: "middle" as const, fontSize: 10 },
    })),
  ];

  const bodyRows = profili.map((p) => {
    const rowCells: any[] = [
      { text: `${p.nome} ${p.cognome}\n${p.ruolo_lavoro || ""}`, options: { bold: true, align: "left" as const, valign: "middle" as const, fontSize: 9 } },
    ];
    giorni.forEach((g) => {
      const dataIso = isoData(g);
      const dayTurni = turni
        .filter((t) => t.dipendente_id === p.id && t.data === dataIso)
        .sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
      if (dayTurni.length === 0) {
        rowCells.push({ text: "—", options: { align: "center" as const, valign: "middle" as const, color: "AAAAAA", fontSize: 9 } });
      } else {
        const txt = dayTurni
          .map((t) => `${t.tipo_turno.toUpperCase()}\n${t.ora_inizio.slice(0, 5)}–${t.ora_fine.slice(0, 5)}${t.location ? `\n${t.location}` : ""}`)
          .join("\n———\n");
        const primary = dayTurni[0].tipo_turno;
        rowCells.push({
          text: txt,
          options: {
            fill: { color: COL_TURNO[primary] || "EEEEEE" },
            color: COL_TURNO_TXT[primary] || "000000",
            align: "center" as const,
            valign: "middle" as const,
            fontSize: 8,
          },
        });
      }
    });
    return rowCells;
  });

  s1.addTable([headerRow, ...bodyRows], {
    x: 0.4, y: 1.1, w: 12.5,
    colW: [2.0, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5],
    rowH: 0.7,
    border: { type: "solid", pt: 0.5, color: "CCCCCC" },
    fontFace: "Calibri",
  });

  // ===== Una slide per giorno =====
  giorni.forEach((g, idx) => {
    const dataIso = isoData(g);
    const dayTurni = turni
      .filter((t) => t.data === dataIso)
      .sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
    const dayEventi = eventi.filter((e) => e.data === dataIso);

    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 1.0, fill: { color: BRAND } });
    s.addText(`${GIORNI[idx]} ${format(g, "d MMMM yyyy", { locale: it })}`, {
      x: 0.4, y: 0.2, w: 12.5, h: 0.6, fontSize: 24, bold: true, color: "FFFFFF", fontFace: "Calibri",
    });

    if (dayTurni.length === 0 && dayEventi.length === 0) {
      s.addText("Nessun turno né evento", {
        x: 0.4, y: 3.3, w: 12.5, h: 0.5, fontSize: 16, color: "888888", align: "center", fontFace: "Calibri",
      });
      return;
    }

    let y = 1.3;
    if (dayEventi.length > 0) {
      s.addText("Eventi speciali", { x: 0.4, y, w: 12.5, h: 0.35, fontSize: 14, bold: true, color: BRAND, fontFace: "Calibri" });
      y += 0.4;
      const eRows = [
        [
          { text: "Titolo", options: { bold: true, fill: { color: BRAND_LIGHT } } },
          { text: "Orario", options: { bold: true, fill: { color: BRAND_LIGHT } } },
          { text: "Location", options: { bold: true, fill: { color: BRAND_LIGHT } } },
          { text: "Categoria", options: { bold: true, fill: { color: BRAND_LIGHT } } },
        ],
        ...dayEventi.map((e) => [
          { text: e.titolo },
          { text: e.ora_inizio ? `${e.ora_inizio.slice(0, 5)}${e.ora_fine ? `–${e.ora_fine.slice(0, 5)}` : ""}` : "—" },
          { text: e.location || "—" },
          { text: e.categoria.replace("_", " ") },
        ]),
      ];
      s.addTable(eRows as any, {
        x: 0.4, y, w: 12.5, colW: [4, 2, 4, 2.5], rowH: 0.4,
        border: { type: "solid", pt: 0.5, color: "DDDDDD" },
        fontFace: "Calibri", fontSize: 11,
      });
      y += 0.45 + 0.4 * dayEventi.length + 0.3;
    }

    if (dayTurni.length > 0) {
      s.addText("Turni", { x: 0.4, y, w: 12.5, h: 0.35, fontSize: 14, bold: true, color: BRAND, fontFace: "Calibri" });
      y += 0.4;
      const profiliMap = new Map(profili.map((p) => [p.id, p]));
      const tRows = [
        [
          { text: "Tipo", options: { bold: true, fill: { color: BRAND_LIGHT } } },
          { text: "Orario", options: { bold: true, fill: { color: BRAND_LIGHT } } },
          { text: "Ore", options: { bold: true, fill: { color: BRAND_LIGHT } } },
          { text: "Dipendente", options: { bold: true, fill: { color: BRAND_LIGHT } } },
          { text: "Ruolo", options: { bold: true, fill: { color: BRAND_LIGHT } } },
          { text: "Location", options: { bold: true, fill: { color: BRAND_LIGHT } } },
        ],
        ...dayTurni.map((t) => {
          const p = profiliMap.get(t.dipendente_id);
          const ore = oreTraOrari(t.ora_inizio, t.ora_fine, t.data);
          return [
            { text: t.tipo_turno, options: { fill: { color: COL_TURNO[t.tipo_turno] || "FFFFFF" }, color: COL_TURNO_TXT[t.tipo_turno] || "000000", bold: true } },
            { text: `${t.ora_inizio.slice(0, 5)}–${t.ora_fine.slice(0, 5)}` },
            { text: `${ore.toFixed(1)}h` },
            { text: p ? `${p.nome} ${p.cognome}` : "—" },
            { text: p?.ruolo_lavoro || "—" },
            { text: t.location || "—" },
          ];
        }),
      ];
      s.addTable(tRows as any, {
        x: 0.4, y, w: 12.5, colW: [1.5, 1.8, 1.0, 3.0, 2.7, 2.5], rowH: 0.4,
        border: { type: "solid", pt: 0.5, color: "DDDDDD" },
        fontFace: "Calibri", fontSize: 11,
      });
    }
  });

  await pptx.writeFile({ fileName: `turni-${titoloSettimana.replace(/\s+/g, "-")}.pptx` });
}
