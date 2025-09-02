-- Add missing RLS policies for carbon credits updates
CREATE POLICY "Users can update their own carbon credits" 
ON carbon_credits 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM farmers 
  WHERE farmers.id = carbon_credits.farmer_id 
  AND farmers.user_id = auth.uid()
));