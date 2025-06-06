require('dotenv').config();
const { Pool } = require('pg');
const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
const { matchGenderAge } = require('../data/genderRules');

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false,
});

// Récupération brute des produits depuis la base
async function fetchSportDecouverteRawProducts() {
  try {
    const result = await pool.query('SELECT * FROM sportdecouverte_products');
    console.log(`[SportDécouverte] ${result.rows.length} produits chargés depuis la base`);
    return result.rows;
  } catch (err) {
    console.error("[SportDécouverte] Erreur lors de la requête SQL :", err.message);
    return [];
  }
}

// Application des règles métier sur les produits
function applySportDecouverteBusinessRules(products, data) {
  const interest = (data.interests?.[0] || "").toLowerCase();
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const gender = data.gender || null;
  const maxBudget = data.budget || 99999;
  const minBudget = data.minBudget || 0;
  const profileKeywords = ADVANCED_KEYWORDS[interest] || [];

  return products
    .map(p => {
      const title = (p.title || "").toLowerCase();
      const price = parseFloat(p.price) || 0;

      if (price < minBudget || price > maxBudget) return null;
      if (!matchGenderAge(title, gender)) return null;
      if (excluded.some(e => title.includes(e))) return null;

      let score = scoringConfig.BASE_SCORE;

      const foundKeywords = profileKeywords.filter(k => title.includes(k));
      if (foundKeywords.length >= 2) {
        score += scoringConfig.ADVANCED_MATCH_BONUS;
      }

      return {
        title: p.title,
        price,
        image: p.image_url,
        link: p.product_link,
        merchant: "Sport Découverte",
        matchingScore: score,
        source: "sportdecouverte"
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchingScore - a.matchingScore);
}

// Fonction principale appelée depuis le routeur
async function searchSportDecouverteProducts(data) {
  try {
    const raw = await fetchSportDecouverteRawProducts();
    const filtered = applySportDecouverteBusinessRules(raw, data);
    return filtered;
  } catch (err) {
    console.error("[SportDécouverte] Erreur dans searchSportDecouverteProducts :", err.message);
    return [];
  }
}

module.exports = {
  searchSportDecouverteProducts
};
