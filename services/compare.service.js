require('dotenv').config();
const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

if (!DEEPSEEK_API_KEY) {
  console.error(">>> [DeepSeek] ERREUR : clé API manquante dans .env (DEEPSEEK_API_KEY)");
}

async function compareProductsWithAI(product1, product2) {
  console.log(">>> [DeepSeek] Produit 1 :", JSON.stringify(product1, null, 2));
  console.log(">>> [DeepSeek] Produit 2 :", JSON.stringify(product2, null, 2));

  const prompt = `
Compare objectivement ces deux produits et présente les avantages et inconvénients de chacun dans un tableau clair :
Produit 1 : ${product1.title} – ${product1.description || 'aucune description'}
Produit 2 : ${product2.title} – ${product2.description || 'aucune description'}
`.trim();

  console.log(">>> [DeepSeek] Prompt envoyé :", prompt);

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Tu es un assistant expert en comparaison produit." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5
      },
      {
        headers: {
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(">>> [DeepSeek] Statut HTTP :", response.status);
    console.log(">>> [DeepSeek] Réponse JSON brute :", JSON.stringify(response.data, null, 2));

    const answer = response.data.choices?.[0]?.message?.content || "Réponse vide.";
    console.log(">>> [DeepSeek] Réponse IA :", answer);

    return { analysis: answer };
  } catch (err) {
    console.error(">>> [DeepSeek] Erreur API :", err.response?.data || err.message);
    return { error: "Erreur DeepSeek" };
  }
}

module.exports = { compareProductsWithAI };