const PRODUCT_FILTER_RULES = {
    Elle: ["barbe", "ceinture homme", "couteau", "bracelet homme", "montre homme"],
    Lui: ["bijou", "makeup","sac", "maquillage", "bougie parfumée", "plaid rose"],
    Enfant: ["montre", "barbe", "makeup","bijou", "parfum", "vin", "couteau"]
  };
  
  function matchGenderAge(title, gender) {
    const forbidden = PRODUCT_FILTER_RULES[gender] || [];
    const lowerTitle = title.toLowerCase();
    return !forbidden.some(keyword => lowerTitle.includes(keyword));
  }
  
  module.exports = {
    PRODUCT_FILTER_RULES,
    matchGenderAge
  };