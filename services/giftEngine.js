const { searchEbayProducts } = require('../services/ebay.service');
const { searchRakutenProducts } = require('../services/rakuten.service');
const { fetchDecathlonProducts } = require('../services/decathlon.service');
const { searchEasyGiftProducts } = require('../services/easygiftCatalogService');
const { searchFakeStoreProducts } = require('../services/fakestore.service');
const INTEREST_KEYWORDS = require('../data/interestKeywords');
const GENDER_RULES = require('../data/genderRules');

function matchGenderAge(title, gender) {
  const forbidden = GENDER_RULES[gender] || [];
  const lowerTitle = title.toLowerCase();
  return !forbidden.some(keyword => lowerTitle.includes(keyword));
}

function isExcluded(title, excludedList) {
  const lowerTitle = title.toLowerCase();
  return excludedList.some(item => lowerTitle.includes(item));
}

async function generateSuggestions(data) {
  console.log(">>> [GiftEngine] Début génération pour :", data);
  const rawSuggestions = {};
  const interestKeywords = INTEREST_KEYWORDS[data.interests?.[0]] || [];
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());

  const top = data.merchants?.top || [];
  const maybe = data.merchants?.maybe || [];
  const avoid = data.merchants?.avoid || [];

  const allMerchants = ["AliExpress", "eBay", "Rakuten", "Decathlon", "EasyGift", "FakeStore"];
  const requestedMerchants = [...top, ...maybe].filter(m => allMerchants.includes(m));

  // === Traitement par marchand (si demandé et non évité) ===
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

        case "AliExpress":
          const mockAliProducts = [
            { title: "Ballon de foot", price: 25, tags: ["sport"], merchant, image: "https://via.placeholder.com/150" },
            { title: "Casque Bluetooth", price: 35, tags: ["tech", "musique"], merchant, image: "https://via.placeholder.com/150" },
            { title: "Livre", price: 20, tags: ["book"], merchant, image: "https://via.placeholder.com/150" },
            { title: "Plaid moelleux", price: 28, tags: ["maison"], merchant, image: "https://via.placeholder.com/150" },
            { title: "Manette sans fil", price: 40, tags: ["game"], merchant, image: "https://via.placeholder.com/150" },
            { title: "Montre bracelet homme", price: 39, tags: ["tech"], merchant, image: "https://via.placeholder.com/150" },
            { title: "Peluche licorne enfant", price: 19, tags: ["game"], merchant, image: "https://via.placeholder.com/150" }
          ];
          rawSuggestions[merchant] = mockAliProducts.filter(product =>
            interestKeywords.some(k => product.title.toLowerCase().includes(k)) &&
            matchGenderAge(product.title, data.gender) &&
            product.price <= data.budget &&
            !isExcluded(product.title, excluded)
          );
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
      }
    } catch (err) {
      console.error(`>>> [GiftEngine] Erreur ${merchant} :`, err.message);
      rawSuggestions[merchant] = [];
    }
  }

  // === Ordonner les suggestions selon les préférences ===
  const suggestions = {};
  const order = [...top, ...maybe];
  for (const merchant of order) {
    suggestions[merchant] = rawSuggestions[merchant] || [];
  }

  console.log(">>> [GiftEngine] Suggestions finales générées :", Object.keys(suggestions));
  return { suggestions };
}

module.exports = { generateSuggestions };