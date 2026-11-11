require("dotenv").config();
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;



async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
// Call this only when your application terminates
async function disconnectFromMongoDB() {
  await client.close();
}

// Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.send("server is Running fine!")
});

// app.get("/health", (req, res) => {
//   res.json({ status: "healthy" });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ error: "Not Found", path: req.originalUrl });
// });

// // Error handler
// app.use((err, req, res, next) => {
//   console.error(err);
//   res.status(err.status || 500).json({
//     error: err.message || "Internal Server Error",
//   });
// });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = { app, connectToMongoDB, disconnectFromMongoDB };
