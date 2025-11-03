// generate-certs.js
const selfsigned = require('selfsigned');
const fs = require('fs');

console.log('Generating self-signed certificates...');

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

if (!fs.existsSync('./certs')) {
  fs.mkdirSync('./certs');
}

fs.writeFileSync('./certs/cert.key', pems.private, { encoding: 'utf-8' });
fs.writeFileSync('./certs/cert.pem', pems.cert, { encoding: 'utf-8' });

console.log('Certificates generated successfully in ./certs folder!');