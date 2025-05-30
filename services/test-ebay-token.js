const { getStoredToken } = require('./ebayToken.service');

(async () => {
  try {
    const token = await getStoredToken();
    console.log("✅ Nouveau token eBay récupéré avec succès !");
    console.log(token);
  } catch (err) {
    console.error("❌ Erreur lors de la récupération du token :", err.message);
  }
})();