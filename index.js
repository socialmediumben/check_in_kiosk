// index.js - The backend server for Render

const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Allow the server to read JSON bodies

// This single route will catch all requests and forward them to Square
app.all('/api/*', async (req, res) => {
  const squareApiUrl = req.path.replace('/api', ''); // Get the path (e.g., /v2/customers/search)
  const accessToken = req.headers['x-square-access-token'];

  if (!accessToken) {
    return res.status(401).json({ error: 'Square Access Token is missing.' });
  }

  try {
    const squareResponse = await fetch(`https://connect.squareup.com${squareApiUrl}`, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await squareResponse.json();

    if (!squareResponse.ok) {
      return res.status(squareResponse.status).json(data);
    }

    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
