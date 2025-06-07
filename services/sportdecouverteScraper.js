// backend/services/sportdecouverteScraper.js
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();
const { Pool } = require('pg');

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : false,
});

// Scraping d’une page produit Sport Découverte
async function scrapeProductPage(url) {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    // ✅ Titre
    const title = $('meta[property="og:title"]').attr('content')?.trim() || "";

    // ✅ Description
    const descText = $('.description-offre p')
      .toArray()
      .map(p => $(p).text().trim())
      .filter(t => t.length > 30)
      .slice(0, 2)
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/[✔️✅•►]/g, '');
    const description = `Réservation en ligne – ${title}. ${descText}`;

    // ✅ Prix (triple stratégie)
    let price = null;

    // 1. Essai via JSON-LD
    const jsonLd = $('script[type="application/ld+json"]').html();
    if (jsonLd) {
      try {
        const parsed = JSON.parse(jsonLd);
        if (parsed?.offers?.price) {
          price = parseFloat(parsed.offers.price);
        }
      } catch (err) {
        console.warn(">>> [Scraper] JSON-LD non exploitable :", err.message);
      }
    }

    // 2. Essai via classe .price
    if (!price || isNaN(price)) {
      const priceText = $('.price-total .price').first().text().trim();
      if (priceText) {
        price = parseFloat(priceText.replace(/[^\d,\.]/g, '').replace(',', '.'));
      }
    }

    // 3. Fallback via regex "Total 96 €"
    if (!price || isNaN(price)) {
      const fallbackMatch = html.match(/Total\s*([0-9]{2,3}(?:[.,][0-9]{2})?)\s*€/i);
      if (fallbackMatch) {
        price = parseFloat(fallbackMatch[1].replace(',', '.'));
      }
    }

    // ✅ Image (priorité .jpg)
    let image_url = $('meta[property="og:image"]').attr('content') || "";
    if (image_url.endsWith('.webp')) {
      image_url = image_url.replace('.webp', '.jpg');
    }

    // ✅ Lien affilié
    const product_link = `${url}?utm_source=affilae&utm_medium=affiliate&utm_campaign=BestGift&ae=137`;

    // ✅ Autres champs
    const tags = ['expérience', 'sport', 'aventure'];
    const gender = 'all';
    const free_shipping = true;
    const delivery_days_min = 1;
    const delivery_days_max = 1;
    const is_promo = url.includes("promo");
    const product_weight_kg = 0.1;
    const product_height_cm = 20;
    const product_width_cm = 20;
    const product_depth_cm = 5;
    const rating = 4.5;

    // ✅ Console log debug
    console.log("\n>>> Produit extrait :");
    console.log("Titre :", title);
    console.log("Description :", description.slice(0, 100) + "...");
    console.log("Prix :", price);
    console.log("Image :", image_url);
    console.log("Lien affilié :", product_link);

    return {
      title,
      description,
      price,
      image_url,
      product_link,
      tags,
      gender,
      free_shipping,
      delivery_days_min,
      delivery_days_max,
      is_promo,
      product_weight_kg,
      product_height_cm,
      product_width_cm,
      product_depth_cm,
      rating
    };
  } catch (err) {
    console.error(">>> [Scraper] Erreur :", err.message);
    return null;
  }
}

// Nettoyage de la table
async function cleanTable() {
  await pool.query('DELETE FROM sportdecouverte_products');
  console.log(">>> [Scraper] Table nettoyée.");
}

// Insertion en base
async function insertProductInDB(product) {
  const query = `
    INSERT INTO sportdecouverte_products
    (title, description, price, image_url, product_link, tags, gender, free_shipping, delivery_days_min, delivery_days_max, is_promo, product_weight_kg, product_height_cm, product_width_cm, product_depth_cm, rating)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
  `;
  const values = [
    product.title,
    product.description,
    product.price,
    product.image_url,
    product.product_link,
    product.tags,
    product.gender,
    product.free_shipping,
    product.delivery_days_min,
    product.delivery_days_max,
    product.is_promo,
    product.product_weight_kg,
    product.product_height_cm,
    product.product_width_cm,
    product.product_depth_cm,
    product.rating
  ];
  await pool.query(query, values);
}

// Lancement global
async function runScraper() {
  console.log(">>> [Scraper] Démarrage...");
  await cleanTable();
  const urls = [
    "https://www.sport-decouverte.com/vol-montgolfiere-chateaux-loire.html",
    "https://www.sport-decouverte.com/stage-pilotage-subaru-decouverte-rallye-dreux.html",
    "https://www.sport-decouverte.com/simulateur-pilotage-avion-airbus-a320-paris-orly.html",
    "https://www.sport-decouverte.com/saut-elastique-vosges.html",
    "https://www.sport-decouverte.com/bapteme-paramoteur-proche-fontainebleau.html",
    "https://www.sport-decouverte.com/initiation-pilotage-drone-proche-versailles.html",
    "https://www.sport-decouverte.com/vol-initiation-planeur-meaux.html",
    "https://www.sport-decouverte.com/initiation-pilotage-helicoptere-paris.html",
    "https://www.sport-decouverte.com/randonnee-quad-paris.html",
    "https://www.sport-decouverte.com/stage-pilotage-ferrari-f8-tributo-circuit-trappes.html",
    "https://www.sport-decouverte.com/stage-pilotage-perfectionnement-moto-circuit-montlhery.html",
    "https://www.sport-decouverte.com/bapteme-plongee-fosse-villeneuve-la-garenne.html",
    "https://www.sport-decouverte.com/randonnee-jet-ski-proche-marseille.html",
    "https://www.sport-decouverte.com/initiation-surf-indoor-proche-saint-etienne.html",
    "https://www.sport-decouverte.com/sortie-mer-dauphins-lorient.html",
    "https://www.sport-decouverte.com/jeux-nautiques-bouees-bananes-tractees-perpignan.html",
    "https://www.sport-decouverte.com/randonnee-raquettes-vosges.html",
    "https://www.sport-decouverte.com/simulateur-chute-libre-paris.html",
    "https://www.sport-decouverte.com/stage-pilotage-drift-avec-cascadeur-professionnel-circuit-ferte-gaucher.html",
    "https://www.sport-decouverte.com/randonnee-chiens-de-traineau-alpes-grenoble.html",
    "https://www.sport-decouverte.com/saut-parachute-montargis-tandem.html"
  ];
  for (const url of urls) {
    const product = await scrapeProductPage(url);
    if (product) {
      await insertProductInDB(product);
      console.log(">>> [Scraper] Produit inséré en base.");
    }
  }
  await pool.end();
  console.log(">>> [Scraper] Terminé.");
}

runScraper();
