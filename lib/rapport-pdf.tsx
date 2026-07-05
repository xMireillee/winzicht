import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import type { RapportStats } from "./rapport"

// Merklettertypen embedden (Archivo voor tekst, IBM Plex Mono voor cijfers).
// Fontsource levert stabiele statische TTF's via jsDelivr.
let fontsGeregistreerd = false
function registreerFonts() {
  if (fontsGeregistreerd) return
  try {
    Font.register({
      family: "Archivo",
      fonts: [
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/archivo@latest/latin-400-normal.ttf", fontWeight: 400 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/archivo@latest/latin-600-normal.ttf", fontWeight: 600 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/archivo@latest/latin-700-normal.ttf", fontWeight: 700 },
      ],
    })
    Font.register({
      family: "PlexMono",
      fonts: [
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-500-normal.ttf", fontWeight: 500 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-600-normal.ttf", fontWeight: 600 },
      ],
    })
    fontsGeregistreerd = true
  } catch {
    // Val stil terug op ingebouwde lettertypen bij netwerkproblemen.
  }
}

const C = {
  ink: "#201f3e",
  inkDeep: "#110529",
  accent: "#54ae93",
  paper: "#f6f6f9",
  won: "#1e6b4f",
  lost: "#b23a2c",
  wit: "#ffffff",
  grijs: "#6b6a80",
  lijn: "#e5e5ec",
}

const s = StyleSheet.create({
  page: { fontFamily: "Archivo", color: C.ink, backgroundColor: C.wit, paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48 },
  // Cover
  cover: { backgroundColor: C.inkDeep, color: C.wit, padding: 48, flexDirection: "column", justifyContent: "space-between", height: "100%" },
  wordmark: { fontSize: 26, fontWeight: 700, color: C.wit },
  dot: { color: C.accent },
  coverEyebrow: { fontFamily: "PlexMono", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: C.accent, marginBottom: 10 },
  coverTitle: { fontSize: 30, fontWeight: 700, lineHeight: 1.15 },
  coverKwartaal: { fontFamily: "PlexMono", fontSize: 13, fontWeight: 500, color: C.wit, marginTop: 14, opacity: 0.85 },
  coverFooter: { fontSize: 9, color: C.wit, opacity: 0.6 },
  // Content
  eyebrow: { fontFamily: "PlexMono", fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: C.grijs, marginBottom: 8 },
  h2: { fontSize: 15, fontWeight: 700, marginBottom: 12, marginTop: 4 },
  tilesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  tile: { width: "47%", borderWidth: 1, borderColor: C.lijn, borderRadius: 8, padding: 14 },
  tileLabel: { fontFamily: "PlexMono", fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: C.grijs, marginBottom: 6 },
  tileValue: { fontFamily: "PlexMono", fontSize: 22, fontWeight: 600 },
  tileSub: { fontSize: 8.5, color: C.grijs, marginTop: 4 },
  para: { fontSize: 10, lineHeight: 1.6, marginBottom: 10, color: C.ink },
  // Tabel
  tblHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.ink, paddingBottom: 6, marginBottom: 4 },
  tblRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.lijn },
  thTheme: { flex: 1, fontSize: 8, fontFamily: "PlexMono", letterSpacing: 1, textTransform: "uppercase", color: C.grijs },
  thNum: { width: 120, textAlign: "right", fontSize: 8, fontFamily: "PlexMono", letterSpacing: 1, textTransform: "uppercase", color: C.grijs },
  tdTheme: { flex: 1, fontSize: 10 },
  tdNum: { width: 120, textAlign: "right", fontSize: 10, fontFamily: "PlexMono", fontWeight: 600 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, borderTopWidth: 1, borderTopColor: C.lijn, paddingTop: 8, fontSize: 7.5, color: C.grijs, flexDirection: "row", justifyContent: "space-between" },
  sectionGap: { marginBottom: 28 },
})

function fmtDatum(d = new Date()): string {
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
}

export function RapportDocument({ stats, duiding }: { stats: RapportStats; duiding: string }) {
  registreerFonts()
  const paragrafen = duiding.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const deltaTekst =
    stats.deltaPct == null ? "geen vergelijking" : `${stats.deltaPct >= 0 ? "+" : ""}${stats.deltaPct} pp t.o.v. vorig kwartaal`
  const genereerDatum = fmtDatum()

  return (
    <Document title={`Kwartaalrapport ${stats.kwartaalLabel}`} author="Corus">
      {/* Cover */}
      <Page size="A4">
        <View style={s.cover}>
          <Text style={s.wordmark}>
            corus<Text style={s.dot}>.</Text>
          </Text>
          <View>
            <Text style={s.coverEyebrow}>Tenderintelligentie</Text>
            <Text style={s.coverTitle}>Kwartaalrapport{"\n"}tenderintelligentie</Text>
            <Text style={s.coverKwartaal}>{stats.kwartaalLabel}</Text>
          </View>
          <Text style={s.coverFooter}>Automatisch gegenereerd op {genereerDatum} · vertrouwelijk</Text>
        </View>
      </Page>

      {/* Inhoud */}
      <Page size="A4" style={s.page}>
        <View style={s.sectionGap}>
          <Text style={s.eyebrow}>Kerncijfers {stats.kwartaalLabel}</Text>
          <View style={s.tilesRow}>
            <View style={s.tile}>
              <Text style={s.tileLabel}>Winrate percelen</Text>
              <Text style={s.tileValue}>{stats.winratePct != null ? `${stats.winratePct}%` : "—"}</Text>
              <Text style={s.tileSub}>{deltaTekst}</Text>
            </View>
            <View style={s.tile}>
              <Text style={s.tileLabel}>Ingevoerde brieven</Text>
              <Text style={s.tileValue}>{stats.aantalBrieven}</Text>
              <Text style={s.tileSub}>{stats.aantalPercelen} percelen</Text>
            </View>
            <View style={s.tile}>
              <Text style={s.tileLabel}>Gewonnen / verloren</Text>
              <Text style={s.tileValue}>
                {stats.gewonnen} / {stats.verloren}
              </Text>
              <Text style={s.tileSub}>percelen met uitslag</Text>
            </View>
            <View style={s.tile}>
              <Text style={s.tileLabel}>Datakwaliteit</Text>
              <Text style={s.tileValue}>
                {stats.datakwaliteit.criteriaZonderThema + stats.datakwaliteit.aanbestedingenZonderEvaluatie}
              </Text>
              <Text style={s.tileSub}>
                {stats.datakwaliteit.criteriaZonderThema} criteria zonder thema · {stats.datakwaliteit.aanbestedingenZonderEvaluatie} zonder evaluatie
              </Text>
            </View>
          </View>
        </View>

        <View style={s.sectionGap}>
          <Text style={s.eyebrow}>Duiding</Text>
          <Text style={s.h2}>Wat de cijfers vertellen</Text>
          {paragrafen.length > 0 ? (
            paragrafen.map((p, i) => (
              <Text key={i} style={s.para}>
                {p}
              </Text>
            ))
          ) : (
            <Text style={s.para}>Geen duiding beschikbaar.</Text>
          )}
        </View>

        <View wrap={false}>
          <Text style={s.eyebrow}>Grootste schrijfwinst</Text>
          <Text style={s.h2}>Thema&apos;s naar gewogen puntenverlies</Text>
          <View style={s.tblHead}>
            <Text style={s.thTheme}>Thema</Text>
            <Text style={s.thNum}>Gewogen puntenverlies</Text>
          </View>
          {stats.topThemas.length > 0 ? (
            stats.topThemas.map((t) => (
              <View key={t.thema} style={s.tblRow}>
                <Text style={s.tdTheme}>{t.thema}</Text>
                <Text style={s.tdNum}>{t.gewogenVerlies.toFixed(1)}</Text>
              </View>
            ))
          ) : (
            <View style={s.tblRow}>
              <Text style={s.tdTheme}>Onvoldoende scoregegevens dit kwartaal.</Text>
              <Text style={s.tdNum}>—</Text>
            </View>
          )}
        </View>

        <View style={s.footer} fixed>
          <Text>Corus · Kwartaalrapport tenderintelligentie {stats.kwartaalLabel}</Text>
          <Text>Automatisch gegenereerd op {genereerDatum} · vertrouwelijk</Text>
        </View>
      </Page>
    </Document>
  )
}
