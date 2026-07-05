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
-- soort: 'thema' (feedbackcodering), 'leerpunt' (interne evaluatie),
-- 'procesthema' (codering van procesevaluatie-toelichtingen).
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
-- MIGRATIE voor bestaande databases: procesthema toestaan
--
-- De app ondersteunt sinds juli 2026 de labelsoort 'procesthema'. Als de
-- bestaande labels-tabel een CHECK-constraint heeft die alleen 'thema' en
-- 'leerpunt' toestaat, faalt het toevoegen van een procesthema met een
-- database-fout. Voer dan onderstaande statements uit in de Supabase
-- SQL-editor (constraintnaam kan afwijken; check eerst met de query hieronder).
--
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.labels'::regclass and contype = 'c';
--
--   alter table public.labels drop constraint if exists labels_soort_check;
--   alter table public.labels
--     add constraint labels_soort_check
--     check (soort in ('thema', 'leerpunt', 'procesthema'));
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
