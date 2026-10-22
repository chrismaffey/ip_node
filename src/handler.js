const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { isIP } = require('node:net');

const template = readFileSync(join(__dirname, '..', 'template.html'), 'utf8');
const favicon = readFileSync(join(__dirname, 'favicon.svg'), 'utf8');

function normalizeIP(value) {
  const address = value.trim();
  if (isIP(address)) return address.startsWith('::ffff:') && isIP(address.slice(7)) === 4
    ? address.slice(7) : address;
  // Azure can include a source port in its forwarded address.
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(address);
  if (bracketed && isIP(bracketed[1])) return bracketed[1];
  const ipv4WithPort = /^(.+):\d+$/.exec(address);
  if (ipv4WithPort && isIP(ipv4WithPort[1]) === 4) return ipv4WithPort[1];
  return null;
}

async function handler(request) {
  const url = new URL(request.url);
  if (url.pathname === '/favicon.svg') {
    return {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
      body: favicon,
    };
  }

  // The trusted ingress must append or replace this header. Use its final hop,
  // rather than a client-supplied first entry.
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? normalizeIP(forwarded.split(',').at(-1)) : null;
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (!ip) {
    return { status: 503, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }, body: 'Client IP address unavailable' };
  }

  const userAgent = request.headers.get('user-agent') || '';
  const acceptsHTML = /\btext\/html\b/i.test(request.headers.get('accept') || '');
  const browser = /^Mozilla\//i.test(userAgent) && !/curl\b/i.test(userAgent) && acceptsHTML;
  const html = browser && url.pathname === '/' && !request.url.includes('?');
  return {
    status: 200,
    headers: { ...headers, 'Content-Type': html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8' },
    body: html ? template.replaceAll('IP_ADDRESS', ip) : ip + "\n",
  };
}

module.exports = { handler, normalizeIP };
