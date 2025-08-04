// index.js - The corrected backend server for Render

const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Allow the server to read JSON bodies

// This single route will catch all requests and forward them to Square
app.all('/api/*', async (req, res) => {
  const squareApiPath = req.path.replace('/api', ''); // Get the path (e.g., /v2/customers/search)
  const accessToken = req.headers['x-square-access-token'];

  if (!accessToken) {
    return res.status(401).json({ error: 'Square Access Token is missing.' });
  }

  try {
    // FIX: Construct a URL object to correctly handle and forward query parameters (like the cursor for pagination).
    const squareApiUrl = new URL(`https://connect.squareup.com${squareApiPath}`);
    squareApiUrl.search = new URLSearchParams(req.query).toString();

    const squareResponse = await fetch(squareApiUrl.toString(), {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-07-22',
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });

    const data = await squareResponse.json();

    if (!squareResponse.ok) {
      return res.status(squareResponse.status).json(data);
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("Error proxying to Square:", error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
