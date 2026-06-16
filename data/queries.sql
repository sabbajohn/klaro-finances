-- SQLite
BEGIN TRANSACTION;

DELETE FROM expenses;
DELETE FROM goals;
DELETE FROM incomes;
DELETE FROM user_settings;
DELETE FROM users;
DELETE FROM sqlite_sequence WHERE name IN ('users', 'expenses', 'goals', 'incomes');

INSERT INTO users (name, email, pin)
VALUES
  ('Demo 1', 'demo1@klaro.app', '1234'),
  ('Demo 2', 'demo2@klaro.app', '1234'),
  ('Demo 3', 'demo3@klaro.app', '1234')
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  pin = excluded.pin;

INSERT INTO user_settings (user_id, monthly_budget)
SELECT id, 3200
FROM users
WHERE email IN (
  'demo1@klaro.app',
  'demo2@klaro.app',
  'demo3@klaro.app'
)
ON CONFLICT(user_id) DO UPDATE SET
  monthly_budget = excluded.monthly_budget;

COMMIT;
