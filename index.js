// index.js - The final backend server for Render

const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all routes

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
    
    // Manually read the raw request body as a string
    let requestBody = '';
    await new Promise((resolve, reject) => {
      req.on('data', chunk => {
        requestBody += chunk.toString();
      });
      req.on('end', resolve);
      req.on('error', reject);
    });

    // Parse the JSON string to log the content
    let parsedBody = {};
    if (requestBody) {
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (e) {
        console.error('Failed to parse incoming JSON body:', e);
      }
    }
    console.log('Incoming API Request Body:', parsedBody);
    console.log('Forwarding Request Body to Square:', requestBody);

    // Create the fetch options
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-07-22',
        'Content-Type': 'application/json; charset=utf-8', 
      }
    };
    
    // Conditionally add the raw body string to the options
    if (requestBody) {
        fetchOptions.body = requestBody;
    }

    const squareResponse = await fetch(squareApiUrl.toString(), fetchOptions);
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
