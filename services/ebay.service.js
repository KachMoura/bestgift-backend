require('dotenv').config();
const fetch = require('node-fetch');
const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
const { matchGenderAge } = require('../data/genderRules');

const EBAY_KEYWORDS_BY_PROFILE = {
  beauty: ["makeup", "maquillage", "perfume", "parfum", "skincare", "soin visage", "beauty gift set", "coffret beauté", "haircare", "soin cheveux"]
};

const EBAY_BROWSE_ENDPOINT = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const EBAY_OAUTH_TOKEN = process.env.EBAY_OAUTH_TOKEN;
const EBAY_CAMPAIGN_ID = process.env.EPN_CAMPAIGN_ID;

if (!EBAY_OAUTH_TOKEN) {
  console.error(">>> [eBayService] ERREUR : Aucun token OAuth eBay trouvé dans .env");
}

// --- Appel à l’API eBay ---
async function fetchEbayRawProducts(keyword, maxPrice) {
  const params = new URLSearchParams({
    q: keyword,
    limit: '20',
    filter: `price:[..${maxPrice}]`,
  });
  const url = `${EBAY_BROWSE_ENDPOINT}?${params.toString()}`;
  console.log(`>>> [eBayService] Appel Browse API : ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${EBAY_OAUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR',
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`>>> [eBayService] ERREUR HTTP ${res.status} : ${errorText}`);
      return [];
    }
    const data = await res.json();
    console.log(">>> [eBayService] Exemple brut :");
    console.log(JSON.stringify(data.itemSummaries?.[0], null, 2)); // exemple pour debug
    return data.itemSummaries || [];
  } catch (err) {
    console.error(">>> [eBayService] Erreur réseau :", err.message);
    return [];
  }
}

// --- Règles métier ---
function applyEbayBusinessRules(products, data) {
  const interest = (data.interests?.[0] || "").toLowerCase();
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const gender = data.gender || null;
  const maxBudget = data.budget || 99999;
  const profileKeywords = ADVANCED_KEYWORDS[interest] || [];

  return products.map(item => {
    const title = (item.title || "").toLowerCase();
    const price = parseFloat(item.price?.value) || 0;

    if (price > maxBudget) {
      console.log(`>>> [eBayService] Exclu (budget dépassé) : ${title} (${price} € > ${maxBudget} €)`);
      return null;
    }

    if (!matchGenderAge(title, gender)) {
      console.log(`>>> [eBayService] Exclu (genre) : ${title}`);
      return null;
    }

    if (excluded.some(e => title.includes(e))) {
      console.log(`>>> [eBayService] Exclu (déjà offert) : ${title}`);
      return null;
    }

    const image = item.image?.imageUrl || "https://via.placeholder.com/150";
    let link = item.itemWebUrl || "#";
    if (EBAY_CAMPAIGN_ID && link.includes("ebay.")) {
      const separator = link.includes('?') ? '&' : '?';
      link += `${separator}campid=${EBAY_CAMPAIGN_ID}`;
    }

    let matchingScore = scoringConfig.BASE_SCORE;
    console.log(`>>> [eBayService] ${title} → score de base : ${matchingScore}%`);

    const foundKeywords = profileKeywords.filter(kw => title.includes(kw));
    if (foundKeywords.length >= 2) {
      matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
      console.log(`>>> +${scoringConfig.ADVANCED_MATCH_BONUS}% pour compatibilité avancée`);
    }

    if (item.price?.discountAmount) {
      let promoBonus = scoringConfig.PROMO_BONUS;
      if (preferences.includes("promo")) promoBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += promoBonus;
      console.log(`>>> +${promoBonus}% pour promotion`);
    }

    const isFast = item.shippingOptions?.some(opt =>
      opt.shippingCarrierCode === "Chronopost" || opt.shippingCostType === "EXPRESS"
    );
    if (isFast) {
      let fastBonus = scoringConfig.FAST_DELIVERY_BONUS;
      if (preferences.includes("fast_delivery")) fastBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += fastBonus;
      console.log(`>>> +${fastBonus}% pour livraison rapide`);
    }

    const sellerRating = parseFloat(item.seller?.feedbackPercentage || "0");
    if (sellerRating >= 95) {
      matchingScore += scoringConfig.RATING_BONUS;
      console.log(`>>> +${scoringConfig.RATING_BONUS}% pour vendeur bien noté (${sellerRating}%)`);
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

// --- Fonction principale ---
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