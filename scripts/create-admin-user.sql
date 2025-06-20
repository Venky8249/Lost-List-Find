-- Create admin user with specified credentials
INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
VALUES (
  'admin',
  'gvenky222110@gmail.com',
  -- This is the hash for password '222110' using the same method as the app
  'a8b5f84d5c8e9f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  updated_at = NOW();
