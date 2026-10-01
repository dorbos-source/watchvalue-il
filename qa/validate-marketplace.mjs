import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { normalizeMarketplaceListing } from '../market/normalize-marketplace.mjs';

const rules=JSON.parse(await fs.readFile(new URL('../market/variant-rules.json',import.meta.url),'utf8'));

const ok=normalizeMarketplaceListing({
  reference:'126710BLNR',title:'2024 Rolex GMT Master II 126710BLNR Jubilee Full Set',
  asking_price:19950,currency:'USD',source_url:'https://example.test/1'
},rules);
assert.equal(ok.accepted,true);
assert.equal(ok.listing.variant_key,'m126710blnr-0002');
assert.equal(ok.listing.bracelet,'Jubilee');
assert.equal(ok.listing.year,2024);

const oyster=normalizeMarketplaceListing({
  reference:'126710BLNR',title:'2023 Rolex GMT Master II 126710BLNR Oyster',
  asking_price:18500,currency:'USD',source_url:'https://example.test/2'
},rules);
assert.equal(oyster.accepted,true);
assert.equal(oyster.listing.variant_key,'m126710blnr-0003');

const noYear=normalizeMarketplaceListing({
  reference:'126710BLNR',title:'Rolex GMT Master II 126710BLNR Jubilee',
  asking_price:19000,currency:'USD',source_url:'https://example.test/3'
},rules);
assert.equal(noYear.accepted,false);
assert.ok(noYear.reasons.includes('year_missing_or_ambiguous'));

const conflict=normalizeMarketplaceListing({
  reference:'126710BLNR',variant_key:'m126710blnr-0002',title:'2024 Rolex 126710BLNR Oyster',
  asking_price:19000,currency:'USD',source_url:'https://example.test/4'
},rules);
assert.equal(conflict.accepted,false);
assert.ok(conflict.reasons.includes('bracelet_variant_conflict'));

const sprite=normalizeMarketplaceListing({
  reference:'126720VTNR',title:'2025 Rolex GMT-Master II Sprite Jubilee 126720VTNR',
  asking_price:21000,currency:'USD',source_url:'https://example.test/5'
},rules);
assert.equal(sprite.accepted,true);
assert.equal(sprite.listing.variant_key,'m126720vtnr-0002');

console.log('marketplace identity QA passed');
