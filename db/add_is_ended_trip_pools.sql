-- This script adds the is_ended column to the trip_pools table.
-- It ensures that we can persist whether a trip has been ended.

ALTER TABLE public.trip_pools
ADD COLUMN IF NOT EXISTS is_ended BOOLEAN DEFAULT false;
