require('dotenv').config();
const fetch = require('node-fetch');

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions"; // À confirmer
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
  console.error(">>> [DeepSeek] ERREUR : clé API manquante dans .env");
}

// Fonction d’appel à l’IA DeepSeek
async function compareProductsWithAI(product1, product2) {
  console.log(">>> [DeepSeek] Produit 1 :", product1);
  console.log(">>> [DeepSeek] Produit 2 :", product2);

  const prompt = `
Compare objectivement ces deux produits et présente les avantages et inconvénients de chacun dans un tableau clair :
Produit 1 : ${product1.title} – ${product1.description || 'aucune description'}
Produit 2 : ${product2.title} – ${product2.description || 'aucune description'}
`.trim();

  console.log(">>> [DeepSeek] Prompt envoyé :", prompt);

  try {
    const res = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "deepseek-chat", // à vérifier selon leur doc officielle
        messages: [
          { role: "system", content: "Tu es un assistant expert en comparaison produit." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5
      }),
    });

    console.log(">>> [DeepSeek] Statut de la réponse HTTP :", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(">>> [DeepSeek] Erreur HTTP :", errorText);
      return { error: "Erreur DeepSeek" };
    }

    const json = await res.json();
    console.log(">>> [DeepSeek] Réponse JSON brute :", JSON.stringify(json, null, 2));

    const answer = json.choices?.[0]?.message?.content || "Réponse vide.";
    return { analysis: answer };

  } catch (err) {
    console.error(">>> [DeepSeek] Exception JS :", err.message);
    return { error: "Exception DeepSeek" };
  }
}

module.exports = { compareProductsWithAI };
