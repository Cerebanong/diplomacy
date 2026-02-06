const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'verify_split.html');
  const content = fs.readFileSync(filePath, 'utf8');
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(content);
});

server.listen(8768, () => {
  console.log('Server running at http://localhost:8768/');
});
