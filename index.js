const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 61571;

app.use(express.json());
app.use(express.static('public'));

// Serve client.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

// API Routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/events', require('./routes/events'));

// Catch-all route to serve the client.html for any other request
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
