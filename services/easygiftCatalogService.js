const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
require('dotenv').config();
const { Pool } = require('pg');

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

  console.log(`>>> [EasyGiftService] Application des règles métiers pour "${interest}" et budget ${budget}€`);

  return products
    .filter(product => {
      const title = (product.title || "").toLowerCase();
      const tags = Array.isArray(product.tags) ? product.tags.map(tag => tag.toLowerCase()) : [];
      const productGender = product.gender || null;
      const productPrice = parseFloat(product.price) || 0;
      const matchesInterest = title.includes(interest) || tags.includes(interest);
      const matchesBudget = productPrice <= budget;
      const notExcluded = !excluded.some(ex => title.includes(ex));
      const matchesGender = !productGender || productGender === gender;
      const keep = matchesInterest && matchesBudget && notExcluded && matchesGender;
      if (!keep) {
        console.log(`>>> [EasyGiftService] Produit écarté : ${product.title}`);
      }
      return keep;
    })
    .map(product => {
      let matchingScore = scoringConfig.BASE_SCORE;

      //note produit
      const rating = parseFloat(product.rating) || 0;

      if (rating >= 4) {
        matchingScore += scoringConfig.RATING_BONUS;
        console.log(`>>> [EasyGiftService] +${scoringConfig.RATING_BONUS}% pour note >= 4 : ${product.title} (note = ${rating})`);
      } else {
        console.log(`>>> [EasyGiftService] Note < 4 : ${product.title} (note = ${rating})`);
      }

      // Compatibilité avancée avec le profil
      const profileKeywords = ADVANCED_KEYWORDS[interest] || [];
      const textToCheck = (
        (product.title || "") +
        " " +
        (product.description || "") +
        " " +
        (product.tags || []).join(" ")
      ).toLowerCase();

      const foundKeywords = profileKeywords.filter(kw => textToCheck.includes(kw));
      const keywordHits = foundKeywords.length;

      console.log(`>>> [EasyGiftService] ${product.title} → ${keywordHits} mots-clés trouvés pour le profil "${interest}"`);
      if (foundKeywords.length > 0) {
        console.log(`>>> [EasyGiftService] Mots-clés détectés : ${foundKeywords.join(", ")}`);
      }

      if (keywordHits >= 5) {
        matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
        console.log(`>>> [EasyGiftService] +${scoringConfig.ADVANCED_MATCH_BONUS}% pour compatibilité avancée (≥ 5 mots-clés) : ${product.title}`);
      }

      // Livraison rapide
      const isFastDelivery =
        (product.delivery_days_national && product.delivery_days_national < 3) ||
        (product.delivery_days_international && product.delivery_days_international < 7);
      if (isFastDelivery) {
        let bonus = scoringConfig.FAST_DELIVERY_BONUS;
        if (preferences.includes("fast_delivery")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [EasyGiftService] +${bonus}% pour livraison rapide${preferences.includes("fast_delivery") ? " (préférence cochée)" : ""} : ${product.title}`);
      }

      // Promotion
      if (product.is_promo === true) {
        let bonus = scoringConfig.PROMO_BONUS;
        if (preferences.includes("promo")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [EasyGiftService] +${bonus}% pour promo${preferences.includes("promo") ? " (préférence cochée)" : ""} : ${product.title}`);
      }

      // Format compact
      const weight = parseFloat(product.product_weight_kg) || 0;
      const height = product.product_height_cm || 0;
      const width = product.product_width_cm || 0;
      const depth = product.product_depth_cm || 0;
      const isCompact = (weight <= 5) && (height <= 50) && (width <= 50) && (depth <= 50);
      if (isCompact) {
        let bonus = scoringConfig.UNIVERSAL_SIZE_BONUS;
        if (preferences.includes("compact")) bonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
        matchingScore += bonus;
        console.log(`>>> [EasyGiftService] +${bonus}% pour format compact${preferences.includes("compact") ? " (préférence cochée)" : ""} : ${product.title}`);
      }

      return {
        ...product,
        matchingScore
      };
    });
}

// Fonction principale appelée par le moteur
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