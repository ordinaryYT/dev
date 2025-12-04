const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const CF_TOKEN = process.env.CF_API_TOKEN;
const CF_ZONE_ID = process.env.CF_ZONE_ID;

app.post('/api/register', async (req, res) => {
  let { subdomain, target } = req.body;

  subdomain = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  if (!subdomain || subdomain.length > 40) return res.json({ error: "Invalid subdomain name" });

  target = target.replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
  if (!target) return res.json({ error: "Enter a valid target URL" });

  try {
    const resp = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: "CNAME",
        name: `${subdomain}.ogdev`,
        content: target,
        ttl: 300,
        proxied: true
      })
    });

    const data = await resp.json();
    if (data.success) {
      res.json({ success: true, url: `https://${subdomain}.ogdev.qzz.io` });
    } else {
      res.json({ error: data.errors?.[0]?.message || "Cloudflare error" });
    }
  } catch (e) {
    res.json({ error: "Server error" });
  }
});

app.get('*', (req, res) => res.sendFile(__dirname + '/index.html'));
app.listen(process.env.PORT || 3000, () => console.log('ogdev.domains running'));
