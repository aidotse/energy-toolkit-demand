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

app.get('/api/geo', async (req, res) => {
    const { division } = req.query;

    if (!division) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const fileName = `geo,division=${division}.geojson`
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


app.get('/api/demand_t', async (req, res) => {
    const { geography, resolution, sector, aggregation, year, growth } = req.query;

    if (!geography || !resolution || !year || !growth) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const fileName = `demand_t,geography=${geography},resolution=${resolution},sector=${sector},aggregation=${aggregation},year=${year},growth=${growth}.csv.gz`
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

app.get('/api/demand', async (req, res) => {
    const { geography, sector, aggregation, year, growth } = req.query;

    if (!geography || !year || !growth) {
        return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const fileName = `demand,geography=${geography},resolution=1YE,sector=${sector},aggregation=${aggregation},year=${year},growth=${growth}.csv.gz`
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

app.get('/api/config', async (req, res) => {
    const fileName = 'config.json'
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

app.get('/api/scenarios', async (req, res) => {
    const fileName = 'scenarios.json'
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


app.get('/api/parameters', async (req, res) => {
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

app.get('/api/globals', async (req, res) => {
    const fileName = 'globals.json'
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
