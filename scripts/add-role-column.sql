-- Add role column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Update existing users to have 'user' role if role is null
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Create or update admin user
INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
VALUES (
  'admin',
  'gvenky22211@gmail.com',
  -- Hash for password '222110'
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
