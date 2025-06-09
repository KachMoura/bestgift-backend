const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function searchBookVillageProducts(data) {
  // N’affiche les produits que si le profil est "lecteur"
  if (!data.interests?.includes("lecteur")) return [];

  const { rows } = await pool.query("SELECT * FROM bookvillage_categories ORDER BY id");
  return rows.map(row => ({
    title: row.title,
    image: row.image_url,
    link: row.affiliate_link,
    price: "—",
    matchingScore: 100,
    source: "bookvillage"
  }));
}

module.exports = { searchBookVillageProducts };