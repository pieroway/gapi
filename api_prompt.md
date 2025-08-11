**Prompt for Garage Sale Mobile App API v2**

**Objective:** Generate a comprehensive plan for creating a RESTful API for a garage sale mobile app. The API will manage events without user accounts, using a unique GUID for event administration. The plan should cover data models, API endpoints, backend logic, and technology recommendations.

---

### 1. Core Concepts

*   **Authentication:** There are no user accounts. When an event is created, a unique, non-guessable GUID is generated. This GUID is included in an "editor link" provided to the event creator. Anyone with this link can edit or delete the event.
*   **Event Lifecycle:**
    *   **Active:** A newly created event is active and visible on the map.
    *   **Soft Deleted:** An event creator can mark their event for deletion. The event is not immediately removed. If the creator accesses the editor link again, they are prompted to "un-delete" the event.
    *   **Expired:** Events are automatically marked for deletion after their end datetime has passed.
    *   **Flagged as Ended:** Visitors can flag an event as "ended early." The event remains on the map but with a special indicator. If multiple unique visitors flag it, the event is marked for deletion.
    *   **Hard Deleted:** A nightly cron job permanently deletes all events that are expired or have been marked for deletion.

---

### 2. Data Models

Define the database schemas for the following resources:

*   **Event:**
    *   `id` (Primary Key)
    *   `guid` (String, Unique, Indexed) - The secret lookup value for editing.
    *   `title` (String)
    *   `description` (Text)
    *   `address` (String, optional)
    *   `latitude` (Float, optional)
    *   `longitude` (Float, optional)
    *   `start_datetime` (DateTime)
    *   `end_datetime` (DateTime)
    *   `photos` (Array of Strings/JSON) - URLs to uploaded images.
    *   `item_categories` (Array of Strings) - e.g., ["clothes", "toys", "tools"].
    *   `is_deleted` (Boolean, default: false) - For soft deletes.
    *   `to_be_deleted` (Boolean, default: false) - For the nightly cleanup job.
    *   `ended_early_flags` (Integer, default: 0) - Counter for unique visitor flags.

*   **Category:**
    *   `id` (Primary Key)
    *   `name` (String, Unique) - The name of the sale category (e.g., "Garage Sale," "Estate Sale").

*   **Rating:**
    *   `id` (Primary Key)
    *   `event_id` (Foreign Key to Event)
    *   `value` (Integer, 1-10)
    *   `visitor_id` (String) - A unique identifier for the visitor to prevent multiple ratings.

*   **Comment:**
    *   `id` (Primary Key)
    *   `event_id` (Foreign Key to Event)
    *   `text` (String)
    *   `visitor_id` (String) - A unique identifier for the visitor.
    *   `created_at` (DateTime)

---

### 3. API Endpoints

Define the necessary API endpoints:

**Event Creator (Admin) Endpoints:**

*   `POST /api/events`: Creates a new event. Returns the event data including the `guid`.
*   `GET /api/events/edit/{guid}`: Retrieves event data for the editor page.
*   `PUT /api/events/edit/{guid}`: Updates an event's details.
*   `DELETE /api/events/edit/{guid}`: Marks an event as `is_deleted = true`.
*   `POST /api/events/edit/{guid}/undelete`: Sets `is_deleted = false`.

**Public (Mobile App) Endpoints:**

*   `GET /api/events`: Retrieves a list of all active events (`is_deleted = false` and `to_be_deleted = false`) for display on the map.
    *   Should include calculated average rating and recent comments.
*   `GET /api/events/{id}`: Retrieves detailed public information for a single event.
*   `POST /api/events/{id}/rate`: Submits a rating for an event.
*   `POST /api/events/{id}/comment`: Adds a comment to an event.
*   `POST /api/events/{id}/flag-ended`: Increments the `ended_early_flags` counter for an event.

**Admin Endpoints:**

*   `GET /api/categories`: Lists all sale categories.
*   `POST /api/categories`: Adds a new sale category (requires admin authentication).

---

### 4. Backend Logic

*   **Nightly Cleanup Job:**
    *   A cron job that runs at midnight (server time).
    *   It should perform two actions:
        1.  Find all events where `end_datetime` is in the past and set `to_be_deleted = true`.
        2.  Permanently delete all events from the database where `to_be_deleted = true`.
*   **Flagging Logic:**
    *   When a visitor flags an event as ended, the `ended_early_flags` count is incremented.
    *   If `ended_early_flags` reaches a certain threshold (e.g., 3), the event's `to_be_deleted` flag should be set to `true`.

---

### 5. Preset Data

*   **Initial Sale Categories:** Suggest a preset list for the `Category` table:
    *   "Garage Sale"
    *   "Yard Sale"
    *   "Estate Sale"
    *   "Moving Sale"
    *   "Community Sale"

---

### 6. Recommended Tools and Testing

*   **Technology Stack:** Recommend a suitable backend framework (Node.js/Express, Python/Django), database (PostgreSQL for location queries, MongoDB for flexibility), and hosting platform.
*   **Testing Strategy:** Outline a plan for unit, integration, and end-to-end testing. Suggest tools like Jest, Postman, and Cypress.
