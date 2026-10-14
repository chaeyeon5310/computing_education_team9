/**
 * Node.js standard library only: `node tests/check-model.cjs`
 * Checks the actual data set and scenario model without fetching external assets.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const listingsFile = JSON.parse(read('data/listings.json'));
const storyline = JSON.parse(read('data/storyline.json'));
const listings = listingsFile.listings;

assert.equal(listings.length, 610, 'Expected 610 source apartments');
assert.equal(new Set(listings.map(x => x.id)).size, listings.length, 'Duplicate apartment IDs');
for (const home of listings) {
  assert.ok(Number.isFinite(home.lat) && Number.isFinite(home.lng), `Missing position: ${home.id}`);
  assert.ok(home.basePrice > 0 && home.area > 0, `Invalid base price/size: ${home.id}`);
}
for (let year = 2020; year <= 2026; year++) {
  const entry = storyline.years[String(year)];
  assert.ok(entry, `Missing storyline for ${year}`);
  assert.ok(entry.regionalStats, `Missing regional statistics for ${year}`);
}

const context = vm.createContext({
  document: {},
  console,
  localStorage: { setItem() {}, getItem() { return null; } },
});
for (const file of ['src/state.js', 'src/market-model.js', 'src/finance.js']) {
  vm.runInContext(read(file), context, { filename: file });
}
context._listingData = listings;
context._storyData = storyline;
vm.runInContext('listings = _listingData; story = _storyData; session = { profile: personalities[0], cash: personalities[0].cash, houseId: null, loan: 0, year: 2020 };', context);

const values = vm.runInContext(`listings.map(home => ({
  base: home.basePrice,
  prices: Array.from({length: 7}, (_,i) => valueAt(home, 2020+i)),
  maxLoan: maxLoan(home, 2020)
}))`, context);

for (const x of values) {
  assert.equal(x.prices[0], x.base, '2020 must equal the actual dataset baseline');
  assert.ok(x.prices.every(v => Number.isFinite(v) && v > 0), 'Prices must stay finite');
  assert.ok(Number.isFinite(x.maxLoan) && x.maxLoan >= 0, 'Invalid financing calculation');
}

const changeSet = new Set(values.map(v => Math.round(10000 * (v.prices[4]/v.prices[3]-1))));
assert.ok(changeSet.size > 30, 'Annual home returns do not have enough variety');
console.log(`OK: ${listings.length} apartments; 2020-2026 prices and financing finite; ${changeSet.size} return groups.`);
