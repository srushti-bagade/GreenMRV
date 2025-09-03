import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Leaf, TrendingUp, Award, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatbotWidget } from "@/components/ChatbotWidget";

interface CarbonCredit {
  id: string;
  credit_value: number;
  status: string;
  created_at: string;
}

interface Farmer {
  id: string;
  name: string;
  crop_type: string;
  land_area: number;
  location: string;
}

const mockBarData = [
  { month: "Jan", credits: 45 },
  { month: "Feb", credits: 52 },
  { month: "Mar", credits: 38 },
  { month: "Apr", credits: 61 },
  { month: "May", credits: 55 },
  { month: "Jun", credits: 67 },
];

const statusColors = {
  Pending: "#f59e0b",
  Verified: "#10b981", 
  Rejected: "#ef4444"
} as const;

export default function Dashboard() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CarbonCredit[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch farmers
        const { data: farmersData } = await supabase
          .from("farmers")
          .select("*")
          .eq("user_id", user.id);

        if (farmersData) {
          setFarmers(farmersData);

          // Fetch carbon credits for user's farmers
          const farmerIds = farmersData.map(f => f.id);
          if (farmerIds.length > 0) {
            const { data: creditsData } = await supabase
              .from("carbon_credits")
              .select("*")
              .in("farmer_id", farmerIds);

            if (creditsData) {
              setCredits(creditsData);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const totalCredits = credits.reduce((sum, credit) => sum + (credit.credit_value || 0), 0);
  const verifiedCredits = credits.filter(c => c.status === "Verified").length;
  const pendingCredits = credits.filter(c => c.status === "Pending").length;
  const totalFarmArea = farmers.reduce((sum, farmer) => sum + (farmer.land_area || 0), 0);

  const pieData = [
    { name: "Verified", value: verifiedCredits, color: statusColors.Verified },
    { name: "Pending", value: pendingCredits, color: statusColors.Pending },
    { name: "Rejected", value: credits.filter(c => c.status === "Rejected").length, color: statusColors.Rejected }
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your carbon farming impact</p>
          <p className="text-sm mt-2 text-primary">
            💡 Visit <strong>Carbon Registry</strong> in the sidebar to verify credits with satellite data and export PDFs
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Carbon credits earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCredits}</div>
            <p className="text-xs text-muted-foreground">Verified credits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCredits}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farm Area</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFarmArea.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Acres managed</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Carbon Credits (Sample Data)</CardTitle>
            <CardDescription>Credits generated over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="credits" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit Status Distribution</CardTitle>
            <CardDescription>Current status of your carbon credits</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No credit data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Your Farmers</CardTitle>
          <CardDescription>Overview of registered farmers</CardDescription>
        </CardHeader>
        <CardContent>
          {farmers.length > 0 ? (
            <div className="space-y-4">
              {farmers.map((farmer) => (
                <div key={farmer.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{farmer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {farmer.crop_type} • {farmer.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{farmer.land_area} acres</p>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No farmers registered yet.</p>
              <p className="text-sm">Add a farmer to get started with carbon credit tracking.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* AI Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
}