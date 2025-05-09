require('dotenv').config();
const fetch = require("node-fetch");
const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');

// Appel brut à l'API Rakuten Japon
async function fetchRakutenRawProducts(keyword, maxPrice) {
  const endpoint = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706";
  const params = new URLSearchParams({
    applicationId: process.env.RAKUTEN_APP_ID,
    keyword,
    hits: 10,
    format: "json",
    maxPrice: maxPrice.toString()
  });

  try {
    console.log(`>>> [RakutenService] Envoi requête pour "${keyword}" avec maxPrice=${maxPrice}€`);
    const res = await fetch(`${endpoint}?${params.toString()}`);
    const data = await res.json();
    if (!data.Items || data.Items.length === 0) {
      console.warn(">>> [RakutenService] Aucun résultat trouvé pour :", keyword);
      return [];
    }

    return data.Items.map(obj => {
      const item = obj.Item;
      return {
        title: item.itemName || "Sans titre",
        price: item.itemPrice || 0,
        image: item.mediumImageUrls?.[0]?.imageUrl || "https://via.placeholder.com/150",
        merchant: "Rakuten",
        link: item.itemUrl || "#",
        description: item.itemCaption || "",
        reviewAverage: parseFloat(item.reviewAverage) || null
      };
    });

  } catch (err) {
    console.error(">>> [RakutenService] Erreur appel API :", err.message);
    return [];
  }
}

// Application locale des règles métiers + scoring
function applyRakutenBusinessRules(products, data) {
  const budget = data.budget || 99999;
  const gender = data.gender || null;
  const interest = (data.interests?.[0] || "").toLowerCase();
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];
  const profileKeywords = require("../data/advancedProfileKeywords")[interest] || [];

  console.log(`>>> [RakutenService] Application des règles métiers pour "${interest}" et budget ${budget}€`);

  return products.map(product => {
    const title = (product.title || "").toLowerCase();
    const textToCheck = title; // on pourrait concaténer + description ici si disponible
    const priceOk = product.price <= budget;
    const notExcluded = !excluded.some(ex => title.includes(ex));
    const interestOk = interest ? title.includes(interest) : true;
    const linkOk = product.link && /^https?:\/\//.test(product.link);

    if (!(priceOk && notExcluded && interestOk && linkOk)) {
      return null;
    }

    let matchingScore = scoringConfig.BASE_SCORE;
    console.log(`>>> [RakutenService] ${title} → score de base : ${matchingScore}%`);

    // Compatibilité avancée avec le profil
    const foundKeywords = profileKeywords.filter(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(textToCheck);
    });
    const keywordHits = foundKeywords.length;
    if (keywordHits >= 2) {
      matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
      console.log(`>>> [RakutenService] +${scoringConfig.ADVANCED_MATCH_BONUS}% pour compatibilité avancée (${keywordHits} mots-clés) : ${title}`);
      console.log(`>>> [RakutenService] Mots-clés détectés : ${foundKeywords.join(", ")}`);
    } else {
      console.log(`>>> [RakutenService] ${keywordHits} mot(s)-clé trouvé(s), aucun bonus ajouté pour : ${title}`);
    }

    return {
      ...product,
      matchingScore,
    };
  }).filter(Boolean);
}

// Fonction principale
async function searchRakutenProducts(data) {
  const keyword = data.interests?.[0] || "";
  if (!keyword) {
    console.warn(">>> [RakutenService] Aucun mot-clé fourni pour Rakuten.");
    return [];
  }

  const rawProducts = await fetchRakutenRawProducts(keyword, data.budget);
  const finalProducts = applyRakutenBusinessRules(rawProducts, data);
  console.log(`>>> [RakutenService] ${finalProducts.length} produits sélectionnés après filtres`);
  return finalProducts;
}

module.exports = {
  searchRakutenProducts,
};