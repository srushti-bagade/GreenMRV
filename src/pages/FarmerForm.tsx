import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, MapPin, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface FarmerFormData {
  name: string;
  location: string;
  cropType: string;
  landArea: number;
  contact: string;
  fertilizer: string;
  irrigation: string;
  seedType: string;
  soilHealth: string;
}

const locations = [
  "Maharashtra", "Punjab", "Haryana", "Uttar Pradesh", "West Bengal", 
  "Gujarat", "Rajasthan", "Karnataka", "Andhra Pradesh", "Tamil Nadu"
];

const cropTypes = [
  "Rice", "Wheat", "Maize", "Sugarcane", "Cotton", "Pulses", 
  "Agroforestry", "Organic Vegetables", "Millets", "Soybean"
];

const practices = {
  fertilizer: ["Organic Manure", "Bio-fertilizer", "Compost", "Green Manure", "Reduced Chemical"],
  irrigation: ["Drip Irrigation", "Sprinkler", "Alternate Wetting/Drying", "Rainwater Harvesting", "Traditional"],
  seedType: ["High Yield Variety", "Drought Resistant", "Organic Seeds", "Local Variety", "Hybrid"],
  soilHealth: ["Excellent", "Good", "Average", "Needs Improvement", "Poor"]
};

export default function FarmerForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FarmerFormData>();

  const onSubmit = async (data: FarmerFormData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit farmer data",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert farmer data
      const { data: farmerData, error: farmerError } = await supabase
        .from("farmers")
        .insert({
          user_id: user.id,
          name: data.name,
          location: data.location,
          crop_type: data.cropType,
          land_area: data.landArea,
          contact: data.contact
        })
        .select()
        .single();

      if (farmerError) throw farmerError;

      // Insert farm inputs data
      const { error: inputsError } = await supabase
        .from("farm_inputs")
        .insert({
          farmer_id: farmerData.id,
          fertilizer_use: data.fertilizer,
          irrigation_method: data.irrigation,
          seed_type: data.seedType,
          soil_health: data.soilHealth
        });

      if (inputsError) throw inputsError;

      // Create initial carbon credit entry
      const estimatedCredits = calculateEstimatedCredits(data);
      const { error: creditError } = await supabase
        .from("carbon_credits")
        .insert({
          farmer_id: farmerData.id,
          credit_value: estimatedCredits,
          status: "Pending"
        });

      if (creditError) throw creditError;

      toast({
        title: "Farmer registered successfully!",
        description: `${data.name} has been registered with estimated ${estimatedCredits.toFixed(2)} carbon credits.`
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error submitting farmer data:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Failed to register farmer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateEstimatedCredits = (data: FarmerFormData): number => {
    let baseCredits = data.landArea * 0.5; // Base credits per acre
    
    // Bonus for sustainable practices
    if (data.fertilizer === "Organic Manure") baseCredits *= 1.3;
    if (data.irrigation === "Drip Irrigation") baseCredits *= 1.2;
    if (data.cropType === "Agroforestry") baseCredits *= 1.5;
    if (data.seedType === "Organic Seeds") baseCredits *= 1.1;
    
    return baseCredits;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Register New Farmer</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Farmer Registration Form</CardTitle>
          <CardDescription>
            Enter farmer details and sustainable farming practices to calculate carbon credits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Leaf className="h-5 w-5" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Farmer Name *</Label>
                  <Input
                    id="name"
                    {...register("name", { required: "Name is required" })}
                    placeholder="Enter farmer's full name"
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Number</Label>
                  <Input
                    id="contact"
                    {...register("contact")}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select onValueChange={(value) => setValue("location", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cropType">Crop Type *</Label>
                  <Select onValueChange={(value) => setValue("cropType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select crop type" />
                    </SelectTrigger>
                    <SelectContent>
                      {cropTypes.map((crop) => (
                        <SelectItem key={crop} value={crop}>
                          {crop}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="landArea">Land Area (Acres) *</Label>
                  <Input
                    id="landArea"
                    type="number"
                    step="0.1"
                    {...register("landArea", { 
                      required: "Land area is required",
                      min: { value: 0.1, message: "Land area must be at least 0.1 acres" }
                    })}
                    placeholder="Enter land area in acres"
                  />
                  {errors.landArea && <p className="text-sm text-destructive">{errors.landArea.message}</p>}
                </div>
              </div>
            </div>

            {/* Farming Practices */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Sustainable Farming Practices
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fertilizer Use</Label>
                  <Select onValueChange={(value) => setValue("fertilizer", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fertilizer type" />
                    </SelectTrigger>
                    <SelectContent>
                      {practices.fertilizer.map((practice) => (
                        <SelectItem key={practice} value={practice}>
                          {practice}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Irrigation Method</Label>
                  <Select onValueChange={(value) => setValue("irrigation", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select irrigation method" />
                    </SelectTrigger>
                    <SelectContent>
                      {practices.irrigation.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Seed Type</Label>
                  <Select onValueChange={(value) => setValue("seedType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select seed type" />
                    </SelectTrigger>
                    <SelectContent>
                      {practices.seedType.map((seed) => (
                        <SelectItem key={seed} value={seed}>
                          {seed}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Soil Health</Label>
                  <Select onValueChange={(value) => setValue("soilHealth", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select soil health" />
                    </SelectTrigger>
                    <SelectContent>
                      {practices.soilHealth.map((health) => (
                        <SelectItem key={health} value={health}>
                          {health}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Registering Farmer..." : "Register Farmer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}