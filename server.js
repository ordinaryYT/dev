require('dotenv').config();
const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Create subdomain with custom target
app.post('/api/create', async (req, res) => {
  let { name, target } = req.body;

  name = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  target = target.trim().replace(/https?:\/\//g, '').replace(/\/+$/, '');

  if (!name || name.length > 40) return res.status(400).json({ error: "Invalid subdomain name" });
  if (!target || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(target)) {
    return res.status(400).json({ error: "Invalid target domain" });
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
          content: target,
          ttl: 300,
          proxied: true
        })
      }
    );

    const data = await response.json();

    if (data.success || data.errors?.[0]?.code === 81057) { // 81057 = already exists
      res.json({ success: true, domain: fullDomain, target });
    } else {
      const msg = data.errors?.[0]?.message || "Failed";
      res.status(400).json({ error: msg });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`OGDEV Custom CNAME LIVE`);
  console.log(`http://localhost:${PORT}`);
});
