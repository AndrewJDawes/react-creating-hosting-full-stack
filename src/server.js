import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


var corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

async function withDB(callback) {
    try {
        const client = await MongoClient.connect('mongodb://localhost:27017', {
            useNewUrlParser: true,
        });
        const db = client.db('my-blog');
        await callback(db);
        client.close()
    } catch (error) {
        throw new Error(error.message);
    }
}

const app = express();

app.use(express.static(path.join(__dirname, 'build')));
app.use(bodyParser.json());

app.get('/api/articles/:name', cors(corsOptions), async (req, res) => {
    try {
        const articleName = req.params.name.trim();
        await withDB(async (db) => {
            const articleInfo = await db.collection('articles').findOne({ name: articleName });
            res.status(200).json(articleInfo);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/articles/:name/upvote', cors(corsOptions), async (req, res) => {
    try {
        const articleName = req.params.name.trim();
        await withDB(async (db) => {
            let oldArticleInfo = await db.collection('articles').findOne({ name: articleName });
            let updateDocumentInfo = await db.collection('articles').findOneAndUpdate(
                { name: articleName },
                { $set: { 'upvotes': oldArticleInfo.upvotes + 1 } },
                { returnDocument: 'after' },
            );
            res.status(200).json(updateDocumentInfo.value);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/articles/:name/add-comment', cors(corsOptions), async (req, res) => {
    try {
        const articleName = req.params.name.trim();
        const { username, text } = req.body;
        console.log(req.body);
        await withDB(async (db) => {
            let oldArticleInfo = await db.collection('articles').findOne({ name: articleName });
            const comments = (Array.isArray(oldArticleInfo.comments) ? oldArticleInfo.comments : []);
            comments.push({ username, text });
            let updateDocumentInfo = await db.collection('articles').findOneAndUpdate(
                { name: articleName },
                { $set: { 'comments': comments } },
                { returnDocument: 'after' },
            );
            res.status(200).json(updateDocumentInfo.value);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
})

app.listen(8000, () => console.log('Listening on port 8000'));