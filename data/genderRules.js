const PRODUCT_FILTER_RULES = {
  Elle: [
    "barbe", "ceinture homme", "couteau", "bracelet homme", "montre homme","homme",
    "rasoir", "perfume homme", "Chaussure homme", "men watch", "beard", "wallet homme", "hommes"
  ],
  Lui: [
    "bijou", "makeup", "maquillage", "sac", "sac à main", "bougie parfumée",
    "plaid rose", "manucure", "pedicure", "palette", "lipstick", "rouge à lèvres", "women", "girl", "femme", "vernis", "blush"
  ],
  Enfant: [
    "montre", "barbe", "bijou", "haltères","biere", "sexe", "makeup", "bijou","women", "parfum", "vin", "couteau",
    "alcool", "adultes","makeup", "paupières","épilateur","vernis", "masque", "beauté","maquillage", "rouge à lèvres", "musculation", "fitness","Maquillage", "Rasoir", "Anti age","capillaires", "perfume","anti ride"
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