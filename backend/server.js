// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const https = require('https'); // <-- Stays the same
const fs = require('fs'); // <-- Stays the same
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Database Connection ---
const uri = process.env.MONGO_URI;
mongoose.connect(uri)
  .then(() => {
    console.log('MongoDB connection established successfully! 🚀');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
// ----------------------------

// --- API ROUTES ---
const productRouter = require('./routes/products');
app.use('/api/products', productRouter);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the backend! 👋' });
});
// ------------------

// --- 3. Define path to our new local SSL certificate --- (THIS IS THE UPDATED PART)
const httpsOptions = {
  key: fs.readFileSync('./certs/cert.key'),
  cert: fs.readFileSync('./certs/cert.pem')
};
// ------------------------------------------

// Start the server
const PORT = 5001;

// --- 4. Start an HTTPS server instead of an HTTP one ---
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`SECURE server is running on https://localhost:${PORT}`);
});