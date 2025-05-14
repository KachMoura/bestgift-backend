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
Tu es un assistant shopping. Compare ces deux produits en français dans un tableau :
Produit 1 : ${product1.title} – ${product1.description || 'aucune description'}
Produit 2 : ${product2.title} – ${product2.description || 'aucune description'}
`.trim();

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openchat/openchat-3.5-1210",
        messages: [
          { role: "system", content: "Tu es un expert en aide au choix de produit." },
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

    const answer = response.data.choices?.[0]?.message?.content || "Réponse vide.";
    return { analysis: answer };
  } catch (err) {
    console.error(">>> [OpenRouter] Erreur API :", err.response?.data || err.message);
    return { error: "Erreur OpenRouter" };
  }
}

module.exports = { compareProductsWithAI };