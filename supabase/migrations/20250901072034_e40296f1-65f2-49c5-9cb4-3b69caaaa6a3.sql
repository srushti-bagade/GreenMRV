-- Add satellite verification fields to carbon_credits table
ALTER TABLE public.carbon_credits ADD COLUMN verification_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.carbon_credits ADD COLUMN ndvi_value NUMERIC(4,3);
ALTER TABLE public.carbon_credits ADD COLUMN satellite_land_area NUMERIC(8,2);
ALTER TABLE public.carbon_credits ADD COLUMN verification_source TEXT DEFAULT 'Sentinel-2 ESA';
ALTER TABLE public.carbon_credits ADD COLUMN verification_confidence NUMERIC(3,1);
ALTER TABLE public.carbon_credits ADD COLUMN satellite_image_url TEXT;

-- Add an index for faster verification queries
CREATE INDEX idx_carbon_credits_verification ON public.carbon_credits(verification_date, status);

-- Update existing records with sample verification data for demo
UPDATE public.carbon_credits 
SET 
  ndvi_value = 0.650 + (RANDOM() * 0.300), -- NDVI between 0.65-0.95 (healthy vegetation)
  satellite_land_area = COALESCE((SELECT land_area FROM farmers WHERE farmers.id = carbon_credits.farmer_id), 0) * (0.95 + (RANDOM() * 0.10)), -- Within 95-105% of reported area
  verification_source = CASE 
    WHEN RANDOM() > 0.5 THEN 'Sentinel-2 ESA'
    ELSE 'Landsat-8 NASA'
  END,
  verification_confidence = 88.0 + (RANDOM() * 10.0) -- Confidence between 88-98%
WHERE status = 'Verified';

-- Add satellite verification metadata table for detailed records
CREATE TABLE public.satellite_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carbon_credit_id UUID NOT NULL REFERENCES public.carbon_credits(id),
  verification_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ndvi_value NUMERIC(4,3) NOT NULL,
  ndvi_change NUMERIC(4,3), -- Change from baseline
  land_coverage_analysis JSONB, -- Detailed land use analysis
  vegetation_health_score NUMERIC(3,1),
  carbon_sequestration_rate NUMERIC(6,3),
  satellite_source TEXT NOT NULL,
  image_resolution_meters NUMERIC(4,1),
  cloud_coverage_percent NUMERIC(3,1),
  verification_algorithm TEXT DEFAULT 'NDVI-Enhanced Carbon Assessment v2.1',
  quality_flags JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on satellite verifications
ALTER TABLE public.satellite_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for satellite verifications
CREATE POLICY "Users can view satellite verifications for their carbon credits" 
ON public.satellite_verifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM carbon_credits cc
  JOIN farmers f ON f.id = cc.farmer_id
  WHERE cc.id = satellite_verifications.carbon_credit_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "System can insert satellite verifications"
ON public.satellite_verifications
FOR INSERT
WITH CHECK (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_satellite_verifications_updated_at
BEFORE UPDATE ON public.satellite_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();