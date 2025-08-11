const express = require('express');
const app = express();
const port = 61571;

app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/events', require('./routes/events'));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
