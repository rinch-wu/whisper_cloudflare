/**
 * Test the deployed /fetch-transcribe endpoint.
 * Run: node test-endpoint.mjs
 *
 * Uses the Bilibili URL and headers from test-fetch.mjs
 */

const BASE_URL = 'https://whisper-cloudflare.rinch-wu.workers.dev';

const BILIBILI_URL = 'https://upos-hz-mirrorakam.akamaized.net/upgcxcode/83/83/37325308383/37325308383-1-30280.m4s?e=ig8euxZM2rNcNbdlhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&trid=c6d03d72411f41f08921b0340c08873u&mid=0&oi=2063727985&uipk=5&platform=pc&deadline=1776226158&nbs=1&gen=playurlv3&os=akam&og=cos&upsig=9d9287b142291795f09476f18d44d6df&uparams=e,trid,mid,oi,uipk,platform,deadline,nbs,gen,os,og&hdnts=exp=1776226158~hmac=e95b837fdb52b729ca6adfb458f75f02b2401783211152c493a7f2a6de5bccb9&bvc=vod&nettype=0&bw=115713&qn_dyeid=60489ff385bb59c30072d85169def34e&agrr=0&buvid=616C3224-0DBA-1B42-96E2-C32B3AAFB20358217infoc&build=0&dl=0&f=u_0_0&orderid=0,2&codecexp1=server_side_enhancement2.0';

const BILIBILI_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  'Referer': 'https://www.bilibili.com/video/BV1KGDzBLExG'
};

console.log('\n🧪 Testing /fetch-transcribe endpoint\n');
console.log(`  Service: ${BASE_URL}`);
console.log(`  Video URL: ${BILIBILI_URL.substring(0, 80)}...`);

const body = {
  request: {
    url: BILIBILI_URL,
    method: 'GET',
    headers: BILIBILI_HEADERS
  },
  whisper: {
    task: 'transcribe',
    vad_filter: true
  }
};

console.log(`\n  Request body: ${JSON.stringify(body, null, 2).substring(0, 300)}...\n`);

const startTime = Date.now();

try {
  console.log('  ⏳ Sending request... (this may take a while for audio transcription)\n');

  const res = await fetch(`${BASE_URL}/fetch-transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`  Response status: ${res.status} ${res.statusText}`);
  console.log(`  Content-Type: ${res.headers.get('content-type')}`);
  console.log(`  Elapsed: ${elapsed}s\n`);

  const text = await res.text();

  if (res.ok) {
    const data = JSON.parse(text);
    console.log('  ✅ Transcription result:\n');
    console.log(`  text: "${data.text?.substring(0, 500) || '(empty)'}"`);
    console.log(`  segments: ${data.segments?.length || 0} segment(s)`);
    if (data.segments && data.segments.length > 0) {
      console.log('\n  First segment:');
      const seg = data.segments[0];
      console.log(`    start: ${seg.start}s, end: ${seg.end}s`);
      console.log(`    text: "${seg.text?.substring(0, 200)}"`);
    }
    console.log('\n🎉 Endpoint works!\n');
  } else {
    console.log(`  ❌ Error response:\n`);
    try {
      const errData = JSON.parse(text);
      console.log(`  ${JSON.stringify(errData, null, 2)}`);
    } catch {
      console.log(`  ${text}`);
    }
    process.exit(1);
  }
} catch (e) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ❌ Request failed after ${elapsed}s: ${e.message}`);
  process.exit(1);
}
