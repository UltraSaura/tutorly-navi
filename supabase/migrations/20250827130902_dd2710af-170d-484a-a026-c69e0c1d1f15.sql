-- First, drop the existing check constraint on user_type
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Add a new check constraint that allows 'student', 'parent', and 'admin'
ALTER TABLE users ADD CONSTRAINT users_user_type_check 
CHECK (user_type IN ('student', 'parent', 'admin'));

-- Now update the user to be an admin
UPDATE users 
SET user_type = 'admin' 
WHERE email = 'hmtraore@gmail.com';