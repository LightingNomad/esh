-- Automated NOAA-sourced weather description (e.g. "Mostly Cloudy"), captured
-- alongside the structured numeric conditions added in 0004. This is separate
-- from the existing manually-entered weather_conditions field/preset and never
-- overwrites it -- the two are stored and displayed independently.

ALTER TABLE rounds ADD COLUMN weather_description TEXT;
