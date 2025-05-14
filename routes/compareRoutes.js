const express = require('express');
const router = express.Router();
const { compareProductsWithAI } = require('../services/compare.service');

// Route POST /api/compare
router.post('/', async (req, res) => {
  const { product1, product2, products } = req.body;

  console.log(">>> [compareRoute] Requête reçue sur /api/compare");

  if (products && Array.isArray(products) && products.length === 2) {
    console.log(">>> [compareRoute] Mode tableau détecté (frontend V2)");
    console.log(">>> Produits reçus :", JSON.stringify(products, null, 2));
    try {
      const result = await compareProductsWithAI(products[0], products[1]);
      return res.json(result);
    } catch (err) {
      console.error(">>> [compareRoute] Erreur (mode tableau) :", err.message);
      return res.status(500).json({ error: "Erreur lors de la comparaison IA." });
    }
  }

  console.log(">>> [compareRoute] Mode classique (product1, product2)");
  console.log(">>> Produit 1 :", JSON.stringify(product1));
  console.log(">>> Produit 2 :", JSON.stringify(product2));

  if (!product1 || !product2) {
    console.warn(">>> [compareRoute] Produits manquants.");
    return res.status(400).json({ error: "Deux produits sont requis pour la comparaison." });
  }

  try {
    const result = await compareProductsWithAI(product1, product2);
    res.json(result);
  } catch (err) {
    console.error(">>> [compareRoute] Erreur (mode classique) :", err.message);
    res.status(500).json({ error: "Erreur lors de la comparaison IA." });
  }
});

module.exports = router;
