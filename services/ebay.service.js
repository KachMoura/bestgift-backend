require('dotenv').config();
const fetch = require('node-fetch');
const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
const { matchGenderAge } = require('../data/genderRules');

// Mots-clés avancés par profil (beauty ici comme exemple)
const EBAY_KEYWORDS_BY_PROFILE = {
  beauty: ["makeup", "perfume", "skincare", "beauty gift set", "haircare"]
};

// Détection de l’environnement (par défaut sandbox si non défini)
const isProd = process.env.EBAY_ENV === 'production';
const endpoint = isProd
  ? 'https://svcs.ebay.com/services/search/FindingService/v1'
  : 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1';
const appId = isProd
  ? process.env.EBAY_PRODUCTION_APP_ID
  : process.env.EBAY_SANDBOX_APP_ID;

console.log(`>>> [eBayService] Environnement sélectionné : ${isProd ? 'PRODUCTION' : 'SANDBOX'}`);
console.log(`>>> [eBayService] App ID utilisé : ${appId}`);

// Requête brute à eBay
async function fetchEbayRawProducts(keyword, maxPrice) {
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findItemsByKeywords',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'keywords': keyword,
    'itemFilter(0).name': 'MaxPrice',
    'itemFilter(0).value': maxPrice.toString(),
    'itemFilter(1).name': 'Condition',
    'itemFilter(1).value': '1000',
    'paginationInput.entriesPerPage': 20,
  });

  try {
    console.log(`>>> [eBayService] Requête API eBay : "${keyword}" (maxPrice=${maxPrice})`);
    const res = await fetch(`${endpoint}?${params.toString()}`);
    const data = await res.json();
    const ack = data.findItemsByKeywordsResponse?.[0]?.ack?.[0];
    if (ack !== 'Success') {
      console.error(">>> [eBayService] Réponse invalide :", JSON.stringify(data));
      return [];
    }
    return data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];
  } catch (err) {
    console.error(">>> [eBayService] Erreur API eBay :", err.message);
    return [];
  }
}

// Règles métiers et scoring
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

    if (!matchGenderAge(title, gender)) {
      console.log(`>>> [eBayService] Exclu (genre) : ${title}`);
      return null;
    }
    if (excluded.some(e => title.includes(e))) {
      console.log(`>>> [eBayService] Exclu (déjà offert) : ${title}`);
      return null;
    }

    let matchingScore = scoringConfig.BASE_SCORE;
    console.log(`>>> [eBayService] ${title} → score de base : ${matchingScore}%`);

    const foundKeywords = profileKeywords.filter(kw => title.includes(kw));
    if (foundKeywords.length >= 3) {
      matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
      console.log(`>>> +${scoringConfig.ADVANCED_MATCH_BONUS}% pour compatibilité avancée (${foundKeywords.length})`);
    }

    const originalPrice = parseFloat(item.discountPriceInfo?.[0]?.originalRetailPrice?.[0]?.__value__) || 0;
    if (originalPrice > price) {
      let promoBonus = scoringConfig.PROMO_BONUS;
      if (preferences.includes("promo")) promoBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += promoBonus;
      console.log(`>>> +${promoBonus}% pour promotion`);
    }

    const isFast = item.shippingInfo?.[0]?.expeditedShipping?.[0] === "true";
    if (isFast) {
      let fastBonus = scoringConfig.FAST_DELIVERY_BONUS;
      if (preferences.includes("fast_delivery")) fastBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += fastBonus;
      console.log(`>>> +${fastBonus}% pour livraison rapide`);
    }

    const weightStr = item.shippingInfo?.[0]?.weightMajor?.[0] || "";
    const weightKg = parseFloat(weightStr);
    if (!isNaN(weightKg) && weightKg <= 5) {
      let compactBonus = scoringConfig.UNIVERSAL_SIZE_BONUS;
      if (preferences.includes("compact")) compactBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += compactBonus;
      console.log(`>>> +${compactBonus}% pour format compact`);
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
    const keywordsList = EBAY_KEYWORDS_BY_PROFILE[interest] || [interest];
    const allProducts = [];

    for (const kw of keywordsList) {
      const result = await fetchEbayRawProducts(kw, maxPrice);
      allProducts.push(...result);
    }

    const filtered = applyEbayBusinessRules(allProducts, data);
    console.log(`>>> [eBayService] ${filtered.length} produits sélectionnés pour "${interest}"`);
    return filtered;
  } catch (err) {
    console.error(">>> [eBayService] Erreur searchEbayProducts :", err.message);
    return [];
  }
}

module.exports = {
  searchEbayProducts,
};