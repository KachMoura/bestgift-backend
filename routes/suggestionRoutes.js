const express = require("express");
const router = express.Router();

// Import du moteur de suggestion
const { generateSuggestions } = require("../services/giftEngine");

// Route POST pour générer des suggestions
router.post("/suggestions", async (req, res) => {
  console.log(">>> [suggestionRoutes] Reçu une requête POST sur /api/suggestions");
  console.log(">>> [suggestionRoutes] Corps de la requête :", req.body);
  try {
    const result = await generateSuggestions(req.body);
    console.log(">>> [suggestionRoutes] Résultat généré :", result);
    res.json(result);
  } catch (error) {
    console.error(">>> [suggestionRoutes] Erreur attrapée :", error.message);
    res.status(500).json({ error: "Erreur interne du serveur", detail: error.message });
  }
});

// Export du routeur pour pouvoir l'utiliser dans app.js
module.exports = router;