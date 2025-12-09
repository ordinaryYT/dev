require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Create subdomain → CNAME pointing to main domain
app.post('/api/create', async (req, res) => {
  let { name } = req.body;
  name = name.trim().toLowerCase();

  if (!name || !/^[a-z0-9-]{1,30}$/.test(name)) {
    return res.status(400).json({ error: "Only letters, numbers, and hyphens (max 30 chars)" });
  }

  const fullDomain = `${name}.${process.env.MAIN_DOMAIN}`;

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: name,
          content: process.env.MAIN_DOMAIN,
          ttl: 300,
          proxied: true
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      res.json({ success: true, domain: fullDomain });
    } else {
      const msg = data.errors?.[0]?.message || "Failed to create subdomain";
      res.status(400).json({ error: msg });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`OGDEV is LIVE`);
  console.log(`http://localhost:${PORT}`);
  console.log(`Subdomains → anything.${process.env.MAIN_DOMAIN}`);
});
