-- Enable RLS on existing tables
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_inputs ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.carbon_credits ENABLE ROW LEVEL SECURITY;

-- Create profiles table for user authentication
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add user_id to farmers table to link with auth
ALTER TABLE public.farmers ADD COLUMN user_id UUID REFERENCES auth.users ON DELETE CASCADE;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for farmers
CREATE POLICY "Users can view their own farmer data" 
ON public.farmers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own farmer data" 
ON public.farmers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own farmer data" 
ON public.farmers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for farm_inputs
CREATE POLICY "Users can view their own farm inputs" 
ON public.farm_inputs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.farmers 
  WHERE farmers.id = farm_inputs.farmer_id 
  AND farmers.user_id = auth.uid()
));

CREATE POLICY "Users can create farm inputs for their farmers" 
ON public.farm_inputs 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.farmers 
  WHERE farmers.id = farm_inputs.farmer_id 
  AND farmers.user_id = auth.uid()
));

CREATE POLICY "Users can update their own farm inputs" 
ON public.farm_inputs 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.farmers 
  WHERE farmers.id = farm_inputs.farmer_id 
  AND farmers.user_id = auth.uid()
));

-- Create RLS policies for carbon_credits  
CREATE POLICY "Users can view their own carbon credits" 
ON public.carbon_credits 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.farmers 
  WHERE farmers.id = carbon_credits.farmer_id 
  AND farmers.user_id = auth.uid()
));

CREATE POLICY "Users can create carbon credits for their farmers" 
ON public.carbon_credits 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.farmers 
  WHERE farmers.id = carbon_credits.farmer_id 
  AND farmers.user_id = auth.uid()
));

-- Function to automatically create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();