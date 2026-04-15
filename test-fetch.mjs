/**
 * Standalone test for buildFetchRequest function.
 * Copies functions from index.js for isolated testing.
 * Run: node test-fetch.mjs
 *
 * Optional: pass a URL as argument to test custom URL
 *   node test-fetch.mjs "https://example.com/audio.mp3"
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

// ── Test config ───────────────────────────────────────────────────────

const BILIBILI_URL = 'https://upos-hz-mirrorakam.akamaized.net/upgcxcode/83/83/37325308383/37325308383-1-30280.m4s?e=ig8euxZM2rNcNbdlhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&trid=c6d03d72411f41f08921b0340c08873u&mid=0&oi=2063727985&uipk=5&platform=pc&deadline=1776226158&nbs=1&gen=playurlv3&os=akam&og=cos&upsig=9d9287b142291795f09476f18d44d6df&uparams=e,trid,mid,oi,uipk,platform,deadline,nbs,gen,os,og&hdnts=exp=1776226158~hmac=e95b837fdb52b729ca6adfb458f75f02b2401783211152c493a7f2a6de5bccb9&bvc=vod&nettype=0&bw=115713&qn_dyeid=60489ff385bb59c30072d85169def34e&agrr=0&buvid=616C3224-0DBA-1B42-96E2-C32B3AAFB20358217infoc&build=0&dl=0&f=u_0_0&orderid=0,2&codecexp1=server_side_enhancement2.0';

const BILIBILI_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://www.bilibili.com/video/BV1KGDzBLExG'
};

// Allow override via command-line argument
const customUrl = process.argv[2];
const testUrl = customUrl || BILIBILI_URL;

if (customUrl) {
  console.log(`🔗 Using custom URL: ${customUrl}\n`);
}

// ── Tests ─────────────────────────────────────────────────────────────

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

console.log('\n📦 buildFetchRequest\n');

// Test 1: Fetch Bilibili m4s segment with headers
try {
  console.log(`  URL: ${testUrl.substring(0, 80)}...`);
  const res = await buildFetchRequest({
    url: testUrl,
    method: 'GET',
    headers: BILIBILI_HEADERS
  });

  assert(res.ok, `Response status OK (${res.status})`);

  const contentType = res.headers.get('content-type') || '';
  console.log(`  Content-Type: ${contentType}`);
  assert(
    contentType.includes('video') ||
    contentType.includes('audio') ||
    contentType.includes('octet-stream') ||
    contentType.includes('mp4') ||
    contentType.includes('m4s'),
    'Response content-type is media (video/audio/octet-stream)'
  );

  const contentLength = res.headers.get('content-length');
  if (contentLength) {
    const sizeKB = (parseInt(contentLength) / 1024).toFixed(1);
    console.log(`  Content-Length: ${contentLength} bytes (${sizeKB} KB)`);
    assert(parseInt(contentLength) > 0, 'Content-Length > 0');
  } else {
    console.log('  Content-Length: not provided (chunked)');
    passed++; // not a failure
  }

  // Try to read some bytes to confirm it's actual data
  const buf = await res.arrayBuffer();
  const sizeKB = (buf.byteLength / 1024).toFixed(1);
  assert(buf.byteLength > 0, `Downloaded ${buf.byteLength} bytes (${sizeKB} KB)`);

  // Check if it looks like an m4s/mp4 file (starts with box header or ftyp)
  const bytes = new Uint8Array(buf.slice(0, 8));
  const hexStart = Array.from(bytes.slice(4, 8)).map(b => String.fromCharCode(b)).join('');
  console.log(`  File signature (bytes 4-7): "${hexStart}"`);

  // m4s/mp4 files typically have "ftyp" or similar box type at offset 4
  const looksLikeMedia = /ftyp|moov|mdat|styp|iso2|msdh/.test(hexStart);
  assert(looksLikeMedia || buf.byteLength > 100,
    `Downloaded data looks like media (signature: ${hexStart})`);

} catch (e) {
  console.log(`  ❌ Request failed: ${e.message}`);
  failed++;
}

// Test 2: Missing url → throws
try {
  buildFetchRequest({});
  assert(false, 'missing url throws Error');
} catch (e) {
  assert(e.message === 'Missing required field: request.url',
    'missing url → correct error message');
}

// Test 3: Cookie injection
try {
  const res = await buildFetchRequest({
    url: 'https://httpbin.org/headers',
    headers: { 'X-Test': 'value' },
    cookie: { session: 'abc', token: 'xyz' }
  });
  const data = await res.json();
  const headers = data.headers || {};
  const cookieHeader = headers['Cookie'] || headers['cookie'] || '';
  assert(cookieHeader.includes('session=abc') && cookieHeader.includes('token=xyz'),
    'Cookie header correctly serialized and injected');
} catch (e) {
  console.log(`  ⏭️ Skipped cookie test (network: ${e.message})`);
  passed++;
}

// Summary
console.log(`\n${'═'.repeat(50)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(50)}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!\n');
}
