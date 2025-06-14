require('dotenv').config();
const fetch = require('node-fetch');
const { getValidToken } = require('./ebayToken.service');
const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
const { matchGenderAge } = require('../data/genderRules');

// ✅ Mots-clés enrichis (jusqu’à 12 par profil)
const EBAY_KEYWORDS_BY_PROFILE = {
  beauty: [
    "makeup", "perfume", "Set-Trousse-Manucure", "beauty gift set", "haircare",
    "palette maquillage", "sèche-cheveux", "crème visage", "soin peau", "épilateur", "masque beauté", "rouge à lèvres"
  ],
  tech: [
    "bluetooth", "smartwatch", "Tablette", "casque sans fil", "drone 4k",
    "Chargeur sans fil", "téléscope", "platine vinyle", "Écouteurs de Traduction", "horloge", "station recharge", "mini projecteur"
  ],
  book: [
    "Serre-livres", "Liseuse rechargeable", "Lampe de bureau", "Lampe de lecture", "Porte-Livre Réglable",
    "roman bestseller", "livre illustré", "livre développement personnel", "BD adulte", "journal intime", "audiobook", "calendrier littéraire"
  ],
  game: [
    "console", "jeux vidéo", "playstation", "Manettes", "Casque sans fil",
    "figurine gaming", "tapis gamer", "clé Steam", "volant simulateur", "chaise gamer", "lunettes gaming", "set VR"
  ],
  sport: [
    "Gourde pliable", "course à pied", "Casque de sport", "sac à dos sport", "montre cardio",
    "haltères", "tapis de yoga", "balle de massage", "gants de muscu", "vélo d’appartement", "bande résistance", "chaussures running"
  ],
  music: [
    "écouteurs", "enceinte bluetooth", "casque audio", "vinyle", "instrument",
    "ampli guitare", "synthétiseur", "support micro", "piano numérique", "métronome", "partition musicale", "câble jack audio"
  ],
  maison: [
    "diffuseur d'huiles essentielles", "Miroir déco", "bougie décorative", "lampe de chevet", "Coussin décoratif",
    "plaid doux", "cadre mural", "panier rangement", "plante artificielle", "tableau abstrait", "rideaux design", "veilleuse LED"
  ],
  ecolo: [
    "vase fleur", "Sac Artisanal", "écologique", "Jardinière", "gourde inox",
    "pailles bambou", "savon solide", "brosse compostable", "lampe solaire", "tote bag", "carnet recyclé", "bouteille filtrante"
  ],
  jewelry: [
    "bracelet", "necklace", "earrings", "ring", "fashion jewelry",
    "bijou personnalisé", "pendentif initiale", "collier perle", "bracelet cuir", "boîte à bijoux", "bague acier", "boucles d’oreilles"
  ],
  voyageur: [
    "Machine à Café Portable", "Mini Fer à repasser", "valise de voyage", "Écouteurs de Traduction", "casque anti bruit",
    "adaptateur universel", "oreiller cervical", "kit de voyage avion", "sac de voyage pliable", "mini trousse toilette", "pèse bagage", "chargeur universel"
  ]
};

const EBAY_BROWSE_ENDPOINT = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const EBAY_CAMPAIGN_ID = process.env.EPN_CAMPAIGN_ID;

function getRandomKeywords(keywords, count = 4) {
  const shuffled = [...keywords].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function fetchEbayRawProducts(keyword, minPrice, maxPrice) {
  const params = new URLSearchParams({
    q: keyword,
    limit: '20',
    filter: `price:[${minPrice}..${maxPrice}]`
  });
  const url = `${EBAY_BROWSE_ENDPOINT}?${params.toString()}`;
  const token = await getValidToken();
  console.log(`>>> [eBayService] Appel API : ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR'
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`>>> [eBayService] ERREUR HTTP ${res.status} : ${errorText}`);
      return [];
    }
    const data = await res.json();
    console.log(`>>> [eBayService] ${data.itemSummaries?.length || 0} produits bruts reçus pour "${keyword}"`);
    return data.itemSummaries || [];
  } catch (err) {
    console.error(">>> [eBayService] Erreur réseau :", err.message);
    return [];
  }
}

function applyEbayBusinessRules(products, data) {
  const interest = (data.interests?.[0] || "").toLowerCase();
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const gender = data.gender || null;
  const maxBudget = data.budget || 99999;
  const minBudget = data.minBudget || 0;

  console.log(`>>> [eBayService] Min budget : ${minBudget} €, Max budget : ${maxBudget} €`);

  const profileKeywords = ADVANCED_KEYWORDS[interest] || [];

  return products.map(item => {
    const title = (item.title || "").toLowerCase();
    const price = parseFloat(item.price?.value) || 0;
    const condition = item.condition || "";

    if (price < minBudget || price > maxBudget) return null;
    if (!["neuf", "new"].includes(condition.toLowerCase())) return null;
    if (!matchGenderAge(title, gender)) return null;
    if (excluded.some(e => title.includes(e))) return null;

    const image = item.image?.imageUrl || "https://via.placeholder.com/150";
    let link = item.itemWebUrl || "#";
    if (EBAY_CAMPAIGN_ID && link.includes("ebay.")) {
      const separator = link.includes('?') ? '&' : '?';
      link += `${separator}campid=${EBAY_CAMPAIGN_ID}`;
    }

    let matchingScore = scoringConfig.BASE_SCORE;

    const foundKeywords = profileKeywords.filter(kw => title.includes(kw));
    if (foundKeywords.length >= 2) {
      matchingScore += scoringConfig.ADVANCED_MATCH_BONUS;
    }

    if (item.price?.discountAmount) {
      let promoBonus = scoringConfig.PROMO_BONUS;
      if (preferences.includes("promo")) promoBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += promoBonus;
    }

    const isFast = item.shippingOptions?.some(opt =>
      opt.shippingCarrierCode === "Chronopost" || opt.shippingCostType === "EXPRESS"
    );
    if (isFast) {
      let fastBonus = scoringConfig.FAST_DELIVERY_BONUS;
      if (preferences.includes("fast_delivery")) fastBonus += scoringConfig.PREFERENCE_EXTRA_BONUS;
      matchingScore += fastBonus;
    }

    const hasFreeShipping = item.shippingOptions?.some(opt =>
      parseFloat(opt.shippingCost?.value) === 0
    );
    if (hasFreeShipping) {
      matchingScore += 10;
    }

    const sellerNote = parseFloat(item.seller?.feedbackPercentage || "0");
    if (sellerNote >= 90) {
      matchingScore += scoringConfig.RATING_BONUS;
    }

    return {
      title,
      price,
      image,
      link,
      merchant: "eBay",
      matchingScore
    };
  }).filter(Boolean);
}

async function searchEbayProducts(data) {
  try {
    const interest = (data.interests?.[0] || "").toLowerCase();
    const maxPrice = data.budget || 99999;
    const minPrice = data.minBudget || 0;
    let keywordsList = EBAY_KEYWORDS_BY_PROFILE[interest] || [interest];

    // 🎯 Aléatoire si +4 mots-clés
    if (keywordsList.length > 4) {
      keywordsList = getRandomKeywords(keywordsList, 4);
      console.log(`>>> [eBayService] Mots-clés "${interest}" tirés au hasard :`, keywordsList);
    }

    const allProducts = [];
    await Promise.all(
      keywordsList.map(async (kw) => {
        const result = await fetchEbayRawProducts(kw, minPrice, maxPrice);
        allProducts.push(...result);
      })
    );

    const filtered = applyEbayBusinessRules(allProducts, data);
    filtered.sort((a, b) => b.matchingScore - a.matchingScore);

    console.log(`>>> [eBayService] ${filtered.length} produits sélectionnés pour "${interest}"`);
    return filtered;
  } catch (err) {
    console.error(">>> [eBayService] Erreur searchEbayProducts :", err.message);
    return [];
  }
}

module.exports = {
  searchEbayProducts
};
