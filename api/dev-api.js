import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import routes from './routes.js';

const app = express();
const PORT = 3000;

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDirectory = path.join(__dirname, './data');

app.use(cors());

for (const route of routes) {
  const {
    path: routePath,
    method,
    filePattern,
    contentType,
    encoding,
    requiredParams = []
  } = route;

  app[method.toLowerCase()](routePath, async (req, res) => {
    try {
      // Check for required query params
      const missing = requiredParams.filter(p => !(p in req.query));
      if (missing.length > 0) {
        return res.status(400).json({ error: `Missing required query parameters: ${missing.join(', ')}` });
      }

      const fileName = filePattern(req.query);
      const filePath = path.join(apiDirectory, fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `File not found: ${fileName}` });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', contentType);
      if (encoding) res.setHeader('Content-Encoding', encoding);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) {
      console.error(`Error serving ${routePath}:`, err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
}

// Optional route to list files
app.get('/api', async (req, res) => {
  try {
    const files = await fs.promises.readdir(apiDirectory);
    res.send(files);
  } catch (err) {
    res.status(500).send('Error reading directory');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${apiDirectory}`);
});
