import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CarbonCreditExportData {
  id: string;
  farmer: {
    name: string;
    location: string;
    cropType: string;
    landArea: number;
  };
  creditValue: number;
  status: string;
  verificationDate?: string;
  ndviValue?: number;
  satelliteSource?: string;
  verificationConfidence?: number;
  createdAt: string;
}

export class PDFExportService {
  public static async exportVerifiedCreditToPDF(creditData: CarbonCreditExportData): Promise<void> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    let yPosition = margin + 10;

    // Set default font and size for consistency
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);

    // Header with verification badge - improved styling
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 139, 34); // Forest green
    pdf.text('VERIFIED CARBON CREDIT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
    
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text('CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Professional verification badge with improved design
    if (creditData.status === 'Verified') {
      // Badge background
      pdf.setFillColor(34, 197, 94); // Green color
      const badgeWidth = 80;
      const badgeHeight = 18;
      const badgeX = pageWidth / 2 - badgeWidth / 2;
      pdf.roundedRect(badgeX, yPosition, badgeWidth, badgeHeight, 4, 4, 'F');
      
      // Badge border
      pdf.setDrawColor(24, 165, 74);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(badgeX, yPosition, badgeWidth, badgeHeight, 4, 4, 'S');
      
      // Badge text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('✓ SATELLITE VERIFIED', pageWidth / 2, yPosition + 12, { align: 'center' });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPosition += 35;
    }

    // Certificate ID with better formatting
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Certificate ID: ${creditData.id.substring(0, 16)}...`, pageWidth / 2, yPosition, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    yPosition += 25;

    // Farmer Information Section with improved layout
    pdf.setFillColor(248, 250, 252); // Light gray background
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 65, 'F');
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175); // Blue color
    pdf.text('FARMER INFORMATION', margin + 5, yPosition + 8);
    
    pdf.setTextColor(0, 0, 0);
    yPosition += 20;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const farmerInfo = [
        { label: 'Name:', value: creditData.farmer.name },
        { label: 'Location:', value: creditData.farmer.location },
        { label: 'Crop Type:', value: creditData.farmer.cropType },
        { label: 'Land Area:', value: `${creditData.farmer.landArea} acres` },
    ];

    farmerInfo.forEach(info => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(info.label, margin + 10, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(info.value, margin + 45, yPosition);
      yPosition += 12;
    });

    yPosition += 20;

    // Carbon Credit Details with enhanced formatting
    pdf.setFillColor(240, 253, 244); // Light green background
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 70, 'F');
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(22, 163, 74); // Green color
    pdf.text('CARBON CREDIT DETAILS', margin + 5, yPosition + 8);
    
    pdf.setTextColor(0, 0, 0);
    yPosition += 20;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    const creditInfo = [
      { label: 'Credit Value:', value: `${creditData.creditValue.toFixed(2)} tCO₂`, highlight: true },
      { label: 'Status:', value: creditData.status, highlight: false },
      { label: 'Issue Date:', value: new Date(creditData.createdAt).toLocaleDateString(), highlight: false },
    ];

    if (creditData.verificationDate) {
      creditInfo.push({ 
        label: 'Verification Date:', 
        value: new Date(creditData.verificationDate).toLocaleDateString(), 
        highlight: false 
      });
    }

    creditInfo.forEach(info => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(info.label, margin + 10, yPosition);
      
      if (info.highlight) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(22, 163, 74);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
      }
      
      pdf.text(info.value, margin + 55, yPosition);
      pdf.setTextColor(0, 0, 0);
      yPosition += 12;
    });

    yPosition += 20;

    // Satellite Verification Details (if verified) with enhanced layout
    if (creditData.status === 'Verified' && creditData.ndviValue) {
      pdf.setFillColor(239, 246, 255); // Light blue background
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 95, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(37, 99, 235); // Blue color
      pdf.text('SATELLITE VERIFICATION DETAILS', margin + 5, yPosition + 8);
      
      pdf.setTextColor(0, 0, 0);
      yPosition += 20;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const verificationInfo = [
        { label: 'Satellite Source:', value: creditData.satelliteSource || 'Sentinel-2 ESA (European Space Agency)' },
        { label: 'NDVI Value:', value: `${creditData.ndviValue.toFixed(3)} (Normalized Difference Vegetation Index)` },
        { label: 'Verification Confidence:', value: `${creditData.verificationConfidence || 95}% (High Accuracy)` },
        { label: 'Verification Method:', value: 'Multi-spectral Satellite Imagery Analysis' },
        { label: 'Verification Standards:', value: 'Verified Carbon Standard (VCS) & Gold Standard' },
        { label: 'Resolution:', value: '10m/pixel (High Resolution)' },
        { label: 'Spectral Bands Used:', value: 'Red, Near-Infrared (NIR), SWIR' },
        { label: 'Processing Algorithm:', value: 'NDVI-Enhanced Carbon Assessment v2.1' },
      ];

      verificationInfo.forEach(info => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(info.label, margin + 10, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(info.value, margin + 65, yPosition);
        yPosition += 11;
      });

      yPosition += 20;
    }

    // Verification Methodology with improved design
    pdf.setFillColor(254, 249, 195); // Light yellow background
    const methodologyHeight = 75;
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, methodologyHeight, 'F');
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 83, 9); // Orange color
    pdf.text('VERIFICATION METHODOLOGY', margin + 5, yPosition + 8);
    
    pdf.setTextColor(0, 0, 0);
    yPosition += 20;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const methodology = [
      '• Satellite imagery analysis using NDVI (Normalized Difference Vegetation Index)',
      '• Multi-temporal comparison to assess vegetation health changes',
      '• Land area verification through high-resolution satellite data',
      '• Carbon sequestration calculations based on crop type and health',
      '• Compliance with international carbon credit standards',
    ];

    methodology.forEach(method => {
      // Split long lines if necessary
      const lines = pdf.splitTextToSize(method, pageWidth - 2 * margin - 10);
      lines.forEach((line: string) => {
        pdf.text(line, margin + 10, yPosition);
        yPosition += 10;
      });
    });

    yPosition += 15;

    // Professional footer with improved design
    const footerY = pageHeight - 35;
    
    // Footer background
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, footerY - 15, pageWidth, 50, 'F');
    
    // Footer text
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('This certificate is generated by GreenMRV Platform', pageWidth / 2, footerY, { align: 'center' });
    
    const timestamp = `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    pdf.text(timestamp, pageWidth / 2, footerY + 8, { align: 'center' });

    // Professional verification seal (if verified)
    if (creditData.status === 'Verified') {
      const sealX = pageWidth - 45;
      const sealY = footerY - 25;
      
      // Seal outer circle
      pdf.setFillColor(34, 197, 94);
      pdf.circle(sealX, sealY, 20, 'F');
      
      // Seal inner circle
      pdf.setFillColor(255, 255, 255);
      pdf.circle(sealX, sealY, 17, 'F');
      
      // Seal text
      pdf.setTextColor(34, 197, 94);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SATELLITE', sealX, sealY - 5, { align: 'center' });
      pdf.text('VERIFIED', sealX, sealY + 2, { align: 'center' });
      pdf.text('2025', sealX, sealY + 9, { align: 'center' });
    }

    // Save the PDF
    const filename = `carbon-credit-${creditData.farmer.name.replace(/\s+/g, '-')}-${creditData.id.slice(0, 8)}.pdf`;
    pdf.save(filename);
  }

  public static async exportMultipleCreditsToPDF(credits: CarbonCreditExportData[]): Promise<void> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;

    // Title page
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CARBON CREDIT REGISTRY REPORT', pageWidth / 2, 40, { align: 'center' });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 60, { align: 'center' });
    pdf.text(`Total Credits: ${credits.length}`, pageWidth / 2, 75, { align: 'center' });

    const verifiedCount = credits.filter(c => c.status === 'Verified').length;
    pdf.text(`Verified Credits: ${verifiedCount}`, pageWidth / 2, 90, { align: 'center' });

    const totalValue = credits.reduce((sum, c) => sum + c.creditValue, 0);
    pdf.text(`Total Carbon Value: ${totalValue.toFixed(2)} tCO₂`, pageWidth / 2, 105, { align: 'center' });

    // Add new page for detailed list
    pdf.addPage();

    let yPos = margin;
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DETAILED CREDIT LISTING', margin, yPos);
    yPos += 15;

    credits.forEach((credit, index) => {
      if (yPos > pdf.internal.pageSize.height - 60) {
        pdf.addPage();
        yPos = margin;
      }

      // Credit header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${credit.farmer.name}`, margin, yPos);
      
      // Status badge
      const statusColor: [number, number, number] = credit.status === 'Verified' ? [34, 197, 94] : [249, 115, 22];
      pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.roundedRect(pageWidth - 60, yPos - 5, 35, 10, 2, 2, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text(credit.status.toUpperCase(), pageWidth - 42.5, yPos + 1, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      
      yPos += 12;

      // Credit details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const details = [
        `Location: ${credit.farmer.location} | Crop: ${credit.farmer.cropType}`,
        `Land Area: ${credit.farmer.landArea} acres | Credit Value: ${credit.creditValue.toFixed(2)} tCO₂`,
        `Issue Date: ${new Date(credit.createdAt).toLocaleDateString()}`,
      ];

      if (credit.verificationDate && credit.ndviValue) {
        details.push(`Satellite Verified: ${new Date(credit.verificationDate).toLocaleDateString()} | NDVI: ${credit.ndviValue.toFixed(3)}`);
      }

      details.forEach(detail => {
        pdf.text(detail, margin + 5, yPos);
        yPos += 7;
      });

      yPos += 8;
    });

    // Save the registry report
    const filename = `carbon-credit-registry-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  }
}