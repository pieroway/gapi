INSERT INTO gapi_sale_types (id, name) VALUES (1, 'Garage Sale'), (2, 'Yard Sale');
INSERT INTO gapi_item_categories (id, name) VALUES (1, 'Books'), (2, 'Tools'), (3, 'Furniture');
INSERT INTO gapi_events (public_id, edit_guid, title, description, address, latitude, longitude, start_datetime, end_datetime, sale_type_id, is_deleted)
VALUES ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Fixture sale', 'Deterministic listing', '1 Test Street', 45.42, -75.69, '2030-06-01 09:00:00', '2030-06-01 15:00:00', 1, FALSE),
('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Deleted fixture', 'Hidden listing', '2 Test Street', 45.43, -75.70, '2030-06-02 09:00:00', '2030-06-02 15:00:00', 2, TRUE);
INSERT INTO gapi_event_item_categories (event_id, category_id) VALUES (1, 1), (1, 2), (2, 3);
