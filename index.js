const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const getNeonAuth = () => {
    const orgId = process.env.NEON_ORG_ID;
    const apiKey = process.env.NEON_API_KEY;
    return Buffer.from(`${orgId}:${apiKey}`).toString('base64');
};

app.use('/buddies', express.static(path.join(__dirname, 'buddies')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const SANDBOX_MEMBER_RECORD = {
    individualAccount: {
        accountId: "sandbox-demo",
        accountCurrentMembershipStatus: "Active",
        membershipStatus: "Active",
        membershipName: "Community Pro Maker",
        primaryContact: {
            firstName: "Jordan",
            lastName: "Taylor",
            preferredName: "Jordan",
            email1: "jordan.taylor@demo-partner.com",
            phone1: "(555) 234-5678",
            gender: { code: "NB", description: "They/Them" }
        },
        accountCustomFields: [
            { id: "114", name: "Tap Card", value: "DEMO-2026" },
            { id: "116", name: "Certifications", value: ["Laser Cutter (CO2 80W)", "3D Printing (FDM / Bambu Lab)", "Woodshop Safety & Table Saw", "Electronics & Soldering Bench", "Vinyl Cutter & Heat Press"] },
            { id: "117", name: "Portal Media", value: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80" },
            { id: "119", name: "Store Balance", value: "25.00" },
            { id: "120", name: "Buddy Avatar", value: "{\"bodyColor\":\"#3bc0cd\",\"eyeStyle\":\"happy\",\"mouthStyle\":\"smile\",\"clothes\":\"apron\",\"hat\":\"goggles\",\"shoes\":\"sneakers\",\"accessory\":\"wrench\"}" },
            { id: "121", name: "Buddy Bucks", value: "175" },
            { id: "122", name: "XP", value: "420" },
            { id: "123", name: "Board Member", value: "true" },
            { id: "125", name: "Volunteer Hours", value: "25.0" }
        ]
    }
};

function isSandboxRequest(str) {
    if (!str) return false;
    const clean = String(str).toLowerCase();
    return clean.includes('demo') || clean.includes('sandbox') || clean.includes('test') || clean.includes('5552345678') || clean.includes('555-234-5678');
}

app.all('/api/*', async (req, res) => {
    try {
        const neonPath = req.path.replace('/api', '');

        // Intercept search for Sandbox Demo Account
        if (neonPath === '/v2/accounts/search') {
            const bodyStr = JSON.stringify(req.body || {});
            if (isSandboxRequest(bodyStr)) {
                return res.json({
                    pagination: { totalResults: 1, currentPage: 0, totalPages: 1 },
                    searchResults: [
                        {
                            "Account ID": "sandbox-demo",
                            "First Name": "Jordan",
                            "Last Name": "Taylor",
                            "Preferred Name": "Jordan",
                            "Email 1": "jordan.taylor@demo-partner.com",
                            "Phone 1": "(555) 234-5678",
                            "Membership Status": "Active",
                            "Membership Tier": "Community Pro Maker"
                        }
                    ]
                });
            }
        }

        // Intercept account fetch for Sandbox Demo Account
        if (neonPath.startsWith('/v2/accounts/')) {
            const targetId = neonPath.replace('/v2/accounts/', '').split('/')[0].split('?')[0];
            if (isSandboxRequest(targetId)) {
                if (neonPath.includes('/eventRegistrations')) {
                    return res.json({
                        eventRegistrations: [
                            { eventId: "demo-workshop", eventName: "Makerspace Orientation & Tour" }
                        ]
                    });
                }
                if (['PATCH', 'PUT'].includes(req.method)) {
                    return res.json({ accountId: "sandbox-demo", success: true });
                }
                return res.json(SANDBOX_MEMBER_RECORD);
            }
        }

        // Intercept activity check-in creation
        if (neonPath === '/v2/activities' && req.method === 'POST') {
            const actBodyStr = JSON.stringify(req.body || {});
            if (isSandboxRequest(actBodyStr)) {
                return res.json({ activityId: "sandbox-demo-activity", success: true });
            }
        }

        const url = `https://api.neoncrm.com${neonPath}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
        
        const fetchOptions = {
            method: req.method,
            headers: { 
                'Authorization': `Basic ${getNeonAuth()}`, 
                'Content-Type': 'application/json' 
            }
        };

        if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error("Proxy Error:", error.message);
        res.status(500).json({ error: 'Neon API Connection Failed' });
    }
});

app.listen(port, () => console.log(`Kiosk Proxy active on port ${port}`));
