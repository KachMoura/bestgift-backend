require('dotenv').config();
const fetch = require('node-fetch');
const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
const { matchGenderAge } = require('../data/genderRules');

// Appel brut à l’API eBay
async function fetchEbayRawProducts(keyword, maxPrice) {
  const endpoint = "https://svcs.sandbox.ebay.com/services/search/FindingService/v1";
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findItemsByKeywords',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': process.env.EBAY_SANDBOX_APP_ID,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'keywords': keyword,
    'itemFilter(0).name': 'MaxPrice',
    'itemFilter(0).value': maxPrice.toString(),
    'paginationInput.entriesPerPage': 20,
  });
  try {
    console.log(`>>> [eBayService] Envoi requête pour "${keyword}" avec maxPrice=${maxPrice}€`);
    const res = await fetch(`${endpoint}?${params.toString()}`);
    const data = await res.json();
    const ack = data.findItemsByKeywordsResponse?.[0]?.ack?.[0];
    if (ack !== 'Success') {
      console.error(">>> [eBayService] Réponse non valide :", JSON.stringify(data.findItemsByKeywordsResponse));
      return [];
    }
    return data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];
  } catch (err) {
    console.error(">>> [eBayService] Erreur API eBay :", err.message);
    return [];
  }
}

// Application des règles métiers
function applyEbayBusinessRules(products, data) {
  const interest = (data.interests?.[0] || "").toLowerCase();
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const gender = data.gender || null;
  const profileKeywords = ADVANCED_KEYWORDS[interest] || [];

  return products.map(item => {
    const title = (item.title?.[0] || "").toLowerCase();
    const price = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__) || 0;
    const image = item.galleryURL?.[0] || "https://via.placeholder.com/150";
    const link = item.viewItemURL?.[0] || "#";

    // Filtres : genre + exclus
    if (!matchGenderAge(title, gender)) {
      console.log(`>>> [eBayService] Exclu pour genre : ${title}`);
      return null;
    }
    if (excluded.some(e => title.includes(e))) {
      console.log(`>>> [eBayService] Exclu car déjà offert : ${title}`);
      return null;
    }

    let matchingScore = scoringConfig.BASE_SCORE;
    console.log(`>>> [eBayService] ${title} → score de base : ${matchingScore}%`);

    // Compatibilité avancée
    const foundKeywords = profileKeywords.filter(kw => title.includes(kw));
    if (foundKeywords.length >= 3) {
      matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
      console.log(`>>> [eBayService] +${scoringConfig.ADVANCED_MATCH_BONUS}% pour compatibilité avancée (${foundKeywords.length} mots-clés)`);
    }

    // Promotion
    const originalPrice = parseFloat(item.discountPriceInfo?.[0]?.originalRetailPrice?.[0]?.__value__) || 0;
    if (originalPrice > price) {
      let promoBonus = scoringConfig.PROMO_BONUS;
      if (preferences.includes("promo")) promoBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += promoBonus;
      console.log(`>>> [eBayService] +${promoBonus}% pour promotion${preferences.includes("promo") ? " (préférence cochée)" : ""}`);
    }

    // Livraison rapide
    const isFast = item.shippingInfo?.[0]?.expeditedShipping?.[0] === "true";
    if (isFast) {
      let fastBonus = scoringConfig.FAST_DELIVERY_BONUS;
      if (preferences.includes("fast_delivery")) fastBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += fastBonus;
      console.log(`>>> [eBayService] +${fastBonus}% pour livraison rapide${preferences.includes("fast_delivery") ? " (préférence cochée)" : ""}`);
    }

    // Format compact (poids)
    const weightStr = item.shippingInfo?.[0]?.weightMajor?.[0] || "";
    const weightKg = parseFloat(weightStr);
    if (!isNaN(weightKg) && weightKg <= 5) {
      let compactBonus = scoringConfig.UNIVERSAL_SIZE_BONUS;
      if (preferences.includes("compact")) compactBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += compactBonus;
      console.log(`>>> [eBayService] +${compactBonus}% pour format compact (poids ${weightKg} kg)${preferences.includes("compact") ? " (préférence cochée)" : ""}`);
    } else {
      console.log(`>>> [eBayService] Aucune donnée de poids ou poids > 5kg`);
    }

    return {
      title,
      price,
      image,
      link,
      merchant: "eBay",
      matchingScore,
    };
  }).filter(Boolean);
}

// Fonction principale
async function searchEbayProducts(data) {
  try {
    const interest = (data.interests?.[0] || "").toLowerCase();
    const maxPrice = data.budget || 99999;
    const keywords = interest;
    const rawProducts = await fetchEbayRawProducts(keywords, maxPrice);
    const filtered = applyEbayBusinessRules(rawProducts, data);
    console.log(`>>> [eBayService] ${filtered.length} produits sélectionnés après filtres`);
    return filtered;
  } catch (err) {
    console.error(">>> [eBayService] Erreur dans searchEbayProducts :", err.message);
    return [];
  }
}

module.exports = {
  searchEbayProducts,
};