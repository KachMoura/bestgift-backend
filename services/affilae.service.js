require('dotenv').config();
const fetch = require('node-fetch');
const scoringConfig = require('../data/scoringConfig');
const ADVANCED_KEYWORDS = require('../data/advancedProfileKeywords');
const { matchGenderAge } = require('../data/genderRules');

const AFFILAE_CAMPAIGN_ID = process.env.AFFILAE_CAMPAIGN_ID || '';
const DEFAULT_PROGRAM_ID = 137; // Sport Découverte

async function fetchAffilaeRawProducts(programId = DEFAULT_PROGRAM_ID) {
  const url = `https://rest.affilae.com/v1/programs/${programId}/products`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${process.env.AFFILAE_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Affilae] HTTP ${res.status} : ${errText}`);
      return [];
    }

    const data = await res.json();
    console.log(`[Affilae] ${data.products?.length || 0} produits bruts reçus`);
    return data.products || [];
  } catch (err) {
    console.error("[Affilae] Erreur réseau :", err.message);
    return [];
  }
}

function applyAffilaeBusinessRules(products, data) {
  const interest = (data.interests?.[0] || "").toLowerCase();
  const preferences = Array.isArray(data.preferences) ? data.preferences : [];
  const excluded = (data.excludedGifts || []).map(e => e.toLowerCase());
  const gender = data.gender || null;
  const maxBudget = data.budget || 99999;
  const minBudget = data.minBudget || 0;
  const profileKeywords = ADVANCED_KEYWORDS[interest] || [];

  return products.map(p => {
    const title = (p.title || "").toLowerCase();
    const price = parseFloat(p.price) || 0;

    if (price < minBudget || price > maxBudget) return null;
    if (!matchGenderAge(title, gender)) return null;
    if (excluded.some(e => title.includes(e))) return null;

    let link = p.tracking_url || p.url || "#";
    if (AFFILAE_CAMPAIGN_ID) {
      const sep = link.includes('?') ? '&' : '?';
      link += `${sep}utm_campaign=${AFFILAE_CAMPAIGN_ID}`;
    }

    let score = scoringConfig.BASE_SCORE;
    const foundKeywords = profileKeywords.filter(k => title.includes(k));
    if (foundKeywords.length >= 2) {
      score += scoringConfig.ADVANCED_MATCH_BONUS;
    }

    return {
      title: p.title,
      price,
      image: p.image_url || "https://via.placeholder.com/150",
      link,
      merchant: p.advertiser_name || "Sport Découverte",
      matchingScore: score,
      source: "affilae"
    };
  }).filter(Boolean);
}

async function searchAffilaeProducts(data) {
  try {
    const programId = DEFAULT_PROGRAM_ID; // ou data.programId si tu veux varier
    const raw = await fetchAffilaeRawProducts(programId);
    const filtered = applyAffilaeBusinessRules(raw, data);
    filtered.sort((a, b) => b.matchingScore - a.matchingScore);
    return filtered;
  } catch (err) {
    console.error("[Affilae] Erreur searchAffilaeProducts :", err.message);
    return [];
  }
}

module.exports = {
  searchAffilaeProducts
};