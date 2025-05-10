const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
require('dotenv').config();
const { Pool } = require('pg');

// Connexion PostgreSQL (Render ou local)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false,
});

// Chargement brut des produits depuis la base
async function fetchEasyGiftRawProducts() {
  try {
    const result = await pool.query('SELECT * FROM easygift_products');
    console.log(`>>> [EasyGiftService] ${result.rows.length} produits récupérés.`);
    return result.rows;
  } catch (error) {
    console.error(">>> [EasyGiftService] Erreur de récupération :", error.message);
    return [];
  }
}

// Normalisation du genre
function normalizeGender(value) {
  const v = (value || "").toLowerCase();
  if (["lui", "homme"].includes(v)) return "lui";
  if (["elle", "femme"].includes(v)) return "elle";
  if (["enfant", "kid"].includes(v)) return "enfant";
  return v;
}

// Application des règles de filtrage et de scoring
function applyEasyGiftBusinessRules(products, data) {
  const budget = data.budget || 99999;
  const gender = normalizeGender(data.gender);
  const interest = (data.interests?.[0] || "").toLowerCase();
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];

  console.log(`>>> [Filtrage] Critères : interest="${interest}", budget=${budget}, genre="${gender}"`);

  return products
    .filter(product => {
      const title = (product.title || "").toLowerCase();
      const tags = (product.tags || []).map(t => t.toLowerCase());
      const productGender = normalizeGender(product.gender || "");
      const price = parseFloat(product.price) || 0;

      const matchesInterest = title.includes(interest) || tags.includes(interest);
      const matchesBudget = price <= budget;
      const notExcluded = !excluded.some(ex => title.includes(ex));
      const matchesGender = !productGender || productGender === gender;

      const reasons = [];
      if (!matchesInterest) reasons.push("pas d'intérêt");
      if (!matchesBudget) reasons.push(`hors budget (${price} €)`);
      if (!notExcluded) reasons.push("exclu");
      if (!matchesGender) reasons.push(`genre incompatible (${productGender} ≠ ${gender})`);

      if (reasons.length > 0) {
        console.log(`>>> [Écarté] ${product.title} → ${reasons.join(", ")}`);
      }

      return matchesInterest && matchesBudget && notExcluded && matchesGender;
    })
    .map(product => {
      let matchingScore = scoringConfig.BASE_SCORE;
      const title = (product.title || "").toLowerCase();
      const description = (product.description || "").toLowerCase();
      const tags = (product.tags || []).map(t => t.toLowerCase()).join(" ");
      const fullText = `${title} ${description} ${tags}`;

      const rating = parseFloat(product.rating) || 0;
      if (rating >= 4) {
        matchingScore += scoringConfig.RATING_BONUS;
        console.log(`>>> [Note] +${scoringConfig.RATING_BONUS}% pour note ${rating}`);
      }

      const profileKeywords = ADVANCED_KEYWORDS[interest] || [];
      const hits = profileKeywords.filter(k => fullText.includes(k));
      if (hits.length > 0) {
        console.log(`>>> [Mots-clés] ${product.title} → ${hits.length} trouvés : ${hits.join(', ')}`);
        if (hits.length >= 5) {
          matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
        }
      }

      const isFast =
        (product.delivery_days_national && product.delivery_days_national < 3) ||
        (product.delivery_days_international && product.delivery_days_international < 7);
      if (isFast) {
        let bonus = scoringConfig.FAST_DELIVERY_BONUS;
        if (preferences.includes("fast_delivery")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
      }

      if (product.is_promo === true) {
        let bonus = scoringConfig.PROMO_BONUS;
        if (preferences.includes("promo")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
      }

      const weight = parseFloat(product.product_weight_kg) || 0;
      const height = product.product_height_cm || 0;
      const width = product.product_width_cm || 0;
      const depth = product.product_depth_cm || 0;
      const compact = weight <= 5 && height <= 50 && width <= 50 && depth <= 50;
      if (compact) {
        let bonus = scoringConfig.UNIVERSAL_SIZE_BONUS;
        if (preferences.includes("compact")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
      }

      return { ...product, matchingScore };
    });
}

// Fonction principale
async function searchEasyGiftProducts(data) {
  try {
    console.log(">>> [EasyGiftService] Requête reçue :", data);
    const raw = await fetchEasyGiftRawProducts();
    const filtered = applyEasyGiftBusinessRules(raw, data);
    console.log(`>>> [EasyGiftService] ${filtered.length} produits retenus`);
    return filtered;
  } catch (err) {
    console.error(">>> [EasyGiftService] Erreur critique :", err.message);
    return [];
  }
}

module.exports = { searchEasyGiftProducts };