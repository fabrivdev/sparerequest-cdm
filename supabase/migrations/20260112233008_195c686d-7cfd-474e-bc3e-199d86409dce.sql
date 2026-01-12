-- Add image_url column to support_messages for attachments
ALTER TABLE public.support_messages 
ADD COLUMN image_url TEXT;

-- Create storage bucket for support chat images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-images', 'support-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload support images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-images');

-- Allow anyone to view support images (they're in public bucket)
CREATE POLICY "Anyone can view support images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'support-images');

-- Allow service role to manage images (for admin)
CREATE POLICY "Service role can manage support images"
ON storage.objects
FOR ALL
USING (bucket_id = 'support-images')
WITH CHECK (bucket_id = 'support-images');