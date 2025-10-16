const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const events = require('../data/events');
const db = require('../db'); // Import the database connection pool

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb){
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const MAX_PHOTOS = 10; // Align with client-side limit
const upload = multer({
  storage: storage,
  limits:{fileSize: 10000000}, // 10MB limit
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
}); // We will specify single/multiple on a per-route basis now

function checkFileType(file, cb){
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if(mimetype && extname){
    return cb(null,true);
  } else {
    cb('Error: jpeg|jpg|png|gif images only!');
  }
}

// --- Public Routes ---

const item_categories = require('../data/item_categories');
const sale_types = require('../data/sale_types');

const getAverageRating = (ratings) => {
  if (!ratings || ratings.length === 0) {
    return 0;
  }
  const sum = ratings.reduce((acc, rating) => acc + rating.value, 0);
  return sum / ratings.length;
};

const populateEventDetails = (event) => {
  const populatedEvent = { ...event };
  // Populate item categories
  if (populatedEvent.item_categories) {
    populatedEvent.item_category_details = populatedEvent.item_categories.map(categoryId => {
      return item_categories.find(category => category.id === categoryId);
    });
  }
  // Populate sale type
  if (populatedEvent.sale_type_id) {
    populatedEvent.sale_type_details = sale_types.find(st => st.id === populatedEvent.sale_type_id);
  }
  return populatedEvent;
};

// Get all active events (Now using MySQL)
router.get('/', async (req, res) => {
  try {
    // Step 1: Fetch main event data with joins for sale_type and average_rating
    const mainSql = `
      SELECT
          e.id, e.public_id, e.title, e.description, e.address, e.latitude, e.longitude,
          e.start_datetime, e.end_datetime, st.id as sale_type_id, st.name as sale_type_name,
          (SELECT AVG(er.rating_value) FROM event_ratings er WHERE er.event_id = e.id) as average_rating
      FROM events e
      LEFT JOIN sale_types st ON e.sale_type_id = st.id
      WHERE e.is_deleted = FALSE ORDER BY e.start_datetime DESC
    `;
    const [events] = await db.query(mainSql);

    if (events.length === 0) {
      return res.json([]);
    }

    // Step 2: Collect event IDs for efficient sub-queries
    const eventIds = events.map(e => e.id);
    const placeholders = eventIds.map(() => '?').join(',');

    // Step 3: Fetch all related photos and categories in two efficient queries
    const [photos] = await db.query(`SELECT event_id, file_path FROM event_photos WHERE event_id IN (${placeholders})`, eventIds);
    const [categories] = await db.query(`SELECT eic.event_id, ic.id, ic.name FROM event_item_categories eic JOIN item_categories ic ON eic.category_id = ic.id WHERE eic.event_id IN (${placeholders})`, eventIds);

    // Step 4: Map the related data back to each event
    const eventsById = events.reduce((acc, event) => {
      acc[event.id] = {
        ...event,
        latitude: parseFloat(event.latitude), // Convert string to number
        longitude: parseFloat(event.longitude), // Convert string to number
        public_id: event.public_id, // Use public_id for client-facing ID
        sale_type_details: { id: event.sale_type_id, name: event.sale_type_name },
        photos: [],
        average_rating: event.average_rating || 0, // Ensure null ratings become 0
        item_category_details: []
      };
      delete acc[event.id].id; // Remove internal integer ID
      delete acc[event.id].sale_type_id;
      delete acc[event.id].sale_type_name;
      return acc;
    }, {});

    photos.forEach(photo => eventsById[photo.event_id]?.photos.push(photo.file_path));
    categories.forEach(cat => eventsById[cat.event_id]?.item_category_details.push({ id: cat.id, name: cat.name }));

    res.json(Object.values(eventsById));

  } catch (error) {
    console.error('Failed to fetch events from database:', error);
    res.status(500).json({ message: 'Internal server error while fetching events.' });
  }
});

// Update an event by public ID (for Admin)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const eventIndex = events.findIndex(event => event.id === id);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }
  // Exclude read-only fields from being updated
  const { id: bodyId, guid, ratings, comments, ...updateData } = req.body;
  const updatedEvent = { ...events[eventIndex], ...updateData };
  events[eventIndex] = updatedEvent;
  res.json(populateEventDetails(updatedEvent));
});

// Soft delete an event by public ID (for Admin)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const eventIndex = events.findIndex(event => event.id === id);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }
  events[eventIndex].is_deleted = true;
  res.status(204).send();
});

// --- Creator/Admin Routes ---

// Create a new event
router.post('/', upload.array('photos', MAX_PHOTOS), async (req, res) => {
  let connection;
  try {
    const eventData = JSON.parse(req.body.eventData);
    const { title, description, address, latitude, longitude, start_datetime, end_datetime, sale_type_id, item_categories } = eventData;

    // --- Validation ---
    if (!title || !description || !address || latitude === undefined || longitude === undefined || !start_datetime || !end_datetime || !sale_type_id || !item_categories || item_categories.length === 0) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // --- 1. Insert into `events` table ---
    const public_id = uuidv4();
    const edit_guid = uuidv4();

    const eventSql = `
      INSERT INTO events (public_id, edit_guid, title, description, address, latitude, longitude, start_datetime, end_datetime, sale_type_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [eventResult] = await connection.execute(eventSql, [
      public_id, edit_guid, title, description, address, latitude, longitude, start_datetime, end_datetime, sale_type_id
    ]);
    const newEventId = eventResult.insertId;

    // --- 2. Insert into `event_item_categories` junction table ---
    if (item_categories && item_categories.length > 0) {
      const categoryValues = item_categories.map(catId => [newEventId, catId]);
      const categorySql = 'INSERT INTO event_item_categories (event_id, category_id) VALUES ?';
      await connection.query(categorySql, [categoryValues]);
    }

    // --- 3. Insert into `event_photos` table ---
    let photoPaths = [];
    if (req.files && req.files.length > 0) {
      photoPaths = req.files.map(file => `/uploads/${file.filename}`);
      const photoValues = photoPaths.map(path => [newEventId, path]);
      const photoSql = 'INSERT INTO event_photos (event_id, file_path) VALUES ?';
      await connection.query(photoSql, [photoValues]);
    }

    // --- Commit Transaction ---
    await connection.commit();

    // --- 4. Construct and return the new event object for the client ---
    // This part is for client-side convenience, so it doesn't have to re-fetch.
    const [saleTypeRows] = await connection.execute('SELECT id, name FROM sale_types WHERE id = ?', [sale_type_id]);
    const [categoryRows] = await connection.execute('SELECT id, name FROM item_categories WHERE id IN (?)', [item_categories]);

    const newEventForClient = {
      public_id: public_id,
      edit_guid: edit_guid,
      title, description, address, latitude, longitude, start_datetime, end_datetime,
      sale_type_details: saleTypeRows[0] || null,
      item_category_details: categoryRows,
      photos: photoPaths,
      average_rating: 0 // New events have no ratings yet
    };

    res.status(201).json(newEventForClient);

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to create event:', error);
    res.status(500).json({ message: 'Internal server error while creating event.' });
  } finally {
    if (connection) connection.release();
  }
});

// Get event data for editing
router.get('/edit/:guid', async (req, res) => {
  const { guid } = req.params;
  try {
    // 1. Fetch the main event data using the secure edit_guid
    const [eventRows] = await db.query('SELECT * FROM events WHERE edit_guid = ?', [guid]);

    if (eventRows.length === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const event = eventRows[0];
    const eventId = event.id;

    // 2. Fetch related photos
    const [photoRows] = await db.query('SELECT file_path FROM event_photos WHERE event_id = ?', [eventId]);
    event.photos = photoRows.map(p => p.file_path);

    // 3. Fetch related category IDs for populating the form
    const [categoryRows] = await db.query('SELECT category_id FROM event_item_categories WHERE event_id = ?', [eventId]);
    event.item_categories = categoryRows.map(c => c.category_id);

    res.json(event);

  } catch (error) {
    console.error(`Failed to fetch event for edit with guid ${guid}:`, error);
    res.status(500).json({ message: 'Internal server error while fetching event data.' });
  }
});

// Update an event
router.put('/edit/:guid', (req, res) => {
  const { guid } = req.params;
  const eventIndex = events.findIndex(event => event.guid === guid);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }
  const updatedEvent = { ...events[eventIndex], ...req.body };
  events[eventIndex] = updatedEvent;
  res.json(updatedEvent);
});

// Soft delete an event
router.delete('/edit/:guid', (req, res) => {
  const { guid } = req.params;
  const eventIndex = events.findIndex(event => event.guid === guid);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }
  events[eventIndex].is_deleted = true;
  res.status(204).send();
});

// Undelete an event
router.post('/edit/:guid/undelete', (req, res) => {
  const { guid } = req.params;
  const eventIndex = events.findIndex(event => event.guid === guid);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }
  events[eventIndex].is_deleted = false;
  res.json(events[eventIndex]);
});

// Add a photo to an event
router.post('/edit/:guid/photos', upload.single('photo'), (req, res) => {
  const { guid } = req.params;
  const eventIndex = events.findIndex(event => event.guid === guid);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Error: No file selected or invalid file type.' });
  }

  const photoPath = `/uploads/${req.file.filename}`;
  events[eventIndex].photos.push(photoPath);
  res.status(200).json({
    message: 'File uploaded successfully',
    filePath: photoPath,
    event: events[eventIndex]
  });
});


// --- Public Routes with Dynamic IDs ---

// Get a single event by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const event = events.find(event => event.id === id);
  if (!event || event.is_deleted || event.to_be_deleted) {
    return res.status(404).json({ message: 'Event not found' });
  }
  const { ratings, ...eventData } = event;
  const populatedEvent = populateEventDetails(eventData);
  res.json({
    ...populatedEvent,
    average_rating: getAverageRating(ratings),
  });
});

// Flag an event as ended
router.post('/:id/flag-ended', (req, res) => {
  const { id } = req.params;
  const eventIndex = events.findIndex(event => event.id === id);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }
  events[eventIndex].ended_early_flags++;
  if (events[eventIndex].ended_early_flags >= 3) {
    events[eventIndex].to_be_deleted = true;
  }
  res.json(events[eventIndex]);
});

// Add a rating to an event
router.post('/:id/ratings', async (req, res) => {
  const { id: public_id } = req.params;
  const { rating } = req.body;

  try {
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5.' });
    }

    // Find the internal ID of the event from its public ID
    const [eventRows] = await db.query('SELECT id FROM events WHERE public_id = ?', [public_id]);

    if (eventRows.length === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    const eventId = eventRows[0].id;

    // Insert the new rating into the database
    const sql = 'INSERT INTO event_ratings (event_id, rating_value) VALUES (?, ?)';
    await db.execute(sql, [eventId, rating]);

    res.status(201).json({ message: 'Rating submitted successfully.' });

  } catch (error) {
    console.error(`Failed to add rating for event ${public_id}:`, error);
    res.status(500).json({ message: 'Internal server error while submitting rating.' });
  }
});

// Add a comment to an event
router.post('/:id/comments', (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  if (!comment || typeof comment !== 'string') {
    return res.status(400).json({ message: 'Comment must be a non-empty string' });
  }

  const eventIndex = events.findIndex(event => event.id === id);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }

  const newComment = {
    text: comment,
    timestamp: new Date().toISOString(),
  };

  events[eventIndex].comments.push(newComment);
  res.status(201).json(events[eventIndex]);
});

module.exports = router;
