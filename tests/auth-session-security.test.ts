import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(file), 'utf8');

test('normal authentication uses a revocable HttpOnly cookie session', () => {
  const auth = read('src/server/controllers/auth.controller.ts');
  const middleware = read('src/middleware/auth.middleware.ts');
  assert.match(auth, /auth_sessions/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /res\.cookie\(SESSION_COOKIE, token/);
  assert.match(auth, /logoutHandler/);
  assert.match(auth, /UPDATE auth_sessions SET revoked_at=now\(\) WHERE user_id=/);
  assert.match(middleware, /fixdev_session=/);
  assert.match(middleware, /revoked_at IS NULL AND expires_at>now\(\)/);
});

test('browser client does not persist access JWT in localStorage', () => {
  for (const file of ['src/utils/authClient.ts', 'src/lib/api/client.ts', 'src/context/SaaSContext.tsx', 'src/hooks/useRentalApi.ts']) {
    assert.doesNotMatch(read(file), /localStorage\.(?:getItem|setItem|removeItem)\(['"]fixdev_token/);
  }
});
