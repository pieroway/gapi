const events = [
  {
    id: '1a1a1a1a-1a1a-1a1a-1a1a-1a1a1a1a1a1a',
    guid: '1b1b1b1b-1b1b-1b1b-1b1b-1b1b1b1b1b1b',
    title: 'Community Garage Sale',
    description: 'A large, community-wide garage sale.',
    address: '123 Main St, Anytown, USA',
    latitude: 40.7128,
    longitude: -74.0060,
    start_datetime: '2025-10-26T09:00:00Z',
    end_datetime: '2025-10-26T17:00:00Z',
    photos: [`https://picsum.photos/200/300`],
    item_categories: [6, 7, 8],
    is_deleted: false,
    to_be_deleted: false,
    ended_early_flags: 0,
    ratings: [
      { value: 5, timestamp: '2025-10-26T18:00:00Z' },
      { value: 4, timestamp: '2025-10-26T18:05:00Z' },
    ],
    comments: [
      { text: 'Great selection!', timestamp: '2025-10-26T18:00:00Z' },
      { text: 'Found some amazing deals.', timestamp: '2025-10-26T18:05:00Z' },
    ],
  },
  {
    id: '2a2a2a2a-2a2a-2a2a-2a2a-2a2a2a2a2a2a',
    guid: '2b2b2b2b-2b2b-2b2b-2b2b-2b2b2b2b2b2b',
    title: 'Vintage Furniture Sale',
    description: 'Featuring mid-century and antique furniture.',
    address: '456 Oak Ave, Anytown, USA',
    latitude: 40.7128,
    longitude: -74.0060,
    start_datetime: '2025-11-02T10:00:00Z',
    end_datetime: '2025-11-02T16:00:00Z',
    photos: [`https://picsum.photos/200/300`],
    item_categories: [9],
    is_deleted: false,
    to_be_deleted: false,
    ended_early_flags: 0,
    ratings: [
      { value: 3, timestamp: '2025-11-02T17:00:00Z' },
    ],
    comments: [
      { text: 'A bit pricey, but good quality.', timestamp: '2025-11-02T17:00:00Z' },
    ],
  },
  {
    id: '3a3a3a3a-3a3a-3a3a-3a3a-3a3a3a3a3a3a',
    guid: '3b3b3b3b-3b3b-3b3b-3b3b-3b3b3b3b3b3b',
    title: 'Electronics and Gadgets',
    description: 'Old and new electronics.',
    address: '789 Pine Ln, Anytown, USA',
    latitude: 40.7128,
    longitude: -74.0060,
    start_datetime: '2025-11-09T11:00:00Z',
    end_datetime: '2025-11-09T15:00:00Z',
    photos: [`https://picsum.photos/200/300`],
    item_categories: [10],
    is_deleted: false,
    to_be_deleted: false,
    ended_early_flags: 0,
    ratings: [],
    comments: [
        { text: 'Lots of interesting gadgets.', timestamp: '2025-11-09T16:00:00Z' }
    ],
  }
];

module.exports = events;
