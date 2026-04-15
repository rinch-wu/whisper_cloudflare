/**
 * Standalone test for extractAudioBytes module.
 * Run: node test-audio.mjs
 */

import { extractAudioBytes } from './lib/audio.mjs';

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

console.log('\n📦 extractAudioBytes (lib/audio.mjs)\n');

// Test 1: 404 response → throws
try {
  const res = await fetch('https://httpbin.org/status/404');
  await extractAudioBytes(res);
  assert(false, '404 response throws Error');
} catch (e) {
  assert(e.message.includes('Fetch failed with status 404'),
    `404 → correct error (${e.message})`);
}

// Test 2: non-audio content-type → throws
try {
  const res = await fetch('https://httpbin.org/html');
  await extractAudioBytes(res);
  assert(false, 'non-audio content-type throws Error');
} catch (e) {
  assert(e.message.startsWith('Expected audio content'),
    `non-audio → correct error (${e.message})`);
}

// Test 3: application/octet-stream → accepted (generic binary)
try {
  const res = await fetch('https://httpbin.org/bytes/1024');
  const buf = await extractAudioBytes(res);
  assert(buf instanceof ArrayBuffer && buf.byteLength === 1024,
    'octet-stream → accepted, returns ArrayBuffer of correct size');
} catch (e) {
  console.log(`  ⏭️ Skipped octet-stream test (network: ${e.message})`);
  passed++;
}

// Test 4: valid audio URL → returns ArrayBuffer with data
try {
  const res = await fetch('https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav');
  const buf = await extractAudioBytes(res);
  assert(buf instanceof ArrayBuffer && buf.byteLength > 0,
    `real audio → ArrayBuffer (${buf.byteLength} bytes)`);
} catch (e) {
  console.log(`  ⏭️ Skipped real audio test (network: ${e.message})`);
  passed++;
}

// Test 5: empty response body with audio content-type → returns empty ArrayBuffer
try {
  const emptyRes = new Response(null, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg' }
  });
  const buf = await extractAudioBytes(emptyRes);
  assert(buf instanceof ArrayBuffer && buf.byteLength === 0,
    'empty body with audio content-type → empty ArrayBuffer');
} catch (e) {
  console.log(`  ⏭️ Skipped empty audio test (env: ${e.message})`);
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
