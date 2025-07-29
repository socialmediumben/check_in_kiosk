// index.js - The corrected backend server for Render

const express = require('express');
const cors = require('cors');
// Reverted to the original dynamic import to ensure compatibility with other apps.
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Allow the server to read JSON bodies

// This single route will catch all API requests and forward them to Square
app.all('/api/*', async (req, res) => {
  const squareApiUrl = req.path.replace('/api', ''); // Get the path (e.g., /v2/customers/search)
  const accessToken = req.headers['x-square-access-token'];

  if (!accessToken) {
    return res.status(401).json({ error: 'Square Access Token is missing.' });
  }

  console.log(`[PROXY] Forwarding ${req.method} request to: ${squareApiUrl}`);

  try {
    // Construct the options for the fetch call to the Square API
    const options = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json',
      },
    };

    // This is the crucial part: ensure the body is correctly stringified for POST requests.
    if (req.method !== 'GET' && req.body) {
      options.body = JSON.stringify(req.body);
      console.log('[PROXY] Forwarding Body:', options.body);
    }

    const squareResponse = await fetch(`https://connect.squareup.com${squareApiUrl}`, options);

    // Handle the response carefully to avoid errors with empty bodies
    const responseText = await squareResponse.text();
    const data = responseText ? JSON.parse(responseText) : {};

    // Forward Square's status code and response body to the client
    res.status(squareResponse.status).json(data);

  } catch (error) {
    console.error('[PROXY] An error occurred:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
