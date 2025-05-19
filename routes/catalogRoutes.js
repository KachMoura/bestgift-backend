const express = require('express');
const router = express.Router();
const { getAllProducts } = require('../services/catalog-display.service');

router.get('/', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Erreur de récupération du catalogue" });
  }
});

module.exports = router;