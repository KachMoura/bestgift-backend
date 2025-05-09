const { generateSuggestions } = require("../services/giftEngine");

/**
 * Contrôleur pour gérer la génération des suggestions de cadeaux.
 */
async function getSuggestions(req, res) {
  try {
    console.log("Requête reçue pour générer des suggestions :", req.body);

    const result = await generateSuggestions(req.body);

    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur dans le contrôleur de suggestions :", error.message);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
}

module.exports = {
  getSuggestions,
};
