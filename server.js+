const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// CLOUDflare CONFIG from environment variables
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const DOMAIN = process.env.DOMAIN || "ogdev.qzz.io"; // default domain

app.use(bodyParser.json());
app.use(express.static("."));

app.post("/create", async (req, res) => {
    const { subdomain, target } = req.body;

    // Simple validation
    if (!subdomain || !target) return res.json({ message: "Invalid input" });
    if (!/^[a-z0-9-]+$/i.test(subdomain)) return res.json({ message: "Invalid subdomain format" });

    const recordName = `${subdomain}.${DOMAIN}`;

    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`,
            {
                type: "CNAME",
                name: recordName,
                content: target,
                ttl: 1,
                proxied: false
            },
            {
                headers: {
                    "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (response.data.success) {
            res.json({ message: `Subdomain created: ${recordName} → ${target}` });
        } else {
            res.json({ message: "Error creating subdomain", details: response.data.errors });
        }
    } catch (err) {
        res.json({ message: "Cloudflare API error", error: err.response?.data || err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
