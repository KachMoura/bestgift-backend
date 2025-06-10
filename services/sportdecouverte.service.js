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

// Chargement brut des produits
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

// Application des règles de filtrage et de scoring
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
      const description = (p.description || "").toLowerCase();
      const price = parseFloat(p.price) || 0;
      const rating = parseFloat(p.rating) || 0;
      const fullText = `${title} ${description}`;

      // Filtres de base
      if (price < minBudget || price > maxBudget) return null;
      if (!matchGenderAge(title, gender)) return null;
      if (excluded.some(e => title.includes(e))) return null;

      // Scoring initial
      let score = scoringConfig.BASE_SCORE;

      // Mots-clés du profil
      const foundKeywords = profileKeywords.filter(k => fullText.includes(k));
      if (foundKeywords.length >= 5) {
        score += scoringConfig.ADVANCED_MATCH_BONUS;
      }

      // Bonus note
      if (rating >= 4) {
        score += scoringConfig.RATING_BONUS;
      }

      // Bonus promotion
      if (p.is_promo === true) {
        score += scoringConfig.PROMO_BONUS;
        if (preferences.includes("promo")) {
          score += scoringConfig.PREFERENCE_EXTRA_BONUS;
        }
      }

      // Livraison rapide
      const fastDelivery = (p.delivery_days_national && p.delivery_days_national < 3) ||
                           (p.delivery_days_international && p.delivery_days_international < 7);
      if (fastDelivery) {
        score += scoringConfig.FAST_DELIVERY_BONUS;
        if (preferences.includes("fast_delivery")) {
          score += scoringConfig.PREFERENCE_EXTRA_BONUS;
        }
      }

      // Compacité
      const weight = parseFloat(p.product_weight_kg) || 0;
      const h = parseFloat(p.product_height_cm) || 0;
      const w = parseFloat(p.product_width_cm) || 0;
      const d = parseFloat(p.product_depth_cm) || 0;
      const isCompact = weight <= 5 && h <= 50 && w <= 50 && d <= 50;
      if (isCompact) {
        score += scoringConfig.UNIVERSAL_SIZE_BONUS;
        if (preferences.includes("compact")) {
          score += scoringConfig.PREFERENCE_EXTRA_BONUS;
        }
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

// Fonction principale avec filtrage sur le profil
async function searchSportDecouverteProducts(data) {
  try {
    const allowedProfiles = ["sport", "game", "voyageur"];
    const interest = (data.interests?.[0] || "").toLowerCase();

    if (!allowedProfiles.includes(interest)) {
      console.log(`[SportDécouverte] Profil "${interest}" non autorisé → aucune suggestion`);
      return [];
    }

    const raw = await fetchSportDecouverteRawProducts();
    const filtered = applySportDecouverteBusinessRules(raw, data);
    console.log(`[SportDécouverte] ${filtered.length} produits retenus après filtrage`);
    return filtered;
  } catch (err) {
    console.error("[SportDécouverte] Erreur dans searchSportDecouverteProducts :", err.message);
    return [];
  }
}

module.exports = {
  searchSportDecouverteProducts
};
