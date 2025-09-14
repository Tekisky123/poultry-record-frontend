import jsPDF from 'jspdf';

/**
 * Downloads a comprehensive PDF report for a trip
 * @param {Object} trip - The trip data object
 */
export const downloadTripPDF = (trip) => {
  if (!trip) return;

  // Create new PDF document
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;
  const lineHeight = 7;

  // Helper function to add text with word wrap
  const addText = (text, x, y, options = {}) => {
    const { fontSize = 10, fontStyle = 'normal', align = 'left', color = '#000000' } = options;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color);
    
    if (align === 'center') {
      doc.text(text, pageWidth / 2, y, { align: 'center' });
    } else if (align === 'right') {
      doc.text(text, pageWidth - margin, y, { align: 'right' });
    } else {
      doc.text(text, x, y);
    }
  };

  // Helper function to add table row
  const addTableRow = (label, value, y, options = {}) => {
    const { labelBold = false, valueBold = false, valueAlign = 'right' } = options;
    addText(label, margin, y, { fontStyle: labelBold ? 'bold' : 'normal' });
    addText(value, pageWidth - margin, y, { 
      fontStyle: valueBold ? 'bold' : 'normal', 
      align: valueAlign 
    });
  };

  // Header
  addText('POULTRY RECORD MANAGEMENT SYSTEM', margin, yPosition, { 
    fontSize: 16, 
    fontStyle: 'bold', 
    align: 'center',
    color: '#1f2937'
  });
  yPosition += 10;
  
  addText('RCC AND TRADING COMPANY', margin, yPosition, { 
    fontSize: 12, 
    fontStyle: 'bold', 
    align: 'center',
    color: '#374151'
  });
  yPosition += 15;

  // Trip ID and Date
  addText(`Trip Report - ${trip.tripId}`, margin, yPosition, { 
    fontSize: 14, 
    fontStyle: 'bold',
    color: '#059669'
  });
  yPosition += 8;
  
  addText(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition, { 
    fontSize: 10,
    color: '#6b7280'
  });
  yPosition += 15;

  // PARTICULARS Section
  addText('PARTICULARS', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
  yPosition += 8;
  
  addTableRow('Date:', new Date(trip.date || trip.createdAt).toLocaleDateString(), yPosition);
  yPosition += lineHeight;
  addTableRow('Vehicle Number:', trip.vehicle?.vehicleNumber || 'N/A', yPosition);
  yPosition += lineHeight;
  addTableRow('Place:', trip.place || 'N/A', yPosition);
  yPosition += lineHeight;
  addTableRow('Supervisor:', trip.supervisor?.name || 'N/A', yPosition);
  yPosition += lineHeight;
  addTableRow('Driver:', trip.driver || 'N/A', yPosition);
  yPosition += lineHeight;
  addTableRow('Labours:', trip.labours?.join(', ') || 'N/A', yPosition);
  yPosition += lineHeight;
  addTableRow('Status:', trip.status?.toUpperCase() || 'N/A', yPosition, { valueBold: true });
  yPosition += 10;

  // Vehicle Readings
  addText('VEHICLE READINGS', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
  yPosition += 8;
  
  addTableRow('Opening Odometer:', trip.vehicleReadings?.opening?.toString() || 'N/A', yPosition);
  yPosition += lineHeight;
  addTableRow('Closing Odometer:', trip.vehicleReadings?.closing?.toString() || 'N/A', yPosition);
  yPosition += lineHeight;
  addTableRow('Total Distance:', trip.vehicleReadings?.totalDistance ? `${trip.vehicleReadings.totalDistance} km` : 'N/A', yPosition);
  yPosition += 10;

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Diesel Information
  if (trip.diesel?.stations?.length > 0) {
    addText('DIESEL INFORMATION', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
    yPosition += 8;
    
    trip.diesel.stations.forEach((station, index) => {
      addTableRow(`Station ${index + 1}:`, `${station.name} - ${station.volume}L @ ₹${station.rate}`, yPosition);
      yPosition += lineHeight;
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    addTableRow('Total Diesel Amount:', `₹${trip.diesel?.totalAmount?.toLocaleString() || '0'}`, yPosition, { valueBold: true });
    yPosition += 10;
  }

  // Purchases
  if (trip.purchases?.length > 0) {
    addText('PURCHASES', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
    yPosition += 8;
    
    trip.purchases.forEach((purchase, index) => {
      addTableRow(`Purchase ${index + 1}:`, `${purchase.birds} birds, ${purchase.weight}kg @ ₹${purchase.rate}`, yPosition);
      yPosition += lineHeight;
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    addTableRow('Total Purchase Amount:', `₹${trip.summary?.totalPurchaseAmount?.toLocaleString() || '0'}`, yPosition, { valueBold: true });
    yPosition += 10;
  }

  // Sales
  if (trip.sales?.length > 0) {
    addText('SALES', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
    yPosition += 8;
    
    trip.sales.forEach((sale, index) => {
      addTableRow(`Sale ${index + 1}:`, `${sale.birds} birds, ${sale.weight}kg @ ₹${sale.rate}`, yPosition);
      yPosition += lineHeight;
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    addTableRow('Total Sales Amount:', `₹${trip.summary?.totalSalesAmount?.toLocaleString() || '0'}`, yPosition, { valueBold: true });
    yPosition += 10;
  }

  // Financial Summary
  addText('FINANCIAL SUMMARY', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
  yPosition += 8;
  
  addTableRow('Total Purchase Amount:', `₹${trip.summary?.totalPurchaseAmount?.toLocaleString() || '0'}`, yPosition);
  yPosition += lineHeight;
  addTableRow('Total Sales Amount:', `₹${trip.summary?.totalSalesAmount?.toLocaleString() || '0'}`, yPosition);
  yPosition += lineHeight;
  addTableRow('Total Expenses:', `₹${trip.summary?.totalExpenses?.toLocaleString() || '0'}`, yPosition);
  yPosition += lineHeight;
  addTableRow('Total Diesel Amount:', `₹${trip.summary?.totalDieselAmount?.toLocaleString() || '0'}`, yPosition);
  yPosition += lineHeight;
  addTableRow('Total Losses:', `₹${trip.summary?.totalLosses?.toLocaleString() || '0'}`, yPosition);
  yPosition += lineHeight;
  addTableRow('Net Profit:', `₹${trip.summary?.netProfit?.toLocaleString() || '0'}`, yPosition, { valueBold: true, color: '#059669' });
  yPosition += 10;

  // Bird Statistics
  addText('BIRD STATISTICS', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
  yPosition += 8;
  
  addTableRow('Birds Purchased:', trip.summary?.totalBirdsPurchased?.toLocaleString() || '0', yPosition);
  yPosition += lineHeight;
  addTableRow('Birds Sold:', trip.summary?.totalBirdsSold?.toLocaleString() || '0', yPosition);
  yPosition += lineHeight;
  addTableRow('Birds Lost:', trip.summary?.totalBirdsLost?.toLocaleString() || '0', yPosition);
  yPosition += lineHeight;
  addTableRow('Weight Purchased:', `${trip.summary?.totalWeightPurchased?.toFixed(2) || '0.00'} kg`, yPosition);
  yPosition += lineHeight;
  addTableRow('Weight Sold:', `${trip.summary?.totalWeightSold?.toFixed(2) || '0.00'} kg`, yPosition);
  yPosition += lineHeight;
  addTableRow('Weight Lost:', `${trip.summary?.totalWeightLost?.toFixed(2) || '0.00'} kg`, yPosition);
  yPosition += 10;

  // Weight Loss Tracking
  addText('WEIGHT LOSS TRACKING', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
  yPosition += 8;
  
  addTableRow('Death Birds:', `${trip.summary?.totalBirdsLost || 0} birds, ${(trip.summary?.totalWeightLost || 0).toFixed(2)} kg`, yPosition);
  yPosition += lineHeight;
  addTableRow('Weight Loss:', `${trip.status === 'completed' ? (trip.summary?.birdWeightLoss || 0).toFixed(2) : '0.00'} kg`, yPosition);
  yPosition += lineHeight;
  addTableRow('Total Weight Loss:', `${((trip.summary?.totalWeightLost || 0) + (trip.status === 'completed' ? (trip.summary?.birdWeightLoss || 0) : 0)).toFixed(2)} kg`, yPosition);
  yPosition += lineHeight;
  addTableRow('Total Loss Amount:', `₹${((trip.summary?.totalLosses || 0) + (trip.status === 'completed' ? ((trip.summary?.birdWeightLoss || 0) * (trip.summary?.avgPurchaseRate || 0)) : 0)).toFixed(2)}`, yPosition, { valueBold: true });
  yPosition += 10;

  // Completion Details (if completed)
  if (trip.status === 'completed' && trip.completionDetails) {
    addText('COMPLETION DETAILS', margin, yPosition, { fontSize: 12, fontStyle: 'bold', color: '#059669' });
    yPosition += 8;
    
    addTableRow('Completed At:', new Date(trip.completionDetails.completedAt).toLocaleDateString(), yPosition);
    yPosition += lineHeight;
    addTableRow('Final Remarks:', trip.completionDetails.finalRemarks || 'N/A', yPosition);
    yPosition += lineHeight;
    addTableRow('Supervisor Signature:', trip.completionDetails.supervisorSignature || 'N/A', yPosition);
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addText(`Page ${i} of ${totalPages}`, margin, doc.internal.pageSize.getHeight() - 10, { 
      fontSize: 8,
      color: '#6b7280'
    });
    addText('Generated by Poultry Record Management System', pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { 
      fontSize: 8,
      color: '#6b7280',
      align: 'right'
    });
  }

  // Download the PDF
  const fileName = `Trip_${trip.tripId}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
