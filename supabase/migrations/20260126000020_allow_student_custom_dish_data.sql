-- Migration: Secure and fix student permissions for custom meals
-- Date: 2026-01-26

-- 1. Table permissions for dish_ingredients
-- Students should manage ingredients of dishes they own
DROP POLICY IF EXISTS "Admins have full control dish_ingredients" ON public.dish_ingredients;
DROP POLICY IF EXISTS "Dish Ingredients manage by admins" ON public.dish_ingredients;
DROP POLICY IF EXISTS "Students can manage their own dish ingredients" ON public.dish_ingredients;

CREATE POLICY "Manage dish ingredients"
ON public.dish_ingredients
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.dishes d
        WHERE d.id = dish_ingredients.dish_id
        AND (d.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.dishes d
        WHERE d.id = dish_ingredients.dish_id
        AND (d.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
    )
);

-- 2. Table permissions for diet_preparation_steps
-- Students should manage steps of dishes they own
DROP POLICY IF EXISTS "Admins have full control diet_preparation_steps" ON public.diet_preparation_steps;
DROP POLICY IF EXISTS "Students can manage their own dish preparation steps" ON public.diet_preparation_steps;

CREATE POLICY "Manage diet preparation steps"
ON public.diet_preparation_steps
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.dishes d
        WHERE d.id = diet_preparation_steps.diet_id
        AND (d.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.dishes d
        WHERE d.id = diet_preparation_steps.diet_id
        AND (d.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
    )
);

-- 3. Storage Bucket: diet-images
-- Allow users to manage files in their own subfolders
DROP POLICY IF EXISTS "Admin upload diet images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update diet images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete diet images" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload their own diet images" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own diet images" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own diet images" ON storage.objects;

-- Unified Storage Policies (Admin + User Specific Folder)
CREATE POLICY "Manage diet images"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'diet-images' 
    AND (
        -- Admin can do everything
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
        OR
        -- Users can managed files in 'user/{auth.uid()}/'
        ( (storage.foldername(name))[1] = 'user' AND (storage.foldername(name))[2] = auth.uid()::text )
        OR
        -- Allow system folder management (if we want users to upload there, but usually only admins)
        -- For now, let's keep users restricted to their folder
        false
    )
)
WITH CHECK (
    bucket_id = 'diet-images' 
    AND (
        EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
        OR
        ( (storage.foldername(name))[1] = 'user' AND (storage.foldername(name))[2] = auth.uid()::text )
    )
);
