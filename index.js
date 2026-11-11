require("dotenv").config();
const dns = require("dns");
const { MongoClient, ObjectId } = require("mongodb");

// Some local resolvers refuse SRV lookups required by mongodb+srv:// URIs.
if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(process.env.MONGODB_DNS_SERVERS.split(",").map((s) => s.trim()));
}

const client = new MongoClient(process.env.MONGODB_URI);

const express = require("express");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_NAME = process.env.DB_NAME || "wanderlast";
const DESTINATION_COLLECTION = "destination";

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");

    // Create the "wanderlast" database and "destination" collection if missing.
    const db = client.db(DB_NAME);
    const collections = await db
      .listCollections({ name: DESTINATION_COLLECTION })
      .toArray();
    if (collections.length === 0) {
      await db.createCollection(DESTINATION_COLLECTION);
      console.log(`Created collection "${DESTINATION_COLLECTION}" in database "${DB_NAME}"`);
    }

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.send("server is Running fine!")
});

// List all destinations
app.get("/destination", async (req, res) => {
  try {
    const destinations = await client
      .db(DB_NAME)
      .collection(DESTINATION_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json(destinations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch destinations." });
  }
});

// Get a single destination by id
app.get("/destination/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid destination id." });
    }

    const destination = await client
      .db(DB_NAME)
      .collection(DESTINATION_COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    if (!destination) {
      return res.status(404).json({ error: "Destination not found." });
    }

    res.json(destination);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch destination." });
  }
});

// Update a destination by id
app.patch("/destination/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid destination id." });
    }

    const updates = { ...req.body };
    delete updates._id;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided to update." });
    }

    updates.updatedAt = new Date();

    const destination = await client
      .db(DB_NAME)
      .collection(DESTINATION_COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updates },
        { returnDocument: "after" }
      );

    if (!destination) {
      return res.status(404).json({ error: "Destination not found." });
    }

    res.json({
      message: "Destination updated successfully.",
      destination,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update destination." });
  }
});

// Create a destination
app.post("/destination", async (req, res) => {
  try {
    const destination = {
      ...req.body,
      createdAt: new Date(),
    };

    const result = await client
      .db(DB_NAME)
      .collection(DESTINATION_COLLECTION)
      .insertOne(destination);

    res.status(201).json({
      message: "Destination created successfully.",
      destination: { _id: result.insertedId, ...destination },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create destination." });
  }
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

async function startServer() {
  await connectToMongoDB();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

module.exports = { app, connectToMongoDB, disconnectFromMongoDB };
