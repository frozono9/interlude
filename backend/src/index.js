const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Interlude Backend is running' });
});

// Audio Analysis Routes
app.use('/api/audio', require('./routes/audio'));

// Transition Generation Routes
app.use('/api/transitions', require('./routes/transitions'));

app.listen(PORT, () => {
  console.log(`🎵 Interlude Backend running on port ${PORT}`);
});
