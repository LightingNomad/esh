-- Course coordinates (used to look up the nearest NOAA observation station)
-- and structured current-conditions weather data captured when a live round
-- is started. Both are nullable: existing courses/rounds simply won't have
-- this data, and rounds logged without a located course still work exactly
-- as before.

ALTER TABLE courses ADD COLUMN latitude REAL;
ALTER TABLE courses ADD COLUMN longitude REAL;

ALTER TABLE rounds ADD COLUMN temperature_f REAL;
ALTER TABLE rounds ADD COLUMN humidity_pct REAL;
ALTER TABLE rounds ADD COLUMN wind_speed_mph REAL;
ALTER TABLE rounds ADD COLUMN barometric_pressure_inhg REAL;
ALTER TABLE rounds ADD COLUMN dewpoint_f REAL;
ALTER TABLE rounds ADD COLUMN visibility_mi REAL;
ALTER TABLE rounds ADD COLUMN heat_index_f REAL;
