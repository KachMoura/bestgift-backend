require('dotenv').config();
const { Pool } = require('pg');

// Connexion à PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false,
});

// 🔹 Récupérer tous les produits
async function getAllProducts() {
  try {
    const result = await pool.query('SELECT * FROM easygift_products');
    console.log(`>>> [catalog-display.service] ${result.rows.length} produits trouvés`);
    return result.rows;
  } catch (err) {
    console.error(">>> [catalog-display.service] Erreur (getAllProducts) :", err.message);
    return [];
  }
}

// 🔹 Récupérer un produit par ID
async function getProductById(id) {
  try {
    const result = await pool.query('SELECT * FROM easygift_products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      console.warn(`>>> [catalog-display.service] Aucun produit trouvé avec l'ID : ${id}`);
      return null;
    }
    console.log(`>>> [catalog-display.service] Produit #${id} trouvé`);
    return result.rows[0];
  } catch (err) {
    console.error(">>> [catalog-display.service] Erreur (getProductById) :", err.message);
    return null;
  }
}

module.exports = {
  getAllProducts,
  getProductById
};