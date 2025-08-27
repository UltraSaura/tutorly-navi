-- First, let's check the current constraint on user_type
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE '%user_type%';

-- If there's a check constraint, we need to modify it to allow 'admin'
-- Let's also see what values are currently allowed
SELECT DISTINCT user_type FROM users;