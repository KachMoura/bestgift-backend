require('dotenv').config();
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false,
});

// Fonction principale de recherche BookVillage
async function searchBookVillageProducts(data) {
  try {
    const interest = (data.interests?.[0] || "").toLowerCase();

    // 🔐 BookVillage ne s’affiche que pour le profil "lecteur"
    if (interest !== "lecteur") {
      console.log(`[BookVillage] Profil "${interest}" non autorisé → aucune suggestion`);
      return [];
    }

    const result = await pool.query("SELECT * FROM bookvillage_categories ORDER BY id");

    const products = result.rows.map(row => ({
      title: row.title || "Titre inconnu",
      price: "—",
      image: row.image_url || "https://via.placeholder.com/150?text=BookVillage",
      link: row.affiliate_link,
      merchant: "bookVillage",
      matchingScore: 100,
      source: "bookvillage"
    }));

    console.log(`[BookVillage] ${products.length} produits chargés`);
    return products;

  } catch (err) {
    console.error("[BookVillage] Erreur SQL :", err.message);
    return [];
  }
}

module.exports = {
  searchBookVillageProducts
};
