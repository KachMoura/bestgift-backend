const express = require('express');
const router = express.Router();
const { compareProductsWithAI } = require('../services/compare.service');

// Route POST /api/compare
router.post('/', async (req, res) => {
  const { product1, product2 } = req.body;

  if (!product1 || !product2) {
    return res.status(400).json({ error: "Deux produits sont requis pour la comparaison." });
  }

  try {
    const result = await compareProductsWithAI(product1, product2);
    res.json(result);
  } catch (err) {
    console.error(">>> [compareRoute] Erreur :", err.message);
    res.status(500).json({ error: "Erreur lors de la comparaison IA." });
  }
});

module.exports = router;
