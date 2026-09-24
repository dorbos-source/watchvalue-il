# WatchValue IL — Project Memory

## Product vision
WatchValue IL is an Israeli luxury-watch market pricing product: the "Levi Yitzhak" of luxury watches.
Primary user need: know what a luxury watch is really worth now and avoid overpaying.

## Market scope
Include only liquid / actively traded luxury brands and all materially traded references, including current and discontinued models.
Initial brand universe:
- Rolex
- Patek Philippe
- Audemars Piguet
- Richard Mille
- Cartier
- Omega
- Vacheron Constantin
- Tudor
- IWC
- Breitling
- Panerai
- Jaeger-LeCoultre
- Grand Seiko
- Hublot
- A. Lange & Söhne
- F.P. Journe

## Catalog model
Brand -> Collection -> Reference -> Variant -> Production years / generation.
Reference-level pricing is mandatory. Include discontinued references and limited editions when materially traded.

## Core watch page
- Brand / collection / reference / variant
- Current vs Discontinued
- Production years
- MSRP / retail where available
- Global market estimate
- Israel market estimate
- Dealer buy estimate
- Private sale estimate
- Dealer ask estimate
- 30D / 6M / 1Y trend
- Historical chart
- Liquidity metrics
- Active listings count when available
- Full-set / watch-only context
- Related / successor / predecessor references
- Relevant news

## Pricing philosophy
Do NOT blindly copy one marketplace price.
Build a proprietary WatchValue estimate from multiple legally usable/public sources.
Prefer robust statistics such as median, freshness weighting, deduplication, outlier removal, condition/full-set/year normalization, and Israel-vs-global adjustment.
All demo or inferred prices must be explicitly marked until production data quality is validated.

## Subscription model — LOCKED FOR MVP
- 7-day free trial
- Monthly: USD 14.99
- Annual: USD 149
- Annual should be visually highlighted as preferred / best value.

## Business model priority
Primary monetization: subscription.
Secondary monetization later: dealer leads, dealer memberships, direct sponsorships, affiliate / marketplace opportunities.
Do not clutter MVP with ads.

## Automation goal
Owner should not need daily operational involvement.
System should automatically ingest/update catalog data, collect permitted market observations, clean/dedupe data, recompute market estimates, update FX, ingest watch-industry news, summarize/tag news, associate news with brands/references, and flag anomalies for review.

## Infrastructure
- GitHub source of truth
- Railway deployment
- PostgreSQL catalog/prices/subscriptions/jobs/agent memory
- Background jobs / scheduled ingestion
