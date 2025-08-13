const { v4: uuidv4 } = require('uuid');

// This is mock data. In a real application, this would come from a database.
// The event_id should correspond to an ID in your data/events.js file.
const reports = [
  {
    id: "c5b9a1b2-3c4d-5e6f-7g8h-9i0j1k2l3m4n",
    event_id: "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6", // Replace with a real event ID from your data
    reason: "inaccurate",
    details: "The address listed is incorrect. The sale is actually on the next street over.",
    created_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString()
  },
  {
    id: "d6c0b2c3-4d5e-6f7g-8h9i-0j1k2l3m4n5o",
    event_id: "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7", // Replace with a real event ID from your data
    reason: "spam",
    details: "This is not a real garage sale, it's an advertisement for a business.",
    created_at: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString()
  }
];

module.exports = reports;