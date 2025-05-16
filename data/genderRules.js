const PRODUCT_FILTER_RULES = {
  Elle: [
    "barbe", "ceinture homme", "couteau", "bracelet homme", "montre homme",
    "rasoir", "perfume homme", "men watch", "beard", "wallet homme"
  ],
  Lui: [
    "bijou", "makeup", "maquillage", "sac", "sac à main", "bougie parfumée",
    "plaid rose", "palette", "lipstick", "rouge à lèvres", "women", "girl", "femme", "vernis", "blush"
  ],
  Enfant: [
    "montre", "barbe", "makeup", "bijou", "parfum", "vin", "couteau",
    "alcool", "adultes", "maquillage", "capillaires", "perfume","anti ride"
  ]
};

// Fonction de normalisation de texte (accents, majuscules, espaces)
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")                 // décompose accents
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/[^a-z0-9\s]/gi, "")    // supprime les caractères spéciaux
    .trim();
}

function matchGenderAge(title, gender) {
  const forbidden = PRODUCT_FILTER_RULES[gender] || [];
  const normalizedTitle = normalize(title);
  return !forbidden.some(keyword => normalizedTitle.includes(normalize(keyword)));
}

module.exports = {
  PRODUCT_FILTER_RULES,
  matchGenderAge
};