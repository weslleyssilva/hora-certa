
-- Table to store push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all subscriptions (needed for sending notifications)  
CREATE POLICY "Admins can read all subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Enable realtime on tickets table for in-app notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
