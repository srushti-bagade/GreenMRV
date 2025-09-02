-- Add missing foreign key relationships
ALTER TABLE carbon_credits 
ADD CONSTRAINT carbon_credits_farmer_id_fkey 
FOREIGN KEY (farmer_id) REFERENCES farmers(id);

ALTER TABLE farm_inputs 
ADD CONSTRAINT farm_inputs_farmer_id_fkey 
FOREIGN KEY (farmer_id) REFERENCES farmers(id);

-- Add missing RLS policies for carbon credits updates
CREATE POLICY "Users can update their own carbon credits" 
ON carbon_credits 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM farmers 
  WHERE farmers.id = carbon_credits.farmer_id 
  AND farmers.user_id = auth.uid()
));