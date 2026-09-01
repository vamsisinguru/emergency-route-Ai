-- Supabase Schema for Emergency Route AI

CREATE TABLE IF NOT EXISTS hospitals (
    id SERIAL PRIMARY KEY,
    hospital_name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    available_beds INTEGER NOT NULL DEFAULT 0,
    emergency_available BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS emergency_requests (
    id SERIAL PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    symptoms TEXT,
    heart_rate INTEGER NOT NULL,
    oxygen_level INTEGER NOT NULL,
    priority VARCHAR(50) NOT NULL,
    estimated_risk VARCHAR(50) NOT NULL,
    recommended_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
