// netlify/functions/square-proxy.js

exports.handler = async function (event, context) {
  // This function acts as a secure proxy to the Square API.

  // Get the real Square API URL from the request path.
  // e.g., if the app calls '/api/v2/customers/search', this extracts that part.
  const squareApiUrl = event.path.replace('/.netlify/functions/square-proxy', '');

  // Get the headers and body from the original request.
  const { httpMethod, headers, body } = event;

  // The access token is sent in the 'x-square-access-token' header from the frontend.
  const accessToken = headers['x-square-access-token'];

  if (!accessToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Square Access Token is missing.' }),
    };
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://connect.squareup.com${squareApiUrl}`, {
      method: httpMethod,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json',
      },
      body: httpMethod === 'POST' ? body : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      // Pass the error from Square back to the frontend.
      return {
        statusCode: response.status,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal server error occurred.' }),
    };
  }
};
