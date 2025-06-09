require('dotenv').config();
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false,
});

async function searchBookVillageProducts(data) {
  const interest = (data.interests?.[0] || "").toLowerCase();
  console.log("[BookVillage] Profil reçu :", interest);

  if (interest !== "book") {
    console.log("[BookVillage] Profil ≠ lecteur → on retourne un tableau vide");
    return [];
  }

  try {
    console.log("[BookVillage] Connexion à la base en cours...");
    const result = await pool.query("SELECT * FROM bookvillage_categories ORDER BY id");
    console.log(`[BookVillage] ${result.rows.length} lignes trouvées en base`);

    const products = result.rows.map(row => ({
      title: row.title || "Titre inconnu",
      price: "A partir de 1.49",
      image: row.image_url || "https://via.placeholder.com/150?text=BookVillage",
      link: row.affiliate_link,
      merchant: "BookVillage",
      matchingScore: 80,
      source: "BookVillage"
    }));

    console.log("[BookVillage] Produits formatés :", products);
    return products;

  } catch (err) {
    console.error("[BookVillage] Erreur SQL :", err.message);
    return [];
  }
}

module.exports = {
  searchBookVillageProducts
};
