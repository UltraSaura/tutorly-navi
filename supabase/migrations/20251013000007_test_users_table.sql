-- Simple test to create a user manually and see what happens
-- This will help us debug the trigger issue

-- Test inserting a user directly to see if the table structure is correct
-- We'll use a test email that won't conflict

DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Generate a test UUID
    test_user_id := gen_random_uuid();
    
    -- Try to insert into users table directly
    INSERT INTO public.users (id, email, user_type, first_name, last_name, country, phone_number, username) 
    VALUES (
        test_user_id,
        'test@example.com',
        'parent',
        'Test',
        'User',
        'US',
        '+1234567890',
        NULL
    );
    
    RAISE NOTICE 'Direct insert successful for user: %', test_user_id;
    
    -- Clean up
    DELETE FROM public.users WHERE id = test_user_id;
    RAISE NOTICE 'Test user cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test insert: %', SQLERRM;
END $$;
