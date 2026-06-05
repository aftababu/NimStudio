import http from 'http';

const req = http.request('http://localhost:3001/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  res.on('data', (chunk) => process.stdout.write(chunk.toString()));
});

req.write(JSON.stringify({
  userMessage: "What is 2+2?",
  projectId: "default"
}));
req.end();
