import test from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';

const enMessages = JSON.parse(
  await readFile(new URL('./_locales/en/messages.json', import.meta.url), 'utf-8')
);

const locales = [
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt_BR', name: 'Brazilian Portuguese' },
  { code: 'pt_PT', name: 'European Portuguese' },
  { code: 'de', name: 'German' }
];

for (const { code, name } of locales) {
  const localeMessages = JSON.parse(
    await readFile(new URL(`./_locales/${code}/messages.json`, import.meta.url), 'utf-8')
  );

  test(`_locales/${code}/messages.json: contains valid ${name} translations`, async (t) => {
    const enKeys = Object.keys(enMessages).sort();
    const locKeys = Object.keys(localeMessages).sort();

    await t.test('has all keys matching English locale', () => {
      assert.deepStrictEqual(locKeys, enKeys, `${name} locale keys do not match English locale keys`);
    });

    await t.test('has non-empty message for all keys', () => {
      for (const key of enKeys) {
        assert.ok(localeMessages[key].message, `Missing message for key "${key}" in ${name} locale`);
        assert.strictEqual(typeof localeMessages[key].message, 'string', `Message for key "${key}" should be a string`);
      }
    });

    await t.test('has matching placeholders for all keys', () => {
      for (const key of enKeys) {
        if (enMessages[key].placeholders) {
          assert.ok(localeMessages[key].placeholders, `Missing placeholders for key "${key}" in ${name} locale`);
          assert.deepStrictEqual(
            Object.keys(localeMessages[key].placeholders),
            Object.keys(enMessages[key].placeholders),
            `Placeholders for key "${key}" do not match English locale`
          );
        }
      }
    });
  });
}
