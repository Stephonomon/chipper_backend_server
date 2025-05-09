// server.js
// A simple Node.js Express backend to proxy FHIR requests and handle CORS.

const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Using axios for making HTTP requests

const app = express();
const PORT = process.env.PORT || 3001; // Port for the backend server

// --- CORS Configuration ---
// Configure CORS to allow requests from your frontend
const corsOptions = {
    // Add your Netlify URL here. Keep localhost for local dev.
    origin: [
        'http://localhost:5173', // For local frontend development
        'https://snpvite.netlify.app/' // REPLACE with your actual Netlify app URL
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, 
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json());

// --- FHIR Proxy Endpoint ---
app.all(/^\/api\/fhir-proxy\/(.*)/, async (req, res) => {
    const targetFhirServer = req.query.targetFhirServer;
    const actualFhirPath = req.params[0]; 
    const method = req.method;
    const headers = {};

    if (!targetFhirServer) {
        return res.status(400).json({ error: 'targetFhirServer query parameter is required.' });
    }

    if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
    }
    if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'];
    }
    headers['Accept'] = req.headers['accept'] || 'application/fhir+json';

    const fullTargetUrl = `${targetFhirServer}/${actualFhirPath}`;
    console.log(`Proxying request: ${method} ${fullTargetUrl}`);
    console.log(`Request query params:`, req.query);

    try {
        const response = await axios({
            method: method,
            url: fullTargetUrl,
            headers: headers,
            data: req.body,
            params: (({ targetFhirServer, ...rest }) => rest)(req.query),
        });
        res.status(response.status).set(response.headers).send(response.data);
    } catch (error) {
        console.error('Error proxying request to FHIR server:', error.message);
        if (error.response) {
            console.error('FHIR server error status:', error.response.status);
            console.error('FHIR server error data:', error.response.data);
            res.status(error.response.status).set(error.response.headers).send(error.response.data);
        } else {
            res.status(500).json({ error: 'Failed to proxy request to FHIR server.', details: error.message });
        }
    }
});

// --- Root Endpoint (Optional) ---
app.get('/', (req, res) => {
    res.send('Epic FHIR Backend Proxy is running!');
});

// --- Start the server ---
app.listen(PORT, () => {
    console.log(`Backend proxy server listening on port ${PORT}`);
});

/*
To run this backend:
1. Save as server.js
2. Install dependencies: npm install express cors axios
3. Run: node server.js
*/
