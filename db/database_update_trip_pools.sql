CREATE TABLE IF NOT EXISTS trip_pools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  increment_amount NUMERIC NOT NULL DEFAULT 50,
  auto_charge_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_charge_amount NUMERIC NOT NULL DEFAULT 50,
  auto_charge_weekday INTEGER NOT NULL DEFAULT 5 CHECK (auto_charge_weekday BETWEEN 0 AND 6),
  charge_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_auto_charge_at TIMESTAMP WITH TIME ZONE,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE trip_pools ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trip_pools' AND policyname = 'Users can insert their own trip pools'
  ) THEN
    CREATE POLICY "Users can insert their own trip pools" ON trip_pools
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trip_pools' AND policyname = 'Users can view their own trip pools'
  ) THEN
    CREATE POLICY "Users can view their own trip pools" ON trip_pools
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trip_pools' AND policyname = 'Users can update their own trip pools'
  ) THEN
    CREATE POLICY "Users can update their own trip pools" ON trip_pools
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'trip_pools' AND policyname = 'Users can delete their own trip pools'
  ) THEN
    CREATE POLICY "Users can delete their own trip pools" ON trip_pools
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS trip_pools_user_id_idx ON trip_pools (user_id);
