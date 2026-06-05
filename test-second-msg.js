import http from 'http';

const req = http.request('http://localhost:3001/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  res.on('data', (chunk) => process.stdout.write(chunk.toString()));
});

req.write(JSON.stringify({
  userMessage: "And what is 3+3?",
  conversationId: "46d2e3cb-c425-430f-b78b-3f09a2ded85e",
  projectId: "default"
}));
req.end();
