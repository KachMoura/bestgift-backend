require('dotenv').config();
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error(">>> [OpenRouter] ERREUR : clé API manquante dans .env (OPENROUTER_API_KEY)");
}

async function compareProductsWithAI(product1, product2) {
  console.log(">>> [OpenRouter] Produit 1 :", JSON.stringify(product1, null, 2));
  console.log(">>> [OpenRouter] Produit 2 :", JSON.stringify(product2, null, 2));

  const prompt = `
Compare objectivement ces deux produits et présente les avantages et inconvénients de chacun dans un tableau clair :
Produit 1 : ${product1.title} – ${product1.description || 'aucune description'}
Produit 2 : ${product2.title} – ${product2.description || 'aucune description'}
`.trim();

  console.log(">>> [OpenRouter] Prompt envoyé :", prompt);

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions", // CORRECT URL
      {
        model: "deepseek-chat", // CORRECT MODEL
        messages: [
          { role: "system", content: "Tu es un assistant expert en comparaison produit." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(">>> [OpenRouter] Statut HTTP :", response.status);
    console.log(">>> [OpenRouter] Réponse JSON brute :", JSON.stringify(response.data, null, 2));

    const answer = response.data.choices?.[0]?.message?.content || "Réponse vide.";
    console.log(">>> [OpenRouter] Réponse IA :", answer);

    return { analysis: answer };
  } catch (err) {
    console.error(">>> [OpenRouter] Erreur API :", err.response?.data || err.message);
    return { error: "Erreur OpenRouter" };
  }
}

module.exports = { compareProductsWithAI };