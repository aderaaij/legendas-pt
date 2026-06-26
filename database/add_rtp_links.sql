-- Per-season RTP program links for a show.
--
-- A single show in this app can map to MULTIPLE RTP "programa" pages — RTP often
-- gives each season its own program id (e.g. Pôr do Sol S1 = p9165, S2 = p10551).
-- The legacy single `shows.watch_url` field can't represent that, so we store an
-- array of links here, one entry per season.
--
-- Shape (jsonb array): [{ "season": 1, "url": "https://www.rtp.pt/play/p9165/por-do-sol" }, ...]
--   - `season` is optional: entries derived from a known import carry it (so the
--     UI can label "Ver no RTP · T1 / · T2"); a fallback entry with no season
--     just renders "Ver no RTP".
--
-- Written by the RTP import (one upsert-by-season per imported series) and by the
-- one-time backfill script (scripts/backfill-rtp-links.mjs). Read by the show
-- page + home hero. Idempotent.
ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS rtp_links jsonb NOT NULL DEFAULT '[]'::jsonb;
