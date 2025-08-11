# Garage Sale API

This is the backend API for a garage sale mobile application. It provides endpoints to manage garage sale events, including creating, reading, updating, and deleting events. It also supports features like image uploads, ratings, and comments.

## Features

*   **Event Management:** Create, retrieve, update, and delete garage sale events.
*   **Image Uploads:** Upload images for events using `multer`.
*   **Ratings and Comments:** Add ratings and comments to events.
*   **Category Management:** (Assumed from file structure) Manage event categories.
*   **Soft Deletes:** Events can be soft-deleted and recovered.

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v14 or later recommended)
*   [npm](https://www.npmjs.com/)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/pieroway/gapi.git
    cd gapi
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

To start the server, run the following command:

```bash
npm start
```

The server will start on `http://localhost:61571`.

For development, you can use `nodemon` to automatically restart the server on file changes:

```bash
npm run dev
```

## API Endpoints

Here is a summary of the available API endpoints.

### Event Endpoints (`/api/events`)

*   `GET /`: Get all active events.
*   `POST /`: Create a new event.
*   `GET /:id`: Get a single event by its ID.
*   `GET /edit/:guid`: Get event data for editing by its GUID.
*   `PUT /edit/:guid`: Update an event by its GUID.
*   `DELETE /edit/:guid`: Soft delete an event by its GUID.
*   `POST /edit/:guid/undelete`: Restore a soft-deleted event.
*   `POST /edit/:guid/photos`: Add a photo to an event.
*   `POST /:id/flag-ended`: Flag an event as ended.
*   `POST /:id/ratings`: Add a rating to an event.
*   `POST /:id/comments`: Add a comment to an event.

### Category Endpoints (`/api/categories`)

*   (Endpoints to be documented based on `routes/categories.js`)
