require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'firebase';

    if (!uri) {
        console.error("MONGODB_URI not found in .env");
        return;
    }

    console.log(`Connecting to ${uri}...`);
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected successfully.");

        const db = client.db(dbName);
        const collection = db.collection('users');

        const doc = {
            test: true,
            timestamp: new Date(),
            message: "Minimal test write from test_mongo_write.js"
        };

        const result = await collection.insertOne(doc);
        console.log(`Successfully inserted document into '${dbName}.users' with _id: ${result.insertedId}`);

        // Verify by reading back
        console.log("Verifying data persistence...");
        const savedDoc = await collection.findOne({ _id: result.insertedId });

        if (savedDoc) {
            console.log("✅ SUCCESS: Document found in MongoDB!");
            console.log("Retrieved Document:", JSON.stringify(savedDoc, null, 2));
        } else {
            console.error("❌ ERROR: Document NOT found after insertion.");
        }

        // Count total documents
        const count = await collection.countDocuments();
        console.log(`Total documents in 'users' collection: ${count}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

run();
