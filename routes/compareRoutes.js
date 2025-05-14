const express = require('express');
const router = express.Router();

// On utilise la version DeepSeek via Axios (compare.service.js)
const { compareProductsWithAI } = require('../services/compare.service');

router.post('/', async (req, res) => {
  const { product1, product2, products } = req.body;

  console.log(">>> [compareRoute] Requête reçue sur /api/compare");

  // Mode tableau (frontend V2)
  if (Array.isArray(products) && products.length === 2) {
    console.log(">>> [compareRoute] Mode tableau détecté (frontend V2)");
    console.log(">>> Produits reçus :", JSON.stringify(products, null, 2));

    try {
      const result = await compareProductsWithAI(products[0], products[1]);
      console.log(">>> [compareRoute] Résultat IA :", result);
      return res.json(result);
    } catch (err) {
      console.error(">>> [compareRoute] Erreur (mode tableau) :", err.message);
      return res.status(500).json({ error: "Erreur lors de la comparaison IA (tableau)." });
    }
  }

  // Mode classique (product1, product2)
  console.log(">>> [compareRoute] Mode classique (product1, product2)");
  console.log(">>> Produit 1 :", JSON.stringify(product1, null, 2));
  console.log(">>> Produit 2 :", JSON.stringify(product2, null, 2));

  if (!product1 || !product2) {
    console.warn(">>> [compareRoute] Produits manquants.");
    return res.status(400).json({ error: "Deux produits sont requis pour la comparaison." });
  }

  try {
    const result = await compareProductsWithAI(product1, product2);
    console.log(">>> [compareRoute] Résultat IA :", result);
    return res.json(result);
  } catch (err) {
    console.error(">>> [compareRoute] Erreur (mode classique) :", err.message);
    return res.status(500).json({ error: "Erreur lors de la comparaison IA (classique)." });
  }
});

module.exports = router;
