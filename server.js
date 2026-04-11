const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Get all reports
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new report
app.post('/api/reports', async (req, res) => {
  try {
    const { name, noise, lat, lng } = req.body;
    const report = await prisma.report.create({
      data: {
        name,
        noise,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});