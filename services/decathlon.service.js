const fetch = require("node-fetch");

// Appel à l’API publique de Decathlon
async function fetchDecathlonProducts(keyword) {
  const url = `https://www.decathlon.fr/api/v2/search?text=${encodeURIComponent(keyword)}&size=20`;

  try {
    console.log(`>>> [DecathlonService] Requête envoyée pour "${keyword}"`);
    const res = await fetch(url);
    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      console.warn(">>> [DecathlonService] Aucun produit trouvé.");
      return [];
    }

    return data.products.map(product => ({
      title: product.label || "Sans titre",
      price: parseFloat(product.price?.value) || 0,
      image: product.media?.imageUrl || "https://via.placeholder.com/150",
      link: `https://www.decathlon.fr${product.url}`,
      merchant: "Decathlon"
    }));
  } catch (err) {
    console.error(">>> [DecathlonService] Erreur API Decathlon :", err.message);
    return [];
  }
}

module.exports = { fetchDecathlonProducts };