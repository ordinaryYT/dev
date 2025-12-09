require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Create sites folder
const SITES_DIR = path.join(__dirname, 'sites');
if (!fs.existsSync(SITES_DIR)) fs.mkdirSync(SITES_DIR);

app.use(express.json());
app.use('/sites', express.static(SITES_DIR)); // ← This serves user content

// Serve main page
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Create subdomain + DNS record
app.post('/api/create', async (req, res) => {
  let { name } = req.body;
  name = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (!name || name.length > 30) {
    return res.status(400).json({ error: "Invalid name (1–30 chars, letters/numbers/hyphens only)" });
  }

  const fullDomain = `${name}.${process.env.MAIN_DOMAIN}`;
  const sitePath = path.join(SITES_DIR, name);

  // Create default site if folder doesn't exist
  if (!fs.existsSync(sitePath)) {
    fs.mkdirSync(sitePath);
    fs.writeFileSync(path.join(sitePath, 'index.html'), `
      <!DOCTYPE html>
      <html><head><title>${fullDomain}</title>
      <style>body{font-family:system-ui;background:#0f0f23;color:#fff;text-align:center;padding:50px;}
      h1{font-size:4rem;} p{font-size:1.5rem;}</style></head>
      <body><h1>${fullDomain}</h1><p>You're live! Edit this page in your OGDEV dashboard.</p></body>
      </html>
    `);
  }

  // Create CNAME record
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

    if (data.success || data.errors?.[0]?.code === 81057) { // 81057 = already exists
      res.json({ success: true, domain: fullDomain });
    } else {
      res.status(400).json({ error: data.errors?.[0]?.message || "DNS failed" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Upload custom HTML (simple editor)
const upload = multer();
app.post('/api/upload/:name', upload.single('file'), (req, res) => {
  const name = req.params.name.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const sitePath = path.join(SITES_DIR, name);

  if (!fs.existsSync(sitePath)) {
    return res.status(404).json({ error: "Subdomain not found" });
  }

  let html = req.body.html || (req.file ? req.file.buffer.toString() : '');
  if (!html) return res.status(400).json({ error: "No content" });

  fs.writeFileSync(path.join(sitePath, 'index.html'), html);
  res.json({ success: true, domain: `${name}.${process.env.MAIN_DOMAIN}` });
});

app.listen(PORT, () => {
  console.log(`OGDEV 2.0 Running`);
  console.log(`→ http://localhost:${PORT}`);
  console.log(`→ User sites: http://anything.${process.env.MAIN_DOMAIN}`);
});
