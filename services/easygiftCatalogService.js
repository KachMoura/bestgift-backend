const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
require('dotenv').config();
const { Pool } = require('pg');

// Connexion PostgreSQL (compatibilité Render + local)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false
});

// Récupération brute de tous les produits
async function fetchEasyGiftRawProducts() {
  try {
    const result = await pool.query('SELECT * FROM easygift_products');
    console.log(`>>> [EasyGiftService] ${result.rows.length} produits récupérés depuis la base.`);
    return result.rows;
  } catch (error) {
    console.error(">>> [EasyGiftService] Erreur lors de la récupération du catalogue :", error.message);
    return [];
  }
}

// Règles métier + scoring
function applyEasyGiftBusinessRules(products, data) {
  const budget = data.budget || 99999;
  const gender = data.gender || null;
  const interest = (data.interests?.[0] || "").toLowerCase();
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];

  console.log(`>>> [EasyGiftService] Application des règles métiers pour "${interest}", budget = ${budget}€, genre = ${gender}`);

  return products
    .filter(product => {
      const title = (product.title || "").toLowerCase();
      const tags = Array.isArray(product.tags) ? product.tags.map(tag => tag.toLowerCase()) : [];
      const productGender = product.gender || null;
      const productPrice = parseFloat(product.price) || 0;

      const matchesInterest = title.includes(interest) || tags.includes(interest);
      const matchesBudget = productPrice <= budget;
      const notExcluded = !excluded.some(ex => title.includes(ex));
      const matchesGender = !productGender || normalizeGender(productGender) === normalizeGender(gender);

      let reasons = [];
      if (!matchesInterest) reasons.push("pas d'intérêt correspondant");
      if (!matchesBudget) reasons.push(`hors budget (${productPrice} €)`);
      if (!notExcluded) reasons.push("élément exclu par l'utilisateur");
      if (!matchesGender) reasons.push(`genre incompatible (produit = ${productGender}, attendu = ${gender})`);

      if (reasons.length > 0) {
        console.log(`>>> [Filtrage] Produit écarté : ${product.title} — Raisons : ${reasons.join(', ')}`);
      }

      return matchesInterest && matchesBudget && notExcluded && matchesGender;
    })
    .map(product => {
      let matchingScore = scoringConfig.BASE_SCORE;

      const rating = parseFloat(product.rating) || 0;
      if (rating >= 4) {
        matchingScore += scoringConfig.RATING_BONUS;
        console.log(`>>> [Note] +${scoringConfig.RATING_BONUS}% : ${product.title} (note = ${rating})`);
      }

      const profileKeywords = ADVANCED_KEYWORDS[interest] || [];
      const textToCheck = `${product.title} ${product.description || ""} ${(product.tags || []).join(" ")}`.toLowerCase();
      const foundKeywords = profileKeywords.filter(kw => textToCheck.includes(kw));
      const keywordHits = foundKeywords.length;

      if (keywordHits > 0) {
        console.log(`>>> [Profil] ${product.title} → ${keywordHits} mots-clés trouvés : ${foundKeywords.join(', ')}`);
      }

      if (keywordHits >= 5) {
        matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
        console.log(`>>> [Profil Avancé] +${scoringConfig.ADVANCED_MATCH_BONUS}% : ${product.title}`);
      }

      const isFastDelivery =
        (product.delivery_days_national && product.delivery_days_national < 3) ||
        (product.delivery_days_international && product.delivery_days_international < 7);

      if (isFastDelivery) {
        let bonus = scoringConfig.FAST_DELIVERY_BONUS;
        if (preferences.includes("fast_delivery")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [Livraison Rapide] +${bonus}% : ${product.title}`);
      }

      if (product.is_promo === true) {
        let bonus = scoringConfig.PROMO_BONUS;
        if (preferences.includes("promo")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [Promo] +${bonus}% : ${product.title}`);
      }

      const weight = parseFloat(product.product_weight_kg) || 0;
      const height = product.product_height_cm || 0;
      const width = product.product_width_cm || 0;
      const depth = product.product_depth_cm || 0;

      const isCompact = (weight <= 5) && (height <= 50) && (width <= 50) && (depth <= 50);
      if (isCompact) {
        let bonus = scoringConfig.UNIVERSAL_SIZE_BONUS;
        if (preferences.includes("compact")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [Compact] +${bonus}% : ${product.title}`);
      }

      return {
        ...product,
        matchingScore
      };
    });
}

// Normalisation des genres pour assurer la compatibilité
function normalizeGender(value) {
  const v = (value || "").toLowerCase();
  if (["lui", "homme"].includes(v)) return "lui";
  if (["elle", "femme"].includes(v)) return "elle";
  if (["enfant", "kid"].includes(v)) return "enfant";
  return v;
}

async function searchEasyGiftProducts(data) {
  try {
    console.log(">>> [EasyGiftService] Requête reçue :", data);
    const rawProducts = await fetchEasyGiftRawProducts();
    const finalProducts = applyEasyGiftBusinessRules(rawProducts, data);
    console.log(`>>> [EasyGiftService] ${finalProducts.length} produits sélectionnés après filtres`);
    return finalProducts;
  } catch (error) {
    console.error(">>> [EasyGiftService] Erreur dans searchEasyGiftProducts :", error.message);
    return [];
  }
}

module.exports = {
  searchEasyGiftProducts,
};