-- Admin/user roles, backing the new /admin/users management dashboard.
-- Seeds the account owner as the sole initial admin; everyone else defaults
-- to 'user' and gets no access to the dashboard.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

UPDATE users SET role = 'admin' WHERE email = 'edward.s.hansen@gmail.com';
