// Get current date and set time to midnight
const today = new Date();
today.setHours(0, 0, 0, 0);

// Helper function to format dates into YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calculate dates for today, yesterday, and tomorrow
const todayStr = formatDate(today);

const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const yesterdayStr = formatDate(yesterday);

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowStr = formatDate(tomorrow);

const events = [
  {
    id: '1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a',
    guid: '1b1b1b1b-1b1b-1b1b-1b1b-1b1b1b1b1b1b',
    title: 'Community Garage Sale (Today!)',
    description: 'A large, community-wide garage sale happening now.',
    address: '204 Wabiskaw Private, Ottawa, ON K2J 0E6 Canada',
    latitude: 45.2548783,
    longitude: -75.7291679,
    start_datetime: `${todayStr}T09:00:00Z`,
    end_datetime: `${todayStr}T17:00:00Z`,
    photos: [`https://picsum.photos/seed/today/200/300`],
    item_categories: [1, 2, 3, 4, 5, 6, 7, 8],
    is_deleted: false,
    to_be_deleted: false,
    ended_early_flags: 0,
    ratings: [],
    comments: [],
  },
  {
    id: '2a2a2a2a-2a2a-2a2a-2a2a-2a2a2a2a2a2a',
    guid: '2b2b2b2b-2b2b-2b2b-2b2b-2b2b2b2b2b2b',
    title: 'Vintage Furniture Sale (Yesterday)',
    description: 'Featuring mid-century and antique furniture from yesterday.',
    address: '208 Wabiskaw Private, Ottawa, ON K2J 0E6 Canada',
    latitude: 45.2541416,
    longitude: -75.7296925,
    start_datetime: `${yesterdayStr}T10:00:00Z`,
    end_datetime: `${yesterdayStr}T16:00:00Z`,
    photos: [`https://picsum.photos/seed/yesterday/200/300`],
    item_categories: [9],
    is_deleted: false,
    to_be_deleted: false,
    ended_early_flags: 0,
    ratings: [],
    comments: [],
  },
  {
    id: '3a3a3a3a-3a3a-3a3a-3a3a-3a3a3a3a3a3a',
    guid: '3b3b3b3b-3b3b-3b3b-3b3b-3b3b3b3b3b3b',
    title: 'Electronics and Gadgets (Tomorrow)',
    description: 'Old and new electronics, coming tomorrow.',
    address: '210 Wabiskaw Private, Ottawa, ON K2J 0E6 Canada',
    latitude: 45.2540827,
    longitude: -75.7296605,
    start_datetime: `${tomorrowStr}T11:00:00Z`,
    end_datetime: `${tomorrowStr}T15:00:00Z`,
    photos: [`https://picsum.photos/seed/tomorrow/200/300`],
    item_categories: [10],
    is_deleted: false,
    to_be_deleted: false,
    ended_early_flags: 0,
    ratings: [],
    comments: [],
  }
];

module.exports = events;
