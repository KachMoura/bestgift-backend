require('dotenv').config();
const fetch = require('node-fetch');

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions"; // hypothétique
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
  console.error(">>> [DeepSeek] ERREUR : clé API manquante");
}

// Exemple de fonction qui interroge DeepSeek
async function compareProductsWithAI(product1, product2) {
  const prompt = `
Compare objectivement ces deux produits et présente les avantages et inconvénients de chacun dans un tableau clair :

Produit 1 : ${product1.title} – ${product1.description || 'aucune description'}  
Produit 2 : ${product2.title} – ${product2.description || 'aucune description'}
  `.trim();

  try {
    const res = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "deepseek-chat", // À ajuster selon la doc
        messages: [
          { role: "system", content: "Tu es un assistant expert en comparaison produit" },
          { role: "user", content: prompt }
        ],
        temperature: 0.5
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(">>> [DeepSeek] Erreur :", error);
      return { error: "Erreur DeepSeek" };
    }

    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content;
    return { result: answer };
  } catch (err) {
    console.error(">>> [DeepSeek] Exception :", err.message);
    return { error: "Exception DeepSeek" };
  }
}

module.exports = { compareProductsWithAI };