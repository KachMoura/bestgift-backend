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

// Nettoyage du champ tags (tableau ou string)
function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(t => t.toLowerCase());
  if (typeof tags === "string") return tags.split(',').map(t => t.trim().toLowerCase());
  return [];
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
      const tags = parseTags(product.tags);
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
      const tags = parseTags(product.tags).join(" ");
      const fullText = `${title} ${description} ${tags}`;

      // Bonus note
      const rating = parseFloat(product.rating) || 0;
      if (rating >= 4) {
        matchingScore += scoringConfig.RATING_BONUS;
        console.log(`>>> [Note] ${product.title} : +${scoringConfig.RATING_BONUS}% (note ${rating})`);
      }

      // Bonus mots-clés profil
      const profileKeywords = ADVANCED_KEYWORDS[interest] || [];
      const hits = profileKeywords.filter(k => fullText.includes(k));
      if (hits.length > 0) {
        console.log(`>>> [Mots-clés] ${product.title} → ${hits.length} trouvés : ${hits.join(', ')}`);
        if (hits.length >= 5) {
          matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
          console.log(`>>> [Profil Avancé] ${product.title} : +${scoringConfig.ADVANCED_MATCH_BONUS}% (≥ 5 mots-clés)`);
        }
      }

      // Bonus livraison rapide
      const isFast =
        (product.delivery_days_national && product.delivery_days_national < 3) ||
        (product.delivery_days_international && product.delivery_days_international < 7);
      if (isFast) {
        let bonus = scoringConfig.FAST_DELIVERY_BONUS;
        if (preferences.includes("fast_delivery")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [Livraison] ${product.title} : +${bonus}% (rapide${preferences.includes("fast_delivery") ? " + préférée" : ""})`);
      }

      // Bonus promotion
      if (product.is_promo === true) {
        let bonus = scoringConfig.PROMO_BONUS;
        if (preferences.includes("promo")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [Promo] ${product.title} : +${bonus}% (promo${preferences.includes("promo") ? " + préférée" : ""})`);
      }

      // Bonus compacité
      const weight = parseFloat(product.product_weight_kg) || 0;
      const height = product.product_height_cm || 0;
      const width = product.product_width_cm || 0;
      const depth = product.product_depth_cm || 0;
      const compact = weight <= 5 && height <= 50 && width <= 50 && depth <= 50;
      if (compact) {
        let bonus = scoringConfig.UNIVERSAL_SIZE_BONUS;
        if (preferences.includes("compact")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [Compact] ${product.title} : +${bonus}% (taille réduite${preferences.includes("compact") ? " + préférée" : ""})`);
      }

      // Affichage final
      console.log(`>>> [Score Final] ${product.title} : ${matchingScore}%`);

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