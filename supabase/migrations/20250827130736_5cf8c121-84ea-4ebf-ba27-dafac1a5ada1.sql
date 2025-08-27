-- Update the first user to be an admin to enable admin panel access
UPDATE users 
SET user_type = 'admin' 
WHERE email = 'hmtraore@gmail.com';