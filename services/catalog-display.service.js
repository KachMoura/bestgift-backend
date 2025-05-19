require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false,
});

// Récupérer tous les produits (brut)
async function getAllProducts() {
  try {
    const result = await pool.query('SELECT * FROM easygift_products');
    console.log(`>>> [catalog-display.service] ${result.rows.length} produits trouvés`);
    return result.rows;
  } catch (err) {
    console.error(">>> [catalog-display.service] Erreur :", err.message);
    return [];
  }
}

module.exports = { getAllProducts };