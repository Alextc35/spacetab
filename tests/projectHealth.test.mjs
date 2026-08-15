import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

test('manifest uses the expected minimal Manifest V3 surface', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(Object.hasOwn(manifest, 'web_accessible_resources'), false);
  assert.equal(Object.hasOwn(manifest, 'web_accesible_resources'), false);
});

test('all manifest entry points exist', () => {
  assert.equal(existsSync(manifest.chrome_url_overrides.newtab), true);
  for (const icon of Object.values(manifest.icons)) {
    assert.equal(existsSync(icon), true, `Missing manifest icon: ${icon}`);
  }
});

test('all interface languages expose the same translation contract', () => {
  const languages = ['en', 'es', 'es_419', 'pt_BR'];
  const flattenKeys = (value, prefix = '') => Object.entries(value).flatMap(
    ([key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return child && typeof child === 'object'
        ? flattenKeys(child, path)
        : [path];
    }
  ).sort();
  const contracts = languages.map(language => flattenKeys(JSON.parse(
    readFileSync(`src/js/lang/${language}.json`, 'utf8')
  )));

  assert.ok(contracts[0].includes('folder.actions.removeBookmark'));
  for (const contract of contracts.slice(1)) {
    assert.deepEqual(contract, contracts[0]);
  }
});
