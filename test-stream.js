import http from 'http';

const req = http.request('http://localhost:3001/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  res.on('data', (chunk) => {
    console.log('CHUNK RECEIVED at', Date.now(), '=>', chunk.toString());
  });
  
  res.on('end', () => {
    console.log('END');
  });
});

req.write(JSON.stringify({
  userMessage: "Write a long story about a space traveler. Make it at least 5 paragraphs.",
  projectId: "default"
}));
req.end();
