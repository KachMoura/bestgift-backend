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
Tu es un expert shopping. Compare ces deux produits à partir de leur titre et description. Détaille les caractéristiques et anticipe les retours clients habituels.

Présente les résultats dans un **tableau clair** comportant ces colonnes :
- Type de produit
- Fonction principale
- Points forts (selon description et attentes clients)
- Inconvénients possibles
- Ce que diraient typiquement les clients
- Idéal pour (type d’utilisateur ou usage)

Ensuite, termine avec un paragraphe de **recommandation personnalisée** :
> « Si vous cherchez plutôt [objectif 1], le meilleur choix est le produit X car [...]. En revanche, si votre priorité est plutôt [objectif 2], optez pour le produit Y. »

Voici les deux produits à comparer :

### Produit 1 :
Titre : ${product1.title}
Description : ${product1.description || 'aucune description'}

### Produit 2 :
Titre : ${product2.title}
Description : ${product2.description || 'aucune description'}
`.trim();

  console.log(">>> [DeepSeek] Prompt enrichi envoyé :", prompt);

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Tu es un assistant IA expert en conseil produit et comparaison utile." },
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