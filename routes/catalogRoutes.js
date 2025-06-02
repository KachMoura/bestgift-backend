const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById } = require('../services/catalog-display.service');

// Route pour récupérer tous les produits
router.get('/', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Erreur de récupération du catalogue" });
  }
});

// ✅ Nouvelle route : récupération d’un produit par ID
router.get('/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: "Produit introuvable" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération du produit" });
  }
});

module.exports = router;