-- Demo data for hospitals
INSERT INTO hospitals (id, hospital_name, latitude, longitude, available_beds, emergency_available)
VALUES 
    (1, 'Apollo Emergency Hospital', 17.4116, 78.4143, 12, TRUE),
    (2, 'Yashoda Hospital', 17.4273, 78.5034, 5, TRUE),
    (3, 'Care Emergency Hospital', 17.4174, 78.4481, 8, TRUE),
    (4, 'KIMS Hospital', 17.4326, 78.4901, 15, TRUE)
ON CONFLICT (id) DO UPDATE SET 
    hospital_name = EXCLUDED.hospital_name,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    available_beds = EXCLUDED.available_beds,
    emergency_available = EXCLUDED.emergency_available;
