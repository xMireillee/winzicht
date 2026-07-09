-- ============================================================================
-- Winzicht — databaseschema (Supabase / Postgres)
--
-- LET OP: dit bestand is gereconstrueerd uit de applicatiecode, omdat het
-- oorspronkelijke schema alleen in Supabase zelf leefde. Controleer bij twijfel
-- de live database (Supabase dashboard → Database → Tables) en werk dit
-- bestand bij wanneer het schema verandert. Doel: elke omgeving (test/nieuw)
-- moet met dit bestand opnieuw op te bouwen zijn.
--
-- Tabellen in gebruik door de app:
--   aanbestedingen    — één rij per gunningsbrief; inhoud als JSONB
--   klanten           — één dossier per klant; inhoud als JSONB
--   labels            — thema's, leerpunten en procesthema's voor codering
--   label_wijzigingen — auditlog van labelbeheer
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- aanbestedingen
-- data bevat het volledige Aanbesteding-object (zie lib/types.ts):
-- opdrachtgever, klant, kenmerk, sector, procedure, datum, bron, percelen[],
-- evaluatie (incl. procesthema-velden) en optioneel debrief.
-- ----------------------------------------------------------------------------
create table if not exists public.aanbestedingen (
  id               uuid primary key default gen_random_uuid(),
  data             jsonb not null default '{}'::jsonb,
  aangemaakt_door  text,
  aangemaakt_op    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- klanten
-- klant_naam wordt case-insensitief gematcht met Aanbesteding.klant (ilike).
-- data bevat profiel, sterktes, aandachtspunten, afspraken en notities[].
-- bijgewerkt_op wordt door de API gezet bij elke update.
-- ----------------------------------------------------------------------------
create table if not exists public.klanten (
  id             uuid primary key default gen_random_uuid(),
  klant_naam     text not null,
  data           jsonb not null default '{}'::jsonb,
  bijgewerkt_op  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- labels
-- soort: sinds juli 2026 alleen nog 'thema' (feedbackcodering van criteria in
-- gunningsbrieven). De soorten 'leerpunt' en 'procesthema' zijn vervallen met de
-- nieuwe, open interne evaluatie; de CHECK laat ze nog toe zodat eventuele oude
-- rijen geldig blijven, maar de app maakt en toont ze niet meer.
-- De API rekent op unieke (soort, naam)-combinaties: bij een duplicaat
-- verwacht hij foutcode 23505.
-- ----------------------------------------------------------------------------
create table if not exists public.labels (
  id             uuid primary key default gen_random_uuid(),
  soort          text not null check (soort in ('thema', 'leerpunt', 'procesthema')),
  naam           text not null,
  actief         boolean not null default true,
  aangemaakt_op  timestamptz not null default now(),
  unique (soort, naam)
);

-- ----------------------------------------------------------------------------
-- label_wijzigingen (auditlog van labelbeheer)
-- actie: toegevoegd | hernoemd | gedeactiveerd | geactiveerd | samengevoegd
-- ----------------------------------------------------------------------------
create table if not exists public.label_wijzigingen (
  id                 uuid primary key default gen_random_uuid(),
  soort              text not null,
  actie              text not null,
  oud                text,
  nieuw              text,
  aantal_bijgewerkt  integer not null default 0,
  door               text,
  op                 timestamptz not null default now()
);

-- ============================================================================
-- OPRUIMEN (optioneel): oude leerpunt- en procesthema-labels
--
-- Sinds de open interne evaluatie (juli 2026) gebruikt de app alleen nog
-- 'thema'-labels. Bestaande 'leerpunt'- en 'procesthema'-rijen doen geen kwaad
-- (de app negeert ze), maar wie ze wil opruimen kan ze deactiveren of verwijderen:
--
--   delete from public.labels where soort in ('leerpunt', 'procesthema');
--
-- Een CHECK-constraint aanpassen is niet nodig; laat 'thema','leerpunt',
-- 'procesthema' gewoon toegestaan zodat historische rijen geldig blijven.
-- ============================================================================

-- ============================================================================
-- AUTH-CONFIGURATIE (Supabase dashboard — geen SQL, maar hoort bij de setup)
--
-- Vereist voor een werkende bevestigingsmail bij het aanmaken van accounts:
--
-- 1. Authentication → URL Configuration:
--      Site URL = https://winzicht.app
--
-- 2. Authentication → Emails → template "Confirm signup": vervang de link door
--    onderstaande, zodat hij via /auth/confirm loopt (werkt vanaf elk apparaat,
--    ook als de mail op een telefoon of andere browser wordt geopend):
--
--      <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
--        Bevestig je account
--      </a>
--
-- 3. Authentication → Sign In / Providers → Email: "Confirm email" AAN.
-- ============================================================================

-- ============================================================================
-- Row Level Security
--
-- Alle reads/writes lopen via de API-routes, die zelf een sessie afdwingen
-- (supabase.auth.getUser()). De policies hieronder beperken toegang tot
-- ingelogde gebruikers; er is bewust (nog) geen fijnmaziger model — elke
-- ingelogde collega ziet en bewerkt alle teamdata. Controleer of RLS in de
-- live database aanstaat; zo niet, dan zijn deze statements de gewenste staat.
-- ============================================================================

alter table public.aanbestedingen    enable row level security;
alter table public.klanten           enable row level security;
alter table public.labels            enable row level security;
alter table public.label_wijzigingen enable row level security;

drop policy if exists "authenticated_all" on public.aanbestedingen;
create policy "authenticated_all" on public.aanbestedingen
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all" on public.klanten;
create policy "authenticated_all" on public.klanten
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all" on public.labels;
create policy "authenticated_all" on public.labels
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all" on public.label_wijzigingen;
create policy "authenticated_all" on public.label_wijzigingen
  for all to authenticated using (true) with check (true);
