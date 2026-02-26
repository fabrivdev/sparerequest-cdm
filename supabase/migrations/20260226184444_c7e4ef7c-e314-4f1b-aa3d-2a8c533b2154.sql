-- Allow creators to delete their own desarmes
CREATE POLICY "Creators can delete their own desarmes"
ON public.desarmes
FOR DELETE
USING (auth.uid() = created_by);

-- Allow deleting status logs for desarmes owned by the user
CREATE POLICY "Authenticated users can delete desarme logs"
ON public.desarme_status_log
FOR DELETE
USING (
  desarme_id IN (
    SELECT id FROM public.desarmes WHERE created_by = auth.uid()
  )
);