import { PROCEDURES, SECTOREN, THEMAS } from "./constants"

export function buildExtractiePrompt(themas: readonly string[] = THEMAS): string {
  const themaLijst = themas.length > 0 ? themas : THEMAS
  return `Je bent analist bij een aanbestedingsadviesbureau. Extraheer de gegevens uit deze gunningsbrief (mededeling van gunning) naar JSON.

Antwoord UITSLUITEND met compacte JSON volgens exact dit schema:
{"opdrachtgever":"","klant":"","kenmerk":"","sector":"","procedure":"","datum":"JJJJ-MM-DD","percelen":[{"naam":"","uitslag":"","positie":null,"aantalInschrijvers":null,"totaalEigen":null,"totaalWinnaar":null,"criteria":[{"naam":"","weging":null,"max":null,"eigen":null,"winnaar":null,"feedback":"","thema1":"","thema2":"","sentiment":""}]}]}

Regels:
- "klant" is de inschrijver aan wie de brief is gericht; "opdrachtgever" is de aanbestedende dienst.
- Kies "sector" uit: ${SECTOREN.join(", ")}. Kies op basis van de aanbestedende dienst.
- Kies "procedure" uit: ${PROCEDURES.join(", ")}.
- "uitslag" per perceel: Gewonnen, Verloren, Ingetrokken of Onbekend. Let op: de uitslag kan per perceel verschillen.
- Geen percelen genoemd? Gebruik één perceel met naam "Geheel".
- Neem per gunningscriterium de letterlijke feedbacktekst over in "feedback" (alleen wat er echt staat, niets verzinnen; leeg laten als de brief geen inhoudelijke motivering bevat).
- Codeer feedback met thema's UITSLUITEND uit deze lijst: ${themaLijst.join(", ")}. thema1 = het thema dat de score het meest verklaart. thema2 alleen bij een duidelijk tweede thema, anders "". Blijkt uit de scoretabel dat vooral prijs het verschil maakte, gebruik dan "Prijs te hoog t.o.v. kwaliteit" of "Prijs gunstig".
- "sentiment": Positief, Negatief, Gemengd of Neutraal.
- Onbekende waarden: null (getallen) of "" (tekst). Getallen met punt als decimaalteken.`
}

/** Haal het eerste JSON-object uit een (mogelijk in markdown verpakte) modelrespons. */
export function parseModelJson(text: string): Record<string, unknown> {
  let cleaned = text.trim()
  // Strip markdown code fences.
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Geen JSON gevonden in de respons.")
  }
  const jsonStr = cleaned.slice(start, end + 1)
  return JSON.parse(jsonStr) as Record<string, unknown>
}
