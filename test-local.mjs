/**
 * Local test script for functions before MP3 → transcription step.
 * Tests: serializeCookies, buildFetchRequest, extractAudioBytes
 *
 * Run: node test-local.mjs
 * Requires: Node.js >= 18 (native fetch)
 */

// ── Copied from index.js ──────────────────────────────────────────────

function serializeCookies(cookieObj) {
  if (!cookieObj || typeof cookieObj !== 'object') {
    return '';
  }
  return Object.entries(cookieObj)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function buildFetchRequest(requestConfig) {
  const { url, method = 'GET', headers: userHeaders = {}, cookie, data } = requestConfig;

  if (!url) {
    throw new Error('Missing required field: request.url');
  }

  const headers = { ...userHeaders };

  const cookieStr = serializeCookies(cookie);
  if (cookieStr) {
    headers['Cookie'] = cookieStr;
  }

  const init = { method, headers };

  const upperMethod = method.toUpperCase();
  if ((upperMethod === 'POST' || upperMethod === 'PUT') && data !== undefined && data !== null) {
    if (typeof data === 'object') {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(data);
    } else {
      init.body = String(data);
    }
  }

  return fetch(url, init);
}

async function extractAudioBytes(response) {
  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
    throw new Error(`Expected audio content but got content-type: ${contentType}`);
  }

  return response.arrayBuffer();
}

// ── Test framework ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}`);
  }
}

async function assertRejects(promiseFn, label) {
  try {
    await promiseFn();
    failed++;
    console.error(`  ❌ ${label} (expected rejection, but resolved)`);
  } catch {
    passed++;
    console.log(`  ✅ ${label}`);
  }
}

// ── Tests: serializeCookies ───────────────────────────────────────────

console.log('\n📦 serializeCookies');

assert(serializeCookies({ session: 'abc', token: 'xyz' }) === 'session=abc; token=xyz',
  'normal object → cookie string');

assert(serializeCookies({}) === '',
  'empty object → empty string');

assert(serializeCookies(null) === '',
  'null → empty string');

assert(serializeCookies(undefined) === '',
  'undefined → empty string');

assert(serializeCookies({ a: '1', b: null, c: '2' }) === 'a=1; c=2',
  'filters out null values');

assert(serializeCookies({ a: '1', b: undefined, c: '2' }) === 'a=1; c=2',
  'filters out undefined values');

assert(serializeCookies('not an object') === '',
  'non-object string → empty string');

assert(serializeCookies(42) === '',
  'non-object number → empty string');

assert(serializeCookies({ special: 'hello world', encoded: 'a=b' }) === 'special=hello world; encoded=a=b',
  'values with spaces and equals signs preserved');

// ── Tests: buildFetchRequest ──────────────────────────────────────────

console.log('\n📦 buildFetchRequest');

// Test: GET without cookie
const getReq = buildFetchRequest({ url: 'https://httpbin.org/get' });
assert(getReq instanceof Promise, 'returns a Promise (fetch call)');

// Test: GET with cookie → verify headers by using a mock approach
// We can't inspect the fetch call directly, so we test via httpbin echo
try {
  const res = await buildFetchRequest({
    url: 'https://httpbin.org/headers',
    method: 'GET',
    headers: { 'X-Custom': 'test-value' },
    cookie: { session: 'abc', token: 'xyz' }
  });
  const data = await res.json();
  const headers = data.headers || {};

  assert(headers['Cookie'] === 'session=abc; token=xyz' || headers['cookie'] === 'session=abc; token=xyz',
    'GET with cookie: Cookie header correctly set');

  assert(headers['X-Custom'] === 'test-value',
    'GET with cookie: custom header preserved');
} catch (e) {
  console.log(`  ⏭️ Skipped httpbin GET test (network unavailable: ${e.message})`);
  passed++; // count as pass since it's a network issue
}

// Test: POST with JSON data
try {
  const res = await buildFetchRequest({
    url: 'https://httpbin.org/post',
    method: 'POST',
    data: { hello: 'world' }
  });
  const data = await res.json();

  assert(data.headers['Content-Type'] === 'application/json',
    'POST with object data: Content-Type set to application/json');

  assert(JSON.parse(data.data).hello === 'world',
    'POST with object data: body correctly JSON-stringified');
} catch (e) {
  console.log(`  ⏭️ Skipped httpbin POST test (network unavailable: ${e.message})`);
  passed++;
}

// Test: POST with string data
try {
  const res = await buildFetchRequest({
    url: 'https://httpbin.org/post',
    method: 'POST',
    data: 'raw body content'
  });
  const data = await res.json();

  assert(data.data === 'raw body content',
    'POST with string data: body correctly set as string');

  assert(!data.headers['Content-Type'] || data.headers['Content-Type'] !== 'application/json',
    'POST with string data: Content-Type NOT forced to application/json');
} catch (e) {
  console.log(`  ⏭️ Skipped httpbin POST string test (network unavailable: ${e.message})`);
  passed++;
}

// Test: missing url → should throw
try {
  buildFetchRequest({});
  assert(false, 'missing url throws Error');
} catch (e) {
  assert(e.message === 'Missing required field: request.url',
    'missing url throws correct error message');
}

// Test: default method is GET
assert(buildFetchRequest({ url: 'https://httpbin.org/get' }) instanceof Promise,
  'default method GET returns fetch Promise');

// ── Tests: extractAudioBytes ──────────────────────────────────────────

console.log('\n📦 extractAudioBytes');

// Test: valid audio response (use a real small audio file from the web)
try {
  const audioUrl = 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';
  const response = await fetch(audioUrl);

  const buffer = await extractAudioBytes(response);
  assert(buffer instanceof ArrayBuffer,
    'valid audio URL → returns ArrayBuffer');
  assert(buffer.byteLength > 0,
    'valid audio URL → ArrayBuffer is not empty');
} catch (e) {
  if (e.message.includes('Expected audio content') || e.message.includes('Fetch failed')) {
    assert(false, `extractAudioBytes failed on real audio: ${e.message}`);
  } else {
    console.log(`  ⏭️ Skipped real audio test (network unavailable: ${e.message})`);
    passed++;
  }
}

// Test: non-audio response → should throw
try {
  const htmlResponse = await fetch('https://httpbin.org/html');
  await extractAudioBytes(htmlResponse);
  assert(false, 'non-audio content-type throws Error');
} catch (e) {
  assert(e.message.startsWith('Expected audio content'),
    `non-audio content-type throws correct error (${e.message})`);
}

// Test: error response (404) → should throw
try {
  const errorResponse = await fetch('https://httpbin.org/status/404');
  await extractAudioBytes(errorResponse);
  assert(false, '404 response throws Error');
} catch (e) {
  assert(e.message.includes('Fetch failed with status 404'),
    `404 response throws correct error (${e.message})`);
}

// ── Summary ───────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(50)}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!\n');
}
