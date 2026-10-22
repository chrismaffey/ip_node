const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handler, normalizeIP } = require('../src/handler');

const browserHeaders = {
  'x-forwarded-for': '203.0.113.10',
  'user-agent': 'Mozilla/5.0 Firefox/140.0',
  accept: 'text/html,application/xhtml+xml',
};
const request = (path, headers = browserHeaders) => new Request(`http://localhost${path}`, { headers });

test('browser at root renders the supplied template', async () => {
  const response = await handler(request('/'));
  assert.match(response.headers['Content-Type'], /^text\/html/);
  assert.match(response.body, /value="203\.0\.113\.10"/);
  assert.ok(!response.body.includes('IP_ADDRESS'));
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

for (const path of ['/ip', '/some/nested/path', '/?x=1', '/?flag', '/?']) {
  test(`browser at ${path} receives only the IP`, async () => {
    const response = await handler(request(path));
    assert.equal(response.body, '203.0.113.10');
    assert.match(response.headers['Content-Type'], /^text\/plain/);
  });
}

test('curl receives only the IP even when accepting HTML', async () => {
  const response = await handler(request('/', { ...browserHeaders, 'user-agent': 'curl/8.0' }));
  assert.equal(response.body, '203.0.113.10');
});

test('unidentified clients receive plain text', async () => {
  const response = await handler(request('/', { 'x-forwarded-for': '2001:db8::1' }));
  assert.equal(response.body, '2001:db8::1');
});

test('uses the address appended by trusted ingress', async () => {
  const response = await handler(request('/', { 'x-forwarded-for': '198.51.100.9, 203.0.113.10:12345' }));
  assert.equal(response.body, '203.0.113.10');
});

test('normalizes IPv4 and IPv6 with ports', () => {
  assert.equal(normalizeIP('203.0.113.10:1234'), '203.0.113.10');
  assert.equal(normalizeIP('[2001:db8::1]:1234'), '2001:db8::1');
  assert.equal(normalizeIP('::ffff:192.0.2.1'), '192.0.2.1');
});

test('missing or invalid IP does not render untrusted input', async () => {
  for (const headers of [{}, { 'x-forwarded-for': '"><script>alert(1)</script>' }]) {
    const response = await handler(request('/', headers));
    assert.equal(response.status, 503);
  }
});
