import jsPDF from 'jspdf';

const InvoiceGenerator = {
  generateInvoice: (sale, trip, customer) => {
    const doc = new jsPDF();
    
    // Helper function to draw a rectangle with text
    const drawCell = (x, y, width, height, text, options = {}) => {
      const { 
        backgroundColor = null, 
        textColor = [0, 0, 0], 
        fontSize = 10, 
        fontStyle = 'normal',
        align = 'left',
        padding = 2
      } = options;
      
      // Draw background if specified
      if (backgroundColor) {
        doc.setFillColor(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
        doc.rect(x, y, width, height, 'F');
      }
      
      // Set text properties
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      // Calculate text position based on alignment
      let textX = x + padding;
      if (align === 'center') {
        textX = x + (width / 2);
      } else if (align === 'right') {
        textX = x + width - padding;
      }
      
      // Draw text
      doc.text(text, textX, y + height - padding, { align });
    };
    
    // Helper function to draw table rows
    const drawTableRow = (x, y, width, height, cells, options = {}) => {
      const cellWidth = width / cells.length;
      cells.forEach((cell, index) => {
        const cellX = x + (index * cellWidth);
        drawCell(cellX, y, cellWidth, height, cell.text, { ...options, ...cell.options });
      });
    };
    
    // Page dimensions
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    let currentY = 20;
    
    // Header Section
    drawCell(margin, currentY, contentWidth, 15, 'INVOICE', {
      backgroundColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontSize: 18,
      fontStyle: 'bold',
      align: 'center'
    });
    
    currentY += 20;
    
    // Company Information Section
    drawCell(margin, currentY, contentWidth, 8, 'RCC AND TRADING COMPANY', {
      fontSize: 14,
      fontStyle: 'bold',
      align: 'center'
    });
    
    currentY += 15;
    
    // Invoice Details Table
    const invoiceDetails = [
      { text: 'Invoice Date:', options: { fontStyle: 'bold' } },
      { text: new Date().toLocaleDateString(), options: {} },
      { text: 'Bill Number:', options: { fontStyle: 'bold' } },
      { text: sale.billNumber, options: {} }
    ];
    
    drawTableRow(margin, currentY, contentWidth, 8, invoiceDetails);
    currentY += 20;
    
    // Customer Information Section
    drawCell(margin, currentY, contentWidth, 8, 'BILL TO', {
      backgroundColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontSize: 12,
      fontStyle: 'bold'
    });
    
    currentY += 12;
    
    const customerDetails = [
      { text: 'Customer Name:', options: { fontStyle: 'bold' } },
      { text: customer.shopName, options: {} },
      { text: 'Owner:', options: { fontStyle: 'bold' } },
      { text: customer.ownerName || 'N/A', options: {} }
    ];
    
    drawTableRow(margin, currentY, contentWidth, 8, customerDetails);
    currentY += 12;
    
    const contactDetails = [
      { text: 'Contact:', options: { fontStyle: 'bold' } },
      { text: customer.contact, options: {} },
      { text: 'Place:', options: { fontStyle: 'bold' } },
      { text: customer.place || 'N/A', options: {} }
    ];
    
    drawTableRow(margin, currentY, contentWidth, 8, contactDetails);
    currentY += 12;
    
    if (customer.gstOrPanNumber) {
      const gstDetails = [
        { text: 'GST/PAN:', options: { fontStyle: 'bold' } },
        { text: customer.gstOrPanNumber, options: {} },
        { text: '', options: {} },
        { text: '', options: {} }
      ];
      
      drawTableRow(margin, currentY, contentWidth, 8, gstDetails);
      currentY += 12;
    }
    
    currentY += 10;
    
    // Items Table Header
    const tableHeaders = [
      { text: 'Description', options: { backgroundColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', align: 'center' } },
      { text: 'Quantity', options: { backgroundColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', align: 'center' } },
      { text: 'Weight (kg)', options: { backgroundColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', align: 'center' } },
      { text: 'Rate (₹/kg)', options: { backgroundColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', align: 'center' } },
      { text: 'Amount (₹)', options: { backgroundColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', align: 'center' } }
    ];
    
    drawTableRow(margin, currentY, contentWidth, 10, tableHeaders);
    currentY += 12;
    
    // Items Table Data
    const itemData = [
      { text: 'Poultry Birds', options: { align: 'center' } },
      { text: sale.birds.toString(), options: { align: 'center' } },
      { text: sale.weight.toString(), options: { align: 'center' } },
      { text: '₹' + sale.rate.toString(), options: { align: 'center' } },
      { text: '₹' + sale.amount.toFixed(2), options: { align: 'center', fontStyle: 'bold' } }
    ];
    
    drawTableRow(margin, currentY, contentWidth, 10, itemData);
    currentY += 15;
    
    // Total Amount Section
    const totalWidth = contentWidth * 0.4; // 40% of content width
    const totalX = margin + contentWidth - totalWidth;
    
    drawCell(totalX, currentY, totalWidth, 10, 'TOTAL AMOUNT', {
      backgroundColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontSize: 12,
      fontStyle: 'bold',
      align: 'center'
    });
    
    currentY += 12;
    
    drawCell(totalX, currentY, totalWidth, 10, '₹' + sale.amount.toFixed(2), {
      fontSize: 14,
      fontStyle: 'bold',
      align: 'center'
    });
    
    currentY += 20;
    
    // Additional Information
    const additionalInfo = [
      { text: 'Average Weight per Bird:', options: { fontStyle: 'bold' } },
      { text: sale.avgWeight + ' kg', options: {} },
      { text: 'Generated on:', options: { fontStyle: 'bold' } },
      { text: new Date().toLocaleString(), options: {} }
    ];
    
    drawTableRow(margin, currentY, contentWidth, 8, additionalInfo);
    currentY += 20;
    
    // Footer
    drawCell(margin, currentY, contentWidth, 8, 'Thank you for your business!', {
      fontSize: 10,
      fontStyle: 'bold',
      align: 'center'
    });
    
    currentY += 8;
    
    drawCell(margin, currentY, contentWidth, 8, 'This is a computer generated invoice.', {
      fontSize: 8,
      align: 'center'
    });
    
    return doc;
  },
  
  downloadInvoice: (sale, trip, customer) => {
    const doc = InvoiceGenerator.generateInvoice(sale, trip, customer);
    const fileName = `Invoice_${sale.billNumber}_${customer.shopName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  }
};

export default InvoiceGenerator;
