require('dotenv').config();
const fetch = require('node-fetch');

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function compareProductsWithAI(productA, productB) {
  const prompt = `
Tu es un assistant shopping. Compare les deux produits suivants en listant leurs avantages et inconvénients dans un tableau clair.

Produit A : ${productA}
Produit B : ${productB}

Réponds en français, format tableau.
`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Tu es un assistant expert en analyse de produits." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Aucune réponse générée.";
  } catch (err) {
    console.error(">>> [DeepSeekService] Erreur API :", err.message);
    return "Erreur dans l'appel à l'IA.";
  }
}

module.exports = { compareProductsWithAI };