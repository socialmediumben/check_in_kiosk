// index.js - The final backend server for Render

const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Allow the server to read JSON bodies

// This single route will catch all requests and forward them to Square
app.all('/api/*', async (req, res) => {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Square Access Token is not configured on the server.");
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const squareApiPath = req.path.replace('/api', '');
    const squareApiUrl = new URL(`https://connect.squareup.com${squareApiPath}`);
    squareApiUrl.search = new URLSearchParams(req.query).toString();
    
    console.log('Incoming API Request Body:', req.body);

    // NEW: Define the request body for forwarding.
    // It will be an empty object for GET requests or a populated object for others.
    let requestBody = undefined;
    if (req.method !== 'GET' && Object.keys(req.body).length > 0) {
        // Explicitly stringify the body to ensure it's sent correctly
        requestBody = JSON.stringify(req.body);
    }
    
    // NEW: Log the final request body that is being sent to the Square API
    console.log('Forwarding Request Body to Square:', requestBody);

    const squareResponse = await fetch(squareApiUrl.toString(), {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-07-22',
        'Content-Type': 'application/json',
      },
      body: requestBody, // Use the new, explicitly stringified body
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
