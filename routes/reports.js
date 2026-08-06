const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const VALID_REASONS = ['inaccurate', 'spam', 'inappropriate', 'cancelled', 'other'];

// GET all reports (admin only — protected by requireAdmin in index.js)
router.get('/', async (req, res) => {
  try {
    const sql = `
      SELECT
        r.id, r.reason, r.details, r.created_at,
        e.id AS event_internal_id, e.public_id AS event_id,
        e.edit_guid,
        e.title, e.description, e.address
      FROM gapi_reports r
      JOIN gapi_events e ON r.event_id = e.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.query(sql);

    // Shape the response to match the format the admin panel expects.
    // edit_guid is included because this endpoint is admin-only (requireAdmin).
    const reports = rows.map(row => ({
      id: row.id,
      reason: row.reason,
      details: row.details,
      created_at: row.created_at,
      event: {
        id: row.event_id,          // public_id used as the client-facing ID
        edit_guid: row.edit_guid,  // safe to expose — admin-only endpoint
        internal_id: row.event_internal_id,
        title: row.title,
        description: row.description,
        address: row.address
      }
    }));

    res.json(reports);
  } catch (error) {
    console.error('Failed to fetch reports:', error.message);
    res.status(500).json({ message: 'Internal server error while fetching reports.' });
  }
});

// POST a new report (public — rate-limited in index.js)
router.post('/', async (req, res) => {
  const { event_id, reason, details } = req.body;

  if (!event_id || !reason) {
    return res.status(400).json({ message: 'Event ID and reason are required.' });
  }
  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ message: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}.` });
  }
  if (details && details.length > 1000) {
    return res.status(400).json({ message: 'Details must be 1000 characters or fewer.' });
  }

  try {
    // Look up the internal integer ID from the public_id
    const [eventRows] = await db.query('SELECT id FROM gapi_events WHERE public_id = ? AND is_deleted = FALSE', [event_id]);
    if (eventRows.length === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    const internalEventId = eventRows[0].id;

    const reportId = uuidv4();
    await db.execute(
      'INSERT INTO gapi_reports (id, event_id, reason, details) VALUES (?, ?, ?, ?)',
      [reportId, internalEventId, reason, details || null]
    );

    res.status(201).json({ id: reportId, event_id, reason, details: details || '', created_at: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to create report:', error.message);
    res.status(500).json({ message: 'Internal server error while submitting report.' });
  }
});

// DELETE a report — dismiss it (admin only — protected by requireAdmin in index.js)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM gapi_reports WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error(`Failed to delete report ${id}:`, error.message);
    res.status(500).json({ message: 'Internal server error while deleting report.' });
  }
});

module.exports = router;
