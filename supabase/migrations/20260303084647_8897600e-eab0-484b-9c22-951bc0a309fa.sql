
-- Add INSERT/UPDATE/DELETE policies for admin-managed tables

-- events: INSERT, UPDATE, DELETE
CREATE POLICY "Anyone can insert events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete events" ON public.events FOR DELETE USING (true);

-- items: INSERT, UPDATE
CREATE POLICY "Anyone can insert items" ON public.items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update items" ON public.items FOR UPDATE USING (true);

-- timer_config: INSERT, UPDATE
CREATE POLICY "Anyone can insert timer_config" ON public.timer_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update timer_config" ON public.timer_config FOR UPDATE USING (true);

-- app_config: INSERT, UPDATE
CREATE POLICY "Anyone can insert app_config" ON public.app_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update app_config" ON public.app_config FOR UPDATE USING (true);

-- deletion_log: INSERT
CREATE POLICY "Anyone can insert deletion_log" ON public.deletion_log FOR INSERT WITH CHECK (true);
