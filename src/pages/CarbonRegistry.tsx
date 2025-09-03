import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Filter, Satellite, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SatelliteVerificationDialog } from "@/components/SatelliteVerificationDialog";
import { PDFExportService } from "@/services/pdfExport";
import { useToast } from "@/hooks/use-toast";

interface CarbonCreditWithFarmer {
  id: string;
  credit_value: number;
  status: string;
  created_at: string;
  verification_date?: string;
  ndvi_value?: number;
  satellite_land_area?: number;
  verification_source?: string;
  verification_confidence?: number;
  farmer: {
    name: string;
    location: string;
    crop_type: string;
    land_area: number;
  };
  farm_inputs?: {
    fertilizer_use: string;
    irrigation_method: string;
    seed_type: string;
    soil_health: string;
  };
}

export default function CarbonRegistry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState<CarbonCreditWithFarmer[]>([]);
  const [filteredCredits, setFilteredCredits] = useState<CarbonCreditWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCredit, setSelectedCredit] = useState<CarbonCreditWithFarmer | null>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;

      try {
        // First get carbon credits with farmers
        const { data: creditsData, error: creditsError } = await supabase
          .from("carbon_credits")
          .select(`
            *,
            farmers!inner (
              name,
              location,
              crop_type,
              land_area,
              user_id
            )
          `)
          .eq("farmers.user_id", user.id)
          .order("created_at", { ascending: false });

        if (creditsError) throw creditsError;

        // Then get farm inputs separately
        const farmerIds = creditsData?.map(item => item.farmer_id).filter(Boolean) || [];
        let farmInputsData: any[] = [];
        
        if (farmerIds.length > 0) {
          const { data: inputsData, error: inputsError } = await supabase
            .from("farm_inputs")
            .select("*")
            .in("farmer_id", farmerIds);
          
          if (!inputsError) {
            farmInputsData = inputsData || [];
          }
        }

        const formattedData: CarbonCreditWithFarmer[] = creditsData?.map(item => {
          const farmInput = farmInputsData.find(input => input.farmer_id === item.farmer_id);
          
          return {
            id: item.id,
            credit_value: item.credit_value,
            status: item.status,
            created_at: item.created_at,
            verification_date: item.verification_date,
            ndvi_value: item.ndvi_value,
            satellite_land_area: item.satellite_land_area,
            verification_source: item.verification_source,
            verification_confidence: item.verification_confidence,
            farmer: {
              name: item.farmers.name,
              location: item.farmers.location,
              crop_type: item.farmers.crop_type,
              land_area: item.farmers.land_area
            },
            farm_inputs: farmInput
          };
        }) || [];

        setCredits(formattedData);
        setFilteredCredits(formattedData);
      } catch (error) {
        console.error("Error fetching carbon credits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, [user]);

  useEffect(() => {
    let filtered = credits;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(credit =>
        credit.farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        credit.farmer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        credit.farmer.crop_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(credit => 
        credit.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredCredits(filtered);
  }, [searchTerm, statusFilter, credits]);

  const getStatusBadge = (status: string, hasVerification?: boolean) => {
    const statusMap = {
      Pending: { variant: "secondary" as const, color: "bg-amber-100 text-amber-800" },
      Verified: { variant: "default" as const, color: "bg-green-100 text-green-800" },
      Rejected: { variant: "destructive" as const, color: "bg-red-100 text-red-800" }
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.Pending;
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className={config.color}>
          {status}
        </Badge>
        {hasVerification && status === 'Verified' && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Satellite className="h-3 w-3 mr-1" />
            Satellite
          </Badge>
        )}
      </div>
    );
  };

  const handleVerificationComplete = () => {
    setVerificationDialog(false);
    setSelectedCredit(null);
    // Refresh the data by re-running the initial fetch
    window.location.reload(); // Simple solution to ensure fresh data
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    
    try {
      const exportData = filteredCredits.map(credit => ({
        id: credit.id,
        farmer: {
          name: credit.farmer.name,
          location: credit.farmer.location,
          cropType: credit.farmer.crop_type,
          landArea: credit.farmer.land_area,
        },
        creditValue: credit.credit_value,
        status: credit.status,
        verificationDate: credit.verification_date,
        ndviValue: credit.ndvi_value,
        satelliteSource: credit.verification_source,
        verificationConfidence: credit.verification_confidence,
        createdAt: credit.created_at,
      }));

      await PDFExportService.exportMultipleCreditsToPDF(exportData);
      
      toast({
        title: "Registry Exported Successfully",
        description: `Exported ${filteredCredits.length} carbon credit records to PDF`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to export registry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const fetchCredits = async () => {}; // Empty function to avoid duplication

  const totalCredits = filteredCredits.reduce((sum, credit) => sum + (credit.credit_value || 0), 0);
  const verifiedCredits = filteredCredits.filter(c => c.status === "Verified").reduce((sum, credit) => sum + (credit.credit_value || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading carbon registry...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Carbon Credit Registry</h1>
        </div>
        
        <Button
          onClick={handleExportAll}
          disabled={isExporting || filteredCredits.length === 0}
          className="flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export Registry PDF
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All registered credits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCredits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ready for trading</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCredits.length}</div>
            <p className="text-xs text-muted-foreground">Credit records</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Registry Filters</CardTitle>
          <CardDescription>Filter and search through carbon credit records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by farmer name, location, or crop type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registry Table */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Records</CardTitle>
          <CardDescription>Complete registry of all carbon credit entries</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCredits.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Crop Type</TableHead>
                    <TableHead>Land Area</TableHead>
                    <TableHead>Credit Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell className="font-medium">{credit.farmer.name}</TableCell>
                      <TableCell>{credit.farmer.location}</TableCell>
                      <TableCell>{credit.farmer.crop_type}</TableCell>
                      <TableCell>{credit.farmer.land_area} acres</TableCell>
                      <TableCell className="font-mono">
                        {credit.credit_value?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(credit.status, !!credit.verification_date)}
                      </TableCell>
                      <TableCell>
                        {credit.verification_date && credit.ndvi_value ? (
                          <div className="text-xs">
                            <p className="font-mono">NDVI: {credit.ndvi_value.toFixed(3)}</p>
                            <p className="text-muted-foreground">{credit.verification_source}</p>
                            <p className="text-muted-foreground">{credit.verification_confidence}% confidence</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not verified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(credit.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCredit(credit);
                              setVerificationDialog(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            {credit.verification_date ? (
                              <>
                                <Eye className="h-3 w-3" />
                                View
                              </>
                            ) : (
                              <>
                                <Satellite className="h-3 w-3" />
                                Verify
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No credits found</p>
              <p className="text-sm">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your filters or search terms"
                  : "Register farmers to start generating carbon credits"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Satellite Verification Dialog */}
      {selectedCredit && (
        <SatelliteVerificationDialog
          open={verificationDialog}
          onOpenChange={setVerificationDialog}
          creditData={{
            id: selectedCredit.id,
            farmer: {
              name: selectedCredit.farmer.name,
              location: selectedCredit.farmer.location,
              cropType: selectedCredit.farmer.crop_type,
              landArea: selectedCredit.farmer.land_area,
            },
            creditValue: selectedCredit.credit_value,
            status: selectedCredit.status,
            createdAt: selectedCredit.created_at,
            farmInputs: selectedCredit.farm_inputs
          }}
          onVerificationComplete={handleVerificationComplete}
        />
      )}
    </div>
  );
}