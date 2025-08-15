const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const events = require('../data/events');

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

// Get all active events
router.get('/', (req, res) => {
  const activeEvents = events
    .filter(event => !event.is_deleted && !event.to_be_deleted)
    .map(event => {
      const { ratings, ...eventData } = event;
      const populatedEvent = populateEventDetails(eventData);
      return {
        ...populatedEvent,
        average_rating: getAverageRating(ratings),
      };
    });
  res.json(activeEvents);
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
router.post('/', upload.fields([
  { name: 'eventData', maxCount: 1 },
  { name: 'photos', maxCount: MAX_PHOTOS }
]), (req, res) => {
  const eventData = JSON.parse(req.body.eventData);

  const {
    title,
    description,
    address,
    latitude,
    longitude,
    start_datetime,
    end_datetime,
    sale_type_id,
    item_categories
  } = eventData;

  const missingFields = [];

  // Build a list of all missing fields
  if (!title) missingFields.push('Title');
  if (!description) missingFields.push('Description');
  if (!address) missingFields.push('Address');
  if (latitude === undefined || latitude === null) missingFields.push('Coordinates');
  if (longitude === undefined || longitude === null) missingFields.push('Coordinates');
  if (!start_datetime) missingFields.push('Start Time');
  if (!end_datetime) missingFields.push('End Time');
  if (!sale_type_id) missingFields.push('Sale Type');
  if (!item_categories || item_categories.length === 0) {
    missingFields.push('Item Categories');
  }

  // If the list is not empty, send a detailed error message
  if (missingFields.length > 0) {
    // Use a Set to get unique field names before joining
    const uniqueMissingFields = [...new Set(missingFields)];
    const errorMessage = `Missing required fields: ${uniqueMissingFields.join(', ')}.`;
    return res.status(400).json({ message: errorMessage });
  }

  let eventPhotos = [];
  // req.files is an object like { photos: [ ... ] } when using upload.fields
  if (req.files && req.files.photos) {
    eventPhotos = req.files.photos.map(file => `/uploads/${file.filename}`);
  }

  const newEvent = {
    id: uuidv4(),
    guid: uuidv4(),
    title,
    description,
    address,
    latitude,
    longitude,
    start_datetime,
    end_datetime,
    sale_type_id,
    item_categories,
    photos: eventPhotos,
    is_deleted: false,
    to_be_deleted: false,
    ended_early_flags: 0,
    ratings: [],
    comments: [],
  };
  events.push(newEvent);
  res.status(201).json(populateEventDetails(newEvent));
});

// Get event data for editing
router.get('/edit/:guid', (req, res) => {
  const { guid } = req.params;
  const event = events.find(event => event.guid === guid);
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  res.json(event);
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
router.post('/:id/ratings', (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be a number between 1 and 5' });
  }

  const eventIndex = events.findIndex(event => event.id === id);
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }

  const newRating = {
    value: rating,
    timestamp: new Date().toISOString(),
  };

  events[eventIndex].ratings.push(newRating);
  res.status(201).json(events[eventIndex]);
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
