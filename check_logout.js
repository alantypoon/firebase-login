require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('firebase');
        const collection = db.collection('logins');

        const docs = await collection.find({ email: 'test_logout@example.com' }).sort({ timestamp: -1 }).limit(1).toArray();
        console.log("Docs found:", docs);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}
run();
