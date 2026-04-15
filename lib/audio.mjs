/**
 * Audio extraction utilities.
 * Pure functions that work in both Node.js and Cloudflare Workers.
 */

/**
 * Validate an HTTP response contains audio content and extract it as ArrayBuffer.
 *
 * @param {Response} response - fetch Response object
 * @returns {Promise<ArrayBuffer>} audio data
 * @throws {Error} if response is not ok or content-type is not audio
 */
export async function extractAudioBytes(response) {
  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
    throw new Error(`Expected audio content but got content-type: ${contentType}`);
  }

  return response.arrayBuffer();
}
