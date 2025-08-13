const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
let reports = require('../data/reports'); // Use let to allow modification
const events = require('../data/events');

// Helper to populate event details into a report
const populateReportDetails = (report) => {
  const event = events.find(e => e.id === report.event_id);
  return {
    ...report,
    event: event || { id: report.event_id, title: 'Event Not Found', description: '', address: '' }
  };
};

// GET all reports
router.get('/', (req, res) => {
  const populatedReports = reports.map(populateReportDetails);
  res.json(populatedReports);
});

// POST a new report
router.post('/', (req, res) => {
    const { event_id, reason, details } = req.body;

    if (!event_id || !reason) {
        return res.status(400).json({ message: 'Event ID and reason are required.' });
    }
    const eventExists = events.some(e => e.id === event_id);
    if (!eventExists) {
        return res.status(404).json({ message: 'Event not found.' });
    }
    const newReport = {
        id: uuidv4(),
        event_id,
        reason,
        details: details || '',
        created_at: new Date().toISOString()
    };
    reports.push(newReport);
    res.status(201).json(newReport);
});

// DELETE a report (Dismiss)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  reports = reports.filter(r => r.id !== id);
  res.status(204).send();
});

module.exports = router;