const express = require('express');
const getRoutes = require('./src/routes/getRoutes');
const postRoutes = require('./src/routes/postRoutes');

const app = express();
const port = 3000;

// GET routes
app.use('/api/v1', getRoutes);

// POST routes
app.use('/api/v1', postRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
  });

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
      console.log('Server has been gracefully terminated');
    });
  });

app.listen(port, () => {
    require('dotenv').config();
    console.log(`Server is running on port ${port}`);
});