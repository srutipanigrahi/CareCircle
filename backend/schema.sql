CREATE TABLE IF NOT EXISTS users(
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN('elder','family')), elder_id INT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS checkins(
 id SERIAL PRIMARY KEY, elder_id INT REFERENCES users(id), mood TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS medicines(
 id SERIAL PRIMARY KEY, elder_id INT REFERENCES users(id), name TEXT NOT NULL, dosage TEXT, time TEXT);
CREATE TABLE IF NOT EXISTS appointments(
 id SERIAL PRIMARY KEY, elder_id INT REFERENCES users(id), doctor TEXT NOT NULL, appt_date TIMESTAMP NOT NULL, notes TEXT);
