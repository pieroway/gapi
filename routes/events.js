const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const events = require('../data/events');
const fs = require('fs').promises;
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
          (SELECT AVG(er.rating_value) FROM gapi_event_ratings er WHERE er.event_id = e.id) as average_rating
      FROM gapi_events e
      LEFT JOIN gapi_sale_types st ON e.sale_type_id = st.id
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
    const [photos] = await db.query(`SELECT event_id, file_path FROM gapi_event_photos WHERE event_id IN (${placeholders})`, eventIds);
    const [categories] = await db.query(`SELECT eic.event_id, ic.id, ic.name FROM gapi_event_item_categories eic JOIN gapi_item_categories ic ON eic.category_id = ic.id WHERE eic.event_id IN (${placeholders})`, eventIds);

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

// --- Creator/Admin Routes ---

// Create a new event
router.post('/', upload.array('photos', MAX_PHOTOS), async (req, res) => {
  let connection;
  try {
    console.log('Received request to create a new event.');
    const eventData = JSON.parse(req.body.eventData);
    const { title, description, address, latitude, longitude, start_datetime, end_datetime, sale_type_id, item_categories } = eventData;

    // --- Validation ---
    console.log('Validating event data...');
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (!address) missingFields.push('address');
    // latitude and longitude can be 0, so we check for undefined
    if (latitude === undefined) missingFields.push('latitude');
    if (longitude === undefined) missingFields.push('longitude');
    if (!start_datetime) missingFields.push('start_datetime');
    if (!end_datetime) missingFields.push('end_datetime');
    if (!sale_type_id) missingFields.push('sale_type_id');
    if (!item_categories || !Array.isArray(item_categories) || item_categories.length === 0) {
      missingFields.push('item_categories');
    }

    if (missingFields.length > 0) {
      // Return a detailed error message and a list of the invalid fields.
      console.warn('Validation failed. Missing fields:', missingFields);
      const message = `Missing or invalid required fields: ${missingFields.join(', ')}.`;
      return res.status(400).json({ message, fields: missingFields });
    }
    console.log('Validation successful.');

    connection = await db.getConnection();
    await connection.beginTransaction(); 
    console.log('Database transaction started.');

    // --- 1. Insert into `events` table ---
    const public_id = uuidv4();
    const edit_guid = uuidv4();

    // Convert ISO 8601 strings to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    // The .slice(0, 19) gets the date and time part, and .replace('T', ' ') swaps the 'T' for a space.
    const mysql_start_datetime = new Date(start_datetime).toISOString().slice(0, 19).replace('T', ' ');
    const mysql_end_datetime = new Date(end_datetime).toISOString().slice(0, 19).replace('T', ' ');

    console.log(`Converted start_datetime to: ${mysql_start_datetime}`);
    console.log(`Converted end_datetime to: ${mysql_end_datetime}`);

    const eventSql = `
      INSERT INTO gapi_events (public_id, edit_guid, title, description, address, latitude, longitude, start_datetime, end_datetime, sale_type_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [eventResult] = await connection.execute(eventSql, [
      public_id, edit_guid, title, description, address, latitude, longitude, mysql_start_datetime, mysql_end_datetime, sale_type_id
    ]);
    const newEventId = eventResult.insertId;
    console.log(`Inserted into gapi_events with new ID: ${newEventId}`);

    // --- 2. Insert into `event_item_categories` junction table ---
    if (item_categories && item_categories.length > 0) {
      const categoryValues = item_categories.map(catId => [newEventId, catId]);
      const categorySql = 'INSERT INTO gapi_event_item_categories (event_id, category_id) VALUES ?';
      await connection.query(categorySql, [categoryValues]);
      console.log(`Inserted ${categoryValues.length} categories for event ID ${newEventId}.`);
    }

    // --- 3. Insert into `event_photos` table ---
    let uploadedPhotoPaths = [];
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded photos.`);
      uploadedPhotoPaths = req.files.map(file => `uploads/${file.filename}`);
      const photoValues = uploadedPhotoPaths.map(p => [newEventId, p]);
      const photoSql = 'INSERT INTO gapi_event_photos (event_id, file_path) VALUES ?';
      await connection.query(photoSql, [photoValues]);
      console.log(`Inserted ${photoValues.length} photos for event ID ${newEventId}.`);
    } else {
      console.log('No photos were uploaded for this event.');
    }

    // --- Commit Transaction ---
    await connection.commit();
    console.log('Database transaction committed successfully.');

    // --- 4. Construct and return the new event object for the client ---
    // This part is for client-side convenience, so it doesn't have to re-fetch.
    const [saleTypeRows] = await connection.execute('SELECT id, name FROM gapi_sale_types WHERE id = ?', [sale_type_id]);
    const [categoryRows] = await connection.execute('SELECT id, name FROM gapi_item_categories WHERE id IN (?)', [item_categories]);

    const newEventForClient = {
      public_id: public_id,
      edit_guid: edit_guid,
      title, description, address, latitude, longitude, start_datetime, end_datetime,
      sale_type_details: saleTypeRows[0] || null,
      item_category_details: categoryRows,
      photos: uploadedPhotoPaths,
      average_rating: 0 // New events have no ratings yet
    };

    res.status(201).json(newEventForClient);

  } catch (error) {
    if (connection) await connection.rollback(); // Rollback on any error

    // Log the full technical error for server-side debugging
    console.error('Failed to create event:', {
      message: error.message,
      code: error.code, // e.g., ER_NO_REFERENCED_ROW_2
      sqlMessage: error.sqlMessage // The detailed message from the DB
    });

    // Check for specific, known database errors to give a better client-facing message.
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ message: 'Invalid data provided. One of the selected categories or the sale type does not exist.' });
    }
    res.status(500).json({ message: 'An unexpected internal server error occurred while creating the event.' });
  } finally {
    if (connection) connection.release();
  }
});

// Get event data for editing
router.get('/edit/:guid', async (req, res) => {
  const { guid } = req.params;
  try {
    // 1. Fetch the main event data using the secure edit_guid
    const [eventRows] = await db.query('SELECT * FROM gapi_events WHERE edit_guid = ?', [guid]);

    if (eventRows.length === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    const event = eventRows[0];
    const eventId = event.id;

    // 2. Fetch related photos
    const [photoRows] = await db.query('SELECT file_path FROM gapi_event_photos WHERE event_id = ?', [eventId]);
    event.photos = photoRows.map(p => p.file_path);

    // 3. Fetch related category IDs for populating the form
    const [categoryRows] = await db.query('SELECT category_id FROM gapi_event_item_categories WHERE event_id = ?', [eventId]);
    event.item_categories = categoryRows.map(c => c.category_id);

    res.json(event);

  } catch (error) {
    console.error(`Failed to fetch event for edit with guid ${guid}:`, error);
    res.status(500).json({ message: 'Internal server error while fetching event data.' });
  }
});

// Update an event
router.put('/edit/:guid', upload.array('photos', MAX_PHOTOS), async (req, res) => {
  const { guid } = req.params;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Parse incoming data
    const eventData = JSON.parse(req.body.eventData);
    const {
      title, description, address, latitude, longitude,
      start_datetime, end_datetime, sale_type_id,
      item_categories, existingPhotos = []
    } = eventData;

    // --- Validation ---
    if (!title || !description || !address || latitude === undefined || longitude === undefined || !start_datetime || !end_datetime || !sale_type_id || !item_categories) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // 2. Get the event's internal ID and verify it exists
    const [eventRows] = await connection.query('SELECT id FROM gapi_events WHERE edit_guid = ? AND is_deleted = FALSE', [guid]);
    if (eventRows.length === 0) {
      await connection.rollback(); // No need to proceed
      return res.status(404).json({ message: 'Event not found or has been deleted.' });
    }
    const eventId = eventRows[0].id;

    // 3. Update the main event details in `gapi_events`
    const updateSql = `
      UPDATE gapi_events SET
        title = ?, description = ?, address = ?, latitude = ?, longitude = ?,
        start_datetime = ?, end_datetime = ?, sale_type_id = ?
      WHERE id = ?
    `;
    await connection.execute(updateSql, [title, description, address, latitude, longitude, start_datetime, end_datetime, sale_type_id, eventId]);

    // 4. Update categories: Delete old, insert new
    await connection.execute('DELETE FROM gapi_event_item_categories WHERE event_id = ?', [eventId]);
    if (item_categories && item_categories.length > 0) {
      const categoryValues = item_categories.map(catId => [eventId, catId]);
      await connection.query('INSERT INTO gapi_event_item_categories (event_id, category_id) VALUES ?', [categoryValues]);
    }

    // 5. Update photos
    // 5a. Find photos to delete
    const [currentPhotos] = await connection.query('SELECT file_path FROM gapi_event_photos WHERE event_id = ?', [eventId]);
    const photosToDelete = currentPhotos.filter(p => !existingPhotos.includes(p.file_path));

    if (photosToDelete.length > 0) {
      const pathsToDelete = photosToDelete.map(p => p.file_path);
      await connection.query('DELETE FROM gapi_event_photos WHERE event_id = ? AND file_path IN (?)', [eventId, pathsToDelete]);
      // Asynchronously delete files from the filesystem
      for (const photo of photosToDelete) {
        fs.unlink(path.join(__dirname, '..', 'public', photo.file_path)).catch(err => console.error(`Failed to delete file: ${photo.file_path}`, err));
      }
    }

    // 5b. Add new photos
    if (req.files && req.files.length > 0) {
      const newPhotoPaths = req.files.map(file => `uploads/${file.filename}`);
      const photoValues = newPhotoPaths.map(p => [eventId, p]);
      await connection.query('INSERT INTO gapi_event_photos (event_id, file_path) VALUES ?', [photoValues]);
    }

    await connection.commit();
    res.status(200).json({ message: 'Event updated successfully.' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Failed to update event with guid ${guid}:`, error);
    res.status(500).json({ message: 'Internal server error while updating event.' });
  } finally {
    if (connection) connection.release();
  }
});

// Soft delete an event
router.delete('/edit/:guid', async (req, res) => {
  const { guid } = req.params;
  try {
    const [result] = await db.execute(
      'UPDATE gapi_events SET is_deleted = TRUE WHERE edit_guid = ?',
      [guid]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found or no change needed.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(`Failed to delete event with guid ${guid}:`, error);
    res.status(500).json({ message: 'Internal server error while deleting event.' });
  }
});

// Undelete an event
router.post('/edit/:guid/undelete', async (req, res) => {
  const { guid } = req.params;
  try {
    const [result] = await db.execute(
      'UPDATE gapi_events SET is_deleted = FALSE WHERE edit_guid = ?',
      [guid]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found or no change needed.' });
    }
    res.status(200).json({ message: 'Event restored successfully.' });
  } catch (error) {
    console.error(`Failed to undelete event with guid ${guid}:`, error);
    res.status(500).json({ message: 'Internal server error while restoring event.' });
  }
});

// Add a photo to an event
// Note: This is a simplified version. A full implementation would handle multiple uploads
// and associate them with an event within a transaction.
router.post('/edit/:guid/photos', upload.single('photo'), async (req, res) => {
    const { guid } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'Error: No file selected or invalid file type.' });
    }
    try {
        const [eventRows] = await db.query('SELECT id FROM gapi_events WHERE edit_guid = ?', [guid]);
        if (eventRows.length === 0) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        const eventId = eventRows[0].id;
        const photoPath = `uploads/${req.file.filename}`;
        await db.execute('INSERT INTO gapi_event_photos (event_id, file_path) VALUES (?, ?)', [eventId, photoPath]);
        res.status(201).json({ message: 'Photo added successfully.', filePath: photoPath });
    } catch (error) {
        console.error(`Failed to add photo for event guid ${guid}:`, error);
        res.status(500).json({ message: 'Internal server error while adding photo.' });
    }
});


// --- Public Routes with Dynamic IDs ---

// Get a single event by ID
router.get('/:id', async (req, res) => {
  const { id: public_id } = req.params;
  try {
    const mainSql = `
      SELECT
          e.id, e.public_id, e.title, e.description, e.address, e.latitude, e.longitude,
          e.start_datetime, e.end_datetime, st.id as sale_type_id, st.name as sale_type_name,
          (SELECT AVG(er.rating_value) FROM gapi_event_ratings er WHERE er.event_id = e.id) as average_rating
      FROM gapi_events e
      LEFT JOIN gapi_sale_types st ON e.sale_type_id = st.id
      WHERE e.public_id = ? AND e.is_deleted = FALSE
    `;
    const [eventRows] = await db.query(mainSql, [public_id]);

    if (eventRows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventRows[0];
    const eventId = event.id;

    const [photos] = await db.query('SELECT file_path FROM gapi_event_photos WHERE event_id = ?', [eventId]);
    const [categories] = await db.query('SELECT ic.id, ic.name FROM gapi_event_item_categories eic JOIN gapi_item_categories ic ON eic.category_id = ic.id WHERE eic.event_id = ?', [eventId]);
    const [comments] = await db.query('SELECT comment_text, created_at FROM gapi_event_comments WHERE event_id = ? ORDER BY created_at DESC', [eventId]);

    const result = {
      public_id: event.public_id,
      title: event.title,
      description: event.description,
      address: event.address,
      latitude: parseFloat(event.latitude),
      longitude: parseFloat(event.longitude),
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      sale_type_details: { id: event.sale_type_id, name: event.sale_type_name },
      photos: photos.map(p => p.file_path),
      average_rating: event.average_rating || 0,
      item_category_details: categories,
      comments: comments
    };

    res.json(result);
  } catch (error) {
    console.error(`Failed to fetch event ${public_id}:`, error);
    res.status(500).json({ message: 'Internal server error while fetching event.' });
  }
});

// Flag an event as ended
router.post('/:id/flag-ended', async (req, res) => {
  const { id: public_id } = req.params;
  try {
    // Increment the flag count
    const [updateResult] = await db.execute(
      'UPDATE gapi_events SET ended_early_flags = ended_early_flags + 1 WHERE public_id = ?',
      [public_id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Check if the event should be soft-deleted
    const [eventRows] = await db.query('SELECT ended_early_flags FROM gapi_events WHERE public_id = ?', [public_id]);
    const flags = eventRows[0].ended_early_flags;

    if (flags >= 3) {
      await db.execute('UPDATE gapi_events SET is_deleted = TRUE WHERE public_id = ?', [public_id]);
      res.status(200).json({ message: 'Flag submitted. Event has been marked as ended.' });
    } else {
      res.status(200).json({ message: `Flag submitted. ${3 - flags} more flag(s) needed to mark as ended.` });
    }
  } catch (error) {
    console.error(`Failed to flag event ${public_id}:`, error);
    res.status(500).json({ message: 'Internal server error while flagging event.' });
  }
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
    const [eventRows] = await db.query('SELECT id FROM gapi_events WHERE public_id = ?', [public_id]);

    if (eventRows.length === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    const eventId = eventRows[0].id;

    // Insert the new rating into the database
    const sql = 'INSERT INTO gapi_event_ratings (event_id, rating_value) VALUES (?, ?)';
    await db.execute(sql, [eventId, rating]);

    res.status(201).json({ message: 'Rating submitted successfully.' });

  } catch (error) {
    console.error(`Failed to add rating for event ${public_id}:`, error);
    res.status(500).json({ message: 'Internal server error while submitting rating.' });
  }
});

// Add a comment to an event
router.post('/:id/comments', async (req, res) => {
  const { id: public_id } = req.params;
  const { comment } = req.body;

  try {
    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({ message: 'Comment must be a non-empty string.' });
    }

    const [eventRows] = await db.query('SELECT id FROM gapi_events WHERE public_id = ?', [public_id]);
    if (eventRows.length === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    const eventId = eventRows[0].id;

    const [result] = await db.execute('INSERT INTO gapi_event_comments (event_id, comment_text) VALUES (?, ?)', [eventId, comment]);

    res.status(201).json({ id: result.insertId, event_id: eventId, comment_text: comment });
  } catch (error) {
    console.error(`Failed to add comment for event ${public_id}:`, error);
    res.status(500).json({ message: 'Internal server error while adding comment.' });
  }
});

module.exports = router;
