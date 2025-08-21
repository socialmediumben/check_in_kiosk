// index.js - The final backend server for Render using Axios

const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Use axios for a more reliable HTTP client

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// This single route will catch all requests and forward them to Square
app.all('/api/*', async (req, res) => {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Square Access Token is not configured on the server.");
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const squareApiPath = req.path.replace('/api', '');
    const squareApiUrl = `https://connect.squareup.com${squareApiPath}`;
    
    // Log the incoming request body from the front-end
    console.log('Incoming API Request Body:', req.body);
    
    // Prepare the request body for axios
    const requestData = req.method !== 'GET' ? req.body : undefined;

    // Use axios to make the request, it handles JSON bodies more reliably
    const squareResponse = await axios({
      method: req.method,
      url: squareApiUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-07-22',
        'Content-Type': 'application/json',
      },
      params: req.query, // Pass query parameters if any
      data: requestData, // Pass the request body
    });

    // Log the data received from Square API for debugging
    console.log('Data received from Square:', squareResponse.data);

    res.status(squareResponse.status).json(squareResponse.data);

  } catch (error) {
    console.error("Error proxying to Square:", error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Square API responded with:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from Square API:', error.request);
      res.status(500).json({ error: 'No response from Square API.' });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({ error: 'An internal server error occurred.' });
    }
  }
});

app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
