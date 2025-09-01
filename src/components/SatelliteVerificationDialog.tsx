import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Satellite, Leaf, MapPin, TrendingUp, Download, CheckCircle, AlertCircle } from "lucide-react";
import { SatelliteVerificationService } from "@/services/satelliteVerification";
import { PDFExportService } from "@/services/pdfExport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SatelliteVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditData: {
    id: string;
    farmer: {
      name: string;
      location: string;
      cropType: string;
      landArea: number;
    };
    creditValue: number;
    status: string;
    createdAt: string;
    farmInputs?: {
      fertilizer_use: string;
      irrigation_method: string;
      seed_type: string;
      soil_health: string;
    };
  };
  onVerificationComplete?: () => void;
}

export function SatelliteVerificationDialog({ 
  open, 
  onOpenChange, 
  creditData, 
  onVerificationComplete 
}: SatelliteVerificationDialogProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleVerification = async () => {
    setIsVerifying(true);
    
    try {
      const farmerData = {
        cropType: creditData.farmer.cropType,
        landArea: creditData.farmer.landArea,
        location: creditData.farmer.location,
        practices: {
          fertilizer: creditData.farmInputs?.fertilizer_use || 'Organic Manure',
          irrigation: creditData.farmInputs?.irrigation_method || 'Drip Irrigation',
          seedType: creditData.farmInputs?.seed_type || 'High Yield Variety',
          soilHealth: creditData.farmInputs?.soil_health || 'Good',
        },
      };

      const result = await SatelliteVerificationService.verifySatelliteData(farmerData);
      setVerificationResult(result);

      // Update the carbon credit in database with verification data
      const { error } = await supabase
        .from('carbon_credits')
        .update({
          status: result.isVerified ? 'Verified' : 'Pending',
          verification_date: result.verificationDate,
          ndvi_value: result.ndviData.value,
          satellite_land_area: result.landAreaVerification.satelliteDetectedArea,
          verification_source: result.source,
          verification_confidence: result.confidence,
        })
        .eq('id', creditData.id);

      if (error) throw error;

      toast({
        title: result.isVerified ? "Verification Successful!" : "Verification Completed",
        description: result.isVerified 
          ? `Carbon credit verified with ${result.confidence}% confidence`
          : "Additional data required for full verification",
      });

      onVerificationComplete?.();
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Failed",
        description: "Unable to complete satellite verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportPDF = async () => {
    if (!verificationResult) return;
    
    setIsExporting(true);
    
    try {
      const exportData = {
        id: creditData.id,
        farmer: creditData.farmer,
        creditValue: creditData.creditValue,
        status: verificationResult.isVerified ? 'Verified' : creditData.status,
        verificationDate: verificationResult.verificationDate,
        ndviValue: verificationResult.ndviData.value,
        satelliteSource: verificationResult.source,
        verificationConfidence: verificationResult.confidence,
        createdAt: creditData.createdAt,
      };

      await PDFExportService.exportVerifiedCreditToPDF(exportData);
      
      toast({
        title: "PDF Exported Successfully",
        description: "Carbon credit certificate has been downloaded",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Satellite className="h-6 w-6 text-primary" />
            <DialogTitle>Satellite Verification</DialogTitle>
          </div>
          <DialogDescription>
            Verify carbon credit using satellite imagery and NDVI analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Farmer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Farmer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">{creditData.farmer.name}</p>
                  <p className="text-muted-foreground">{creditData.farmer.location}</p>
                </div>
                <div>
                  <p><span className="font-medium">Crop:</span> {creditData.farmer.cropType}</p>
                  <p><span className="font-medium">Area:</span> {creditData.farmer.landArea} acres</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!verificationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Satellite className="h-5 w-5" />
                  Verification Process
                </CardTitle>
                <CardDescription>
                  Analyze satellite data to verify farmer claims using NDVI and land area detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ready to verify using satellite data</span>
                    <Button 
                      onClick={handleVerification} 
                      disabled={isVerifying}
                      className="flex items-center gap-2"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Satellite className="h-4 w-4" />
                          Start Verification
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {isVerifying && (
                    <div className="space-y-2">
                      <Progress value={33} className="w-full" />
                      <p className="text-xs text-muted-foreground text-center">
                        Analyzing satellite imagery from Sentinel-2 and Landsat-8...
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {verificationResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Verification Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    {verificationResult.isVerified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    )}
                    Verification Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <Badge variant={verificationResult.isVerified ? "default" : "secondary"} 
                             className={verificationResult.isVerified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                        {verificationResult.isVerified ? "Verified" : "Needs Review"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Confidence Score</span>
                        <span className="font-mono">{verificationResult.confidence}%</span>
                      </div>
                      <Progress value={verificationResult.confidence} className="h-2" />
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <p>Source: {verificationResult.source}</p>
                      <p>Resolution: {verificationResult.imageResolution}m</p>
                      <p>Cloud Coverage: {verificationResult.cloudCoverage}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* NDVI Analysis */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-green-600" />
                    Vegetation Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>NDVI Value</span>
                      <span className="font-mono text-lg">{verificationResult.ndviData.value}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Health Score</span>
                        <span className="font-mono">{verificationResult.ndviData.healthScore}/100</span>
                      </div>
                      <Progress value={verificationResult.ndviData.healthScore} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Health Status</span>
                      <Badge variant="outline">{verificationResult.vegetationAnalysis.healthStatus}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>NDVI Change</span>
                      <span className={`font-mono ${verificationResult.ndviData.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {verificationResult.ndviData.change > 0 ? '+' : ''}{verificationResult.ndviData.change}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Land Area Verification */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Land Area Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Reported Area</span>
                      <span className="font-mono">{verificationResult.landAreaVerification.reportedArea} acres</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Satellite Detected</span>
                      <span className="font-mono">{verificationResult.landAreaVerification.satelliteDetectedArea} acres</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Accuracy</span>
                        <span className="font-mono">{verificationResult.landAreaVerification.accuracy}%</span>
                      </div>
                      <Progress value={verificationResult.landAreaVerification.accuracy} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Carbon Sequestration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Carbon Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Sequestration Rate</span>
                      <span className="font-mono">{verificationResult.vegetationAnalysis.sequestrationRate} tCO₂/year</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Credit Value</span>
                      <span className="font-mono text-lg">{creditData.creditValue.toFixed(2)} tCO₂</span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <p>Based on {verificationResult.vegetationAnalysis.cropType} health assessment</p>
                      <p>Verified: {new Date(verificationResult.verificationDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions */}
          {verificationResult && (
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              
              {verificationResult.isVerified && (
                <Button
                  onClick={handleExportPDF}
                  disabled={isExporting}
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
                      Export Certificate PDF
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}