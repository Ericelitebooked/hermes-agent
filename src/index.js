const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const webhookRoutes = require('./routes/webhook');
const voiceRoutes = require('./routes/voice');

const app = express();

// Ensure audio folder exists (critical for deployment)
const audioDir = path.join(__dirname, 'audio');
fs.mkdirSync(audioDir, { recursive: true });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/audio', express.static(audioDir));

// Routes
app.use('/api', webhookRoutes);
app.use('/voice', voiceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[STARTUP] Hermes Lead Agent listening on port ${PORT}`);
  console.log(`[STARTUP] Server URL: ${config.serverUrl}`);
  console.log(`[STARTUP] Timezone: ${config.timezone}`);
});
