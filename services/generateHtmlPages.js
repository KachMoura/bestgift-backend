require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com") ? { rejectUnauthorized: false } : false,
});

// Génère la page produit avec header, styles, Snipcart, etc.
function generateHTML(product) {
  const price = Number(product.price).toFixed(2);
  const id = product.id;
  const url = `https://www.bestgift.fr/product-${id}.html`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${product.title} | BestGift</title>
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
  <link rel="stylesheet" href="https://cdn.snipcart.com/themes/v3.6.1/default/snipcart.css" />
  <script async src="https://cdn.snipcart.com/themes/v3.6.1/default/snipcart.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #f4f6f8;
    }
    header {
      background-color: #3498db;
      padding: 15px 0;
    }
    header .navbar-brand {
      display: flex;
      align-items: center;
      color: #fff;
      font-size: 1.8rem;
      font-weight: bold;
    }
    header .navbar-brand img {
      height: 40px;
      margin-right: 10px;
    }
    header .nav-link {
      color: #fff !important;
    }
    .product-detail {
      padding: 50px 0;
    }
    .product-card {
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    }
    .product-card img {
      width: 100%;
      max-height: 400px;
      object-fit: cover;
      border-radius: 10px;
    }
    footer {
      background-color: #343a40;
      color: white;
      padding: 20px 0;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <nav class="navbar navbar-expand-lg navbar-dark">
        <a class="navbar-brand" href="index.html">
          <img src="assets/images/favicon.png" alt="Logo" />
          <span>BestGift</span>
        </a>
        <div class="collapse navbar-collapse">
          <ul class="navbar-nav ml-auto">
            <li class="nav-item"><a class="nav-link" href="index.html">Accueil</a></li>
            <li class="nav-item"><a class="nav-link" href="quiz.html">Quiz</a></li>
            <li class="nav-item"><a class="nav-link" href="shop.html">Catalogue</a></li>
            <li class="nav-item"><a class="nav-link" href="why.html">Pourquoi ?</a></li>
            <li class="nav-item"><a class="nav-link" href="contact.html">À propos</a></li>
            <li class="nav-item">
              <a href="#" class="snipcart-checkout nav-link">
                <i class="fas fa-shopping-cart"></i> Panier
                <span class="snipcart-items-count"></span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  </header>

  <section class="product-detail">
    <div class="container">
      <div class="product-card row">
        <div class="col-md-6">
          <img src="${product.image_url}" alt="${product.title}" />
        </div>
        <div class="col-md-6">
          <h2>${product.title}</h2>
          <p>${product.description}</p>
          <p class="snipcart-price">${price} €</p>
          <button
            class="btn btn-primary snipcart-add-item"
            data-item-id="${id}"
            data-item-name="${product.title}"
            data-item-price="${price}"
            data-item-url="${url}"
            data-item-description="${product.description}"
            data-item-image="${product.image_url}"
            data-item-currency="eur"
          >
            Ajouter au panier
          </button>
          <a href="shop.html" class="btn btn-link mt-3 d-block">← Retour au catalogue</a>
        </div>
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <p>© 2025 BestGift. Tous droits réservés.</p>
    </div>
  </footer>

  <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/js/bootstrap.bundle.min.js"></script>
   <!-- Snipcart -->
  <div hidden id="snipcart" data-api-key="MTA0ZTc0NzMtMDJkYy00MGIwLWI0MTQtNGJjNzc3OGEwN2QzNjM4ODMyNTAxNzM5NjAxMTAy" data-config-modal-style="side"></div>
data-config-modal-style="side"  data-redirect-url="https://www.bestgift.fr/confirmation.html"></div>
</body>
</html>`;
}

// Fonction principale
async function generatePages() {
  try {
    const result = await pool.query("SELECT * FROM easygift_products");
    const products = result.rows;
    console.log(`🛒 ${products.length} produits trouvés.`);
    const outputDir = path.join(__dirname, "../../frontend");
    for (const product of products) {
      const html = generateHTML(product);
      const filename = `product-${product.id}.html`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, html);
      console.log(`✔️ Fichier généré : ${filename}`);
    }
    await pool.end();
    console.log("✅ Génération terminée !");
  } catch (err) {
    console.error("❌ Erreur lors de la génération :", err.message);
  }
}

generatePages();
