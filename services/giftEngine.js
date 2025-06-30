const { searchEbayProducts } = require('../services/ebay.service');
const { searchRakutenProducts } = require('../services/rakuten.service');
const { fetchDecathlonProducts } = require('../services/decathlon.service');
const { searchEasyGiftProducts } = require('../services/easygiftCatalogService');
const { searchFakeStoreProducts } = require('../services/fakestore.service');
const { searchBookVillageProducts } = require('../services/bookvillage.service');
const { searchSportDecouverteProducts } = require('../services/sportdecouverte.service');

const INTEREST_KEYWORDS = require('../data/interestKeywords');
const GENDER_RULES = require('../data/genderRules');

// Fonction de filtrage selon le genre
function matchGenderAge(title, gender) {
  const forbidden = GENDER_RULES[gender] || [];
  const lowerTitle = title.toLowerCase();
  return !forbidden.some(keyword => lowerTitle.includes(keyword));
}

// Vérifie si le produit est déjà offert
function isExcluded(title, excludedList) {
  const lowerTitle = title.toLowerCase();
  return excludedList.some(item => lowerTitle.includes(item));
}

// Dictionnaire de correction de casse pour les marchands
const MARCHAND_ALIASES = {
  'bookvillage': 'BookVillage',
  'sportdecouverte': 'SportDecouverte',
  'easygift': 'EasyGift',
  'ebay': 'eBay',
  'rakuten': 'Rakuten',
  'decathlon': 'Decathlon',
  'fakestore': 'FakeStore',
  'affilae': 'Affilae'
};

// Moteur principal
async function generateSuggestions(data) {
  console.log(">>> [GiftEngine] Début génération pour :", data);

  const rawSuggestions = {};
  const interestKeywords = INTEREST_KEYWORDS[data.interests?.[0]] || [];
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());

  const top = data.merchants?.top || [];
  const maybe = data.merchants?.maybe || [];
  const avoid = data.merchants?.avoid || [];

  const allMerchants = [
    "AliExpress", "eBay", "Rakuten", "Decathlon",
    "EasyGift", "FakeStore", "SportDecouverte", "BookVillage", "Affilae"
  ];

  // Normalisation de la casse
  const requestedMerchants = [...top, ...maybe]
    .map(m => MARCHAND_ALIASES[m.toLowerCase()] || m)
    .filter(m => allMerchants.includes(m));

  for (const merchant of requestedMerchants) {
    try {
      console.log(`>>> [GiftEngine] Traitement ${merchant}`);
      switch (merchant) {
        case "EasyGift":
          const easyGiftResults = await searchEasyGiftProducts(data);
          rawSuggestions[merchant] = easyGiftResults.map(product => ({
            title: product.title,
            price: product.price,
            image: product.image_url || "https://via.placeholder.com/150",
            merchant,
            link: product.product_link,
            matchingScore: product.matchingScore
          }));
          break;

        case "eBay":
          const ebayResults = await searchEbayProducts(data);
          rawSuggestions[merchant] = ebayResults.filter(p =>
            matchGenderAge(p.title, data.gender) &&
            !isExcluded(p.title, excluded)
          );
          break;

        case "Rakuten":
          rawSuggestions[merchant] = await searchRakutenProducts(data);
          break;

        case "Decathlon":
          const decathlonResults = await fetchDecathlonProducts((data.interests?.[0] || "").toLowerCase());
          rawSuggestions[merchant] = decathlonResults.filter(p =>
            matchGenderAge(p.title, data.gender) &&
            p.price <= data.budget &&
            !isExcluded(p.title, excluded)
          );
          break;

        case "FakeStore":
          const fakeResults = await searchFakeStoreProducts(data);
          rawSuggestions[merchant] = fakeResults.filter(p =>
            matchGenderAge(p.title, data.gender) &&
            !isExcluded(p.title, excluded)
          );
          break;

        case "BookVillage":
          console.log(">>> [GiftEngine] Switch BookVillage atteint ✅");
          const bookVillageResults = await searchBookVillageProducts(data);
          rawSuggestions[merchant] = bookVillageResults;
          break;

        case "SportDecouverte":
        case "Affilae": // même service utilisé
          const sportResults = await searchSportDecouverteProducts(data);
          rawSuggestions[merchant] = sportResults.filter(p =>
            matchGenderAge(p.title, data.gender) &&
            !isExcluded(p.title, excluded)
          );
          break;
      }
    } catch (err) {
      console.error(`>>> [GiftEngine] Erreur ${merchant} :`, err.message);
      rawSuggestions[merchant] = [];
    }
  }

  // Reconstituer les suggestions finales selon l’ordre de préférence
  const suggestions = {};
  const order = [...top, ...maybe].map(m => MARCHAND_ALIASES[m.toLowerCase()] || m);
  for (const merchant of order) {
    suggestions[merchant] = rawSuggestions[merchant] || [];
  }

  console.log(">>> [GiftEngine] Suggestions finales générées :", Object.keys(suggestions));
  return { suggestions };
}

module.exports = { generateSuggestions };
