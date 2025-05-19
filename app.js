require('dotenv').config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

// Importation des routes
const suggestionRoutes = require("./routes/suggestionRoutes");
const compareRoutes = require('./routes/compareRoutes');
const catalogueRoutes = require('./routes/catalogRoutes'); // <-- ajout ici

// Middleware globaux
app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/compare', compareRoutes);
app.use('/api/catalogue', catalogueRoutes); // <-- ajout ici
app.use("/api", suggestionRoutes);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur EasyGift lancé sur http://localhost:${PORT}`);
});
