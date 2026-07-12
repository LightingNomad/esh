-- Legacy CSV imports stored date_played as "M/D/YY" (e.g. "8/9/20"), while
-- every round the app creates itself has always used the <input type="date">
-- format "YYYY-MM-DD". Standardize existing rows to YYYY-MM-DD so date sort
-- and range filters work consistently across old and new data. Safe to
-- re-run: only rows still matching the legacy pattern are touched.
UPDATE rounds
SET date_played = printf(
  '20%s-%02d-%02d',
  substr(date_played, instr(date_played, '/') + instr(substr(date_played, instr(date_played, '/') + 1), '/') + 1),
  CAST(substr(date_played, 1, instr(date_played, '/') - 1) AS INTEGER),
  CAST(substr(substr(date_played, instr(date_played, '/') + 1), 1, instr(substr(date_played, instr(date_played, '/') + 1), '/') - 1) AS INTEGER)
)
WHERE date_played GLOB '[0-9]*/[0-9]*/[0-9][0-9]';
