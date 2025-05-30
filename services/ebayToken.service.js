require('dotenv').config();
const { Pool } = require('pg');
const fetch = require('node-fetch');

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false
});

// 🔁 Récupère le token s’il est encore valide
async function getValidToken() {
  const { rows } = await pool.query(`
    SELECT access_token, expires_at
    FROM ebay_tokens
    ORDER BY created_at DESC
    LIMIT 1
  `);
  const token = rows[0];
  if (token && new Date(token.expires_at) > new Date()) {
    console.log(">>> [eBayToken] Token valide récupéré depuis la base.");
    return token.access_token;
  }
  return await refreshToken();
}

// 🔄 Régénère un nouveau token
async function refreshToken() {
  const credentials = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope"
  });

  // 🔴 Gestion des erreurs HTTP
  if (!res.ok) {
    const errorText = await res.text();
    console.error(">>> [eBayToken] Erreur HTTP eBay :", res.status, errorText);
    throw new Error("Échec de la récupération du token eBay.");
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("Erreur : Impossible de récupérer le token eBay.");
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await pool.query(`
    INSERT INTO ebay_tokens (access_token, expires_at)
    VALUES ($1, $2)
  `, [data.access_token, expiresAt]);

  console.log(">>> [eBayToken] Nouveau token eBay inséré avec succès.");
  return data.access_token;
}

module.exports = { getValidToken };
