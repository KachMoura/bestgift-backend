require('dotenv').config();
const fetch = require("node-fetch");
const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
const INTEREST_KEYWORDS = require('../data/interestKeywords');

const PRODUCT_FILTER_RULES = {
  Elle: ["barbe", "ceinture homme", "couteau", "bracelet homme", "montre homme"],
  Lui: ["bijou", "sac", "maquillage", "bougie parfumée", "plaid rose"],
  Enfant: ["montre", "barbe", "bijou", "parfum", "vin", "couteau"]
};

// Appel à l'API FakeStore
async function fetchFakeStoreRawProducts() {
  try {
    const res = await fetch("https://fakestoreapi.com/products");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(">>> [FakeStoreService] Erreur API :", err.message);
    return [];
  }
}

function matchGenderAge(title, gender) {
  const forbidden = PRODUCT_FILTER_RULES[gender] || [];
  const lowerTitle = title.toLowerCase();
  return !forbidden.some(keyword => lowerTitle.includes(keyword));
}

function applyFakeStoreBusinessRules(products, data) {
  const interest = (data.interests?.[0] || "").toLowerCase();
  const gender = data.gender || null;
  const budget = data.budget || 99999;
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const interestKeywords = INTEREST_KEYWORDS[interest] || [];
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];

  return products
    .filter(product => {
      const title = (product.title || "").toLowerCase();
      return (
        interestKeywords.some(k => title.includes(k)) &&
        matchGenderAge(title, gender) &&
        product.price <= budget &&
        !excluded.some(ex => title.includes(ex))
      );
    })
    .map(product => {
      let matchingScore = scoringConfig.BASE_SCORE;

      // Compatibilité avancée avec le profil
      const profileKeywords = ADVANCED_KEYWORDS[interest] || [];
      const textToCheck = (product.title + " " + (product.description || "")).toLowerCase();
      const foundKeywords = profileKeywords.filter(kw => textToCheck.includes(kw));
      if (foundKeywords.length >= 2) {
        matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
        console.log(`>>> [FakeStore] +${scoringConfig.ADVANCED_MATCH_BONUS}% pour compatibilité avancée (${foundKeywords.length} mots-clés) : ${product.title}`);
      }

      // Bonus pour note ≥ 4
      const rating = parseFloat(product.rating?.rate || 0);
      if (rating >= 4) {
        matchingScore += scoringConfig.RATING_BONUS;
        console.log(`>>> [FakeStore] +${scoringConfig.RATING_BONUS}% pour note ≥ 4 (${rating}) : ${product.title}`);
      }

      return {
        title: product.title,
        price: product.price,
        image: product.image || "https://via.placeholder.com/150",
        merchant: "FakeStore",
        link: "#",
        matchingScore
      };
    });
}

async function searchFakeStoreProducts(data) {
  const rawProducts = await fetchFakeStoreRawProducts();
  const finalProducts = applyFakeStoreBusinessRules(rawProducts, data);
  console.log(`>>> [FakeStore] ${finalProducts.length} produits sélectionnés après filtrage.`);
  return finalProducts;
}

module.exports = {
  searchFakeStoreProducts
};