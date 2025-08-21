// index.js - The final backend server for Render with dedicated endpoints

const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SQUARE_API_BASE_URL = 'https://connect.squareup.com/v2';

// --- Helper function to forward requests ---
const proxyToSquare = async (req, res, endpoint) => {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Square Access Token is not configured on the server.");
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const squareApiUrl = `${SQUARE_API_BASE_URL}${endpoint}`;
    
    console.log(`Forwarding request to: ${squareApiUrl}`);
    console.log('Incoming API Request Body:', req.body);
    
    // Create the body based on the incoming request.
    const requestBody = req.method !== 'GET' && Object.keys(req.body).length > 0
      ? JSON.stringify(req.body)
      : undefined;

    console.log('Forwarding Request Body to Square:', requestBody);

    const squareResponse = await fetch(squareApiUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-07-22',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: requestBody,
    });

    const data = await squareResponse.json();

    if (!squareResponse.ok) {
      console.error('API Error Response:', data);
      return res.status(squareResponse.status).json(data);
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("Error proxying to Square:", error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

// --- Dedicated Proxy Endpoints ---

// Endpoint for fetching location data
app.get('/api/locations', (req, res) => {
    proxyToSquare(req, res, '/locations');
});

// Endpoint for searching the catalog
app.post('/api/catalog/search', (req, res) => {
    proxyToSquare(req, res, '/catalog/search');
});

// Endpoint for searching orders
app.post('/api/orders/search', (req, res) => {
    proxyToSquare(req, res, '/orders/search');
});

// Endpoint for getting a single customer
app.get('/api/customers/:id', (req, res) => {
    const customerId = req.params.id;
    proxyToSquare(req, res, `/customers/${customerId}`);
});

app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
