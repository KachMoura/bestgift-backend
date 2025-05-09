require('dotenv').config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

// Importation des routes
const suggestionRoutes = require("./routes/suggestionRoutes");

// Middleware globaux
app.use(cors());
app.use(express.json());

// Utilisation des routes pour /api
app.use("/api", suggestionRoutes);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur EasyGift lancé sur le port ${PORT}`);
});
