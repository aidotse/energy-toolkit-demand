import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the /api directory outside of the current folder
const apiDirectory = path.join(__dirname, '../api');

// Enable CORS for all routes
app.use(cors());

// API route to serve files dynamically
app.get('/api/geojson', async (req, res) => {
    const { resolution, sector, aggregation, year } = req.query;

    if (!year) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const fileName = `demand_geo,resolution=${resolution},sector=${sector},aggregation=${aggregation},year=${year}.geojson`
    const filePath = path.join(apiDirectory, fileName);

    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `File not found: ${filePath}` });
        }

        // Stream the GeoJSON file
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/json');
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// API route to serve files dynamically
app.get('/api/demand_t', async (req, res) => {
    const { geography, resolution, sector, aggregation, year } = req.query;

    if (!geography || !resolution || !year) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const fileName = `demand_t,geography=${geography},resolution=${resolution},sector=${sector},aggregation=${aggregation},year=${year}.csv.gz`
    const filePath = path.join(apiDirectory, fileName);

    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Stream the file as a Gzipped CSV
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Type', 'text/csv');

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (err) {
        console.error('Error in /api/demand_t route:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// API route to serve files dynamically
app.get('/api/parameters', async (req, res) => {
    const { year } = req.query;

    const fileName = 'parameters.json'
    const filePath = path.join(apiDirectory,fileName);

    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `File not found: ${filePath}` });
        }

        // Stream the GeoJSON file
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/json');
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Root route to list files in /api for testing purposes (optional)
app.get('/api', async (req, res) => {
    try {
        const files = await fs.readdir(apiDirectory);
        res.send(files);
    } catch (err) {
        res.status(500).send('Error reading directory');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Serving files from: ${apiDirectory}`);
});
