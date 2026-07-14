// Read error-context from previous test run — shows what's on screen
const http = require('http');
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const get = (url) => new Promise((resolve, reject) => {
  const req = http.get(url, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => resolve({ status: res.statusCode, data }));
  });
  req.setTimeout(10000, () => req.destroy(new Error('timeout')));
  req.on('error', reject);
});

(async () => {
  // Check server HTML for any embedded error
  const { data: html } = await get(`${BASE_URL}/`);
  console.log('=== HTML (first 2000 chars) ===');
  console.log(html.substring(0, 2000));
  
  // Try fetching a JS chunk to see if Vite builds without error
  const scriptMatch = html.match(/src="([^"]+\.(?:ts|js|tsx))"/);
  if (scriptMatch) {
    const { status } = await get(BASE_URL + scriptMatch[1]);
    console.log(`\nMain script [${scriptMatch[1]}]: ${status}`);
  }
  
  // Check if Vite error overlay exists (meaning compile error)
  if (html.includes('vite-error-overlay') || html.includes('error-overlay')) {
    console.log('\n❌ VITE ERROR OVERLAY DETECTED — compile/runtime error in browser');
  } else {
    console.log('\n✅ No Vite error overlay — app loaded without compilation error');
  }

  // Check for error boundary
  if (html.includes('error') || html.includes('Error') || html.includes('ErrorBoundary')) {
    console.log('\nNote: Error boundary pattern detected');
  }
})();
