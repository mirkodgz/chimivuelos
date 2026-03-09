-- Migration to add hotel-specific fields to other_services table
ALTER TABLE public.other_services ADD COLUMN IF NOT EXISTS hotel_location TEXT;
ALTER TABLE public.other_services ADD COLUMN IF NOT EXISTS hotel_days INTEGER;
ALTER TABLE public.other_services ADD COLUMN IF NOT EXISTS hotel_checkin TEXT;
ALTER TABLE public.other_services ADD COLUMN IF NOT EXISTS hotel_checkout TEXT;
ALTER TABLE public.other_services ADD COLUMN IF NOT EXISTS hotel_persons INTEGER;
ALTER TABLE public.other_services ADD COLUMN IF NOT EXISTS hotel_guest_names TEXT;
ALTER TABLE public.other_services ADD COLUMN IF NOT EXISTS internal_cost NUMERIC(15, 2) DEFAULT 0;
