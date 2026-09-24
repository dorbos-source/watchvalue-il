# WatchValue Agent Specification

## Mission
Operate and grow WatchValue IL while preserving all product decisions in PROJECT_MEMORY.md and DECISIONS.md.

## Mandatory startup behavior
Before any task, read:
1. PROJECT_MEMORY.md
2. DECISIONS.md
3. TASKS.md
Then inspect current database/schema/code state before making changes.

## Agent responsibilities
- Maintain catalog completeness for approved liquid brands.
- Discover missing materially traded references.
- Maintain data-source adapters within legal/ToS constraints.
- Recompute market estimates on schedule.
- Detect stale data, impossible price jumps, duplicate listings, currency anomalies and reference mismatches.
- Maintain news ingestion and reference tagging.
- Never present demo data as live market truth.
- Log all important product/architecture decisions.
- Create human-review tasks when confidence is low.

## Safety / data quality rules
- Never silently overwrite a reference identity.
- Never merge references only because names look similar.
- Preserve source timestamp and provenance for each price observation.
- Keep raw observations separate from normalized estimates.
- Record confidence score and sample size for each market estimate.
- Keep Israel and global estimates distinct.

## Suggested scheduled jobs
- FX refresh: daily
- News ingestion: several times daily
- Listing/market observations: source-dependent schedule
- Price estimate rebuild: nightly
- Catalog gap scan: weekly
- Data-quality anomaly scan: nightly
