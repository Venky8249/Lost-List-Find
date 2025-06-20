-- Create a function to add role column if it doesn't exist
CREATE OR REPLACE FUNCTION add_role_column_if_not_exists()
RETURNS void AS $$
BEGIN
    -- Check if role column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
    ) THEN
        -- Add the role column
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        
        -- Update existing admin user
        UPDATE users 
        SET role = 'admin' 
        WHERE email = 'gvenky22211@gmail.com';
    END IF;
END;
$$ LANGUAGE plpgsql;
