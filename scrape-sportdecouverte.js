// scrape-sportdecouverte.js
require('dotenv').config();
const { runScraper } = require('./services/sportdecouverteScraper');

// Déclenche le scraping
(async () => {
  console.log(">>> [CRON] Lancement du scraping Sport Découverte...");
  await runScraper();
})();