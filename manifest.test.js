import test from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(
  await readFile(new URL('./manifest.json', import.meta.url), 'utf-8')
);

test('manifest.json: contains required permissions', async (t) => {
  const permissions = manifest.permissions || [];

  await t.test('includes identity.email for getProfileUserInfo()', () => {
    assert.ok(
      permissions.includes('identity.email'),
      'Missing "identity.email" permission — chrome.identity.getProfileUserInfo() will return empty data without it'
    );
  });

  await t.test('includes identity', () => {
    assert.ok(
      permissions.includes('identity'),
      'Missing "identity" permission'
    );
  });

  await t.test('includes storage', () => {
    assert.ok(
      permissions.includes('storage'),
      'Missing "storage" permission'
    );
  });

  await t.test('includes printerProvider', () => {
    assert.ok(
      permissions.includes('printerProvider'),
      'Missing "printerProvider" permission'
    );
  });
});

test('manifest.json: references managed_schema', () => {
  assert.ok(
    manifest.storage && manifest.storage.managed_schema,
    'Missing storage.managed_schema — enterprise policies will not work'
  );
});
