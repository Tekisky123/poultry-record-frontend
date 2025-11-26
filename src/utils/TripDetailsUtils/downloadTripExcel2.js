import ExcelJS from 'exceljs';
import extractExcelData from './extractExcelData';
import { X } from 'lucide-react';

export default function downloadTripExcel2(trip) {
    try {
      if (!trip) {
        alert('Trip data not available');
        return;
      }
  
      const generateExcel = async () => {
        try {
          const { basic_info, expenses, diesel_info, purchases, sales, opening_closing_reading, death_birds_loss, natural_weight_loss, total_weight_loss } = extractExcelData(trip);
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('SALES BOOK');
      
          // Add basic information
          worksheet.mergeCells('A1:D1');
          worksheet.getCell('A1').value = 'PARTICULARS';
          worksheet.getCell('A1').style = { font: { bold: true, size: 12 } };
          worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          worksheet.getCell('A1').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'CEC8A0' } // Light khaki-beige background
          };
  
          Object.keys(basic_info).forEach((info, index) => {
            worksheet.mergeCells(`A${index + 2}:B${index + 2}`);
            worksheet.mergeCells(`C${index + 2}:D${index + 2}`);
            worksheet.getCell(`A${index + 2}`).value = info;
            worksheet.getCell(`C${index + 2}`).value = basic_info[info] || 'N/A';
          });
      
          // Add expenses
          let rowIndex = Object.keys(basic_info).length + 3;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'VEHICLE EXPENSES';
          worksheet.getCell(`A${rowIndex}`).style = { font: { bold: true } };
          worksheet.getCell(`D${rowIndex}`).value = 'AMT';
          worksheet.getCell(`D${rowIndex}`).style = { font: { bold: true } };
          worksheet.getCell(`A${rowIndex}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'CEC8A0' } // Light khaki-beige background
          };
          worksheet.getCell(`D${rowIndex}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'CEC8A0' } // Light khaki-beige background
          };
          
          rowIndex++;
          
          if (Object.keys(expenses).length > 0) {
            Object.entries(expenses).forEach(([category, amount]) => {
              worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
              worksheet.getCell(`A${rowIndex}`).value = category;
              worksheet.getCell(`D${rowIndex}`).value = amount || 0;
              rowIndex++;
            });
          } else {
            worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
            worksheet.getCell(`A${rowIndex}`).value = 'No expenses';
            worksheet.getCell(`D${rowIndex}`).value = 0;
            rowIndex++;
          }

          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'Total';
            worksheet.getCell(`D${rowIndex}`).value = Object.entries(expenses).reduce((acc, [category, amount]) => acc + amount, 0);
            worksheet.getCell(`A${rowIndex}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'CEC8A0' } // Light khaki-beige background
              };
            worksheet.getCell(`D${rowIndex}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'CEC8A0' } // Light khaki-beige background
              };
            rowIndex++;
      
          // Add diesel information
          if (diesel_info && diesel_info['STATIONS'].length > 0) {
            const dieselStations = diesel_info['STATIONS'];
            
            let dieselHeaders = ['DIESEL', 'VOL', 'RATE', 'AMT'];
            let dieselTotalValues = ['TOTAL_VOLUME', 'TOTAL_RATE', 'TOTAL_AMOUNT'];
            
            ['A', 'B', 'C', 'D'].forEach((cell, index) => {
                worksheet.getCell(`${cell}${rowIndex}`).value = dieselHeaders[index];
                worksheet.getCell(`${cell}${rowIndex}`).style = { font: { bold: true, color: { argb: 'FFFFFF' } } };
                worksheet.getCell(`${cell}${rowIndex}`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '0xFF000000' } // Light khaki-beige background
                };
            });

            rowIndex++

            dieselStations.forEach((station, index) => {
                worksheet.getCell(`A${rowIndex}`).value = station['NAME'];
                worksheet.getCell(`B${rowIndex}`).value = station['VOL'];
                worksheet.getCell(`C${rowIndex}`).value = station['RATE'];
                worksheet.getCell(`D${rowIndex}`).value = station['AMT'];
                rowIndex++;
            });

            rowIndex++;

        
            ['A', 'B', 'C', 'D'].forEach((cell, index) => {
                if(cell === 'A'){
                    worksheet.getCell(`A${rowIndex}`).value = 'TOTAL';
                }else{
                    worksheet.getCell(`${cell}${rowIndex}`).value = diesel_info[dieselTotalValues[index - 1]];
                }
                worksheet.getCell(`${cell}${rowIndex}`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'CEC8A0' } // Light khaki-beige background
                };
            });

            rowIndex++;

          } else {
            rowIndex += 2;
          }

          // opening/closing reading
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'OP READING';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['OP READING'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'CL READING';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['CL READING'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'TOTAL RUNNING KM';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['TOTAL_RUNNING_KM'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'TOTAL DIESEL VOL';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['TOTAL_DIESEL_VOL'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'VEHICLE AVERAGE';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['VEHICLE_AVERAGE'];
          ['A','D'].forEach((cell, index) => {
            worksheet.getCell(`${cell}${rowIndex}`).style = { font: { bold: true, color: { argb: 'FFFFFF' } } };
            worksheet.getCell(`${cell}${rowIndex}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0xFF000000' } // Light khaki-beige background
            };
        });
          rowIndex++;

          // rent/birds profit/total profit/profit per kg
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'RENT AMT PER KM';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['RENT AMT PER KM'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'GROSS RENT';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['GROSS RENT'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'LESS DIESEL AMT';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['LESS DIESEL AMT'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'NETT RENT';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['NETT RENT'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'BIRDS PROFIT';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['BIRDS PROFIT'];
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'TOTAL PROFIT';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['TOTAL PROFIT'];
          ['A','D'].forEach((cell, index) => {
            worksheet.getCell(`${cell}${rowIndex}`).style = { font: { bold: true, color: { argb: 'FFFFFF' } } };
            worksheet.getCell(`${cell}${rowIndex}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0xFF000000' } // Light khaki-beige background
            };
        });
          rowIndex++;
          worksheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          worksheet.getCell(`A${rowIndex}`).value = 'PROFIT PER KG';
          worksheet.getCell(`D${rowIndex}`).value = opening_closing_reading['PROFIT PER KG'];
          

        rowIndex++;

          let newRowIndex = 1;

          // Add purchases
          const purchaseHeaders = [
            'S N', 'SUPPLIERS', 'DC NO',
            'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'AMOUNT',
          ];
      
          const purchaseCells = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
          purchaseHeaders.forEach((header, index) => {
            if (purchaseCells[index]) {
              worksheet.getCell(`${purchaseCells[index]}${newRowIndex}`).value = header || '';
              worksheet.getCell(`${purchaseCells[index]}${newRowIndex}`).style = { font: { bold: true } };
              worksheet.getCell(`${purchaseCells[index]}${newRowIndex}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'CEC8A0' } // Light khaki-beige background
            };
            }
          });
          newRowIndex++;
      
          if (purchases && purchases.length > 0) {
            purchases.forEach((purchase, purchaseIndex) => {
              const purchaseValues = [
                purchaseIndex + 1,
                purchase['SUP'] || 'N/A',
                purchase['DC NO'] || 'N/A',
                purchase['BIRDS'] || 0,
                purchase['WEIGHT'] || 0,
                purchase['AVG'] || 0,
                purchase['RATE'] || 0,
                purchase['AMOUNT'] || 0,
              ];
              
              purchaseValues.forEach((value, index) => {
                if (purchaseCells[index]) {
                  worksheet.getCell(`${purchaseCells[index]}${newRowIndex}`).value = value;
                }
              });

            
              newRowIndex++;
            });

            // here total purcahses row
            worksheet.mergeCells(`E${newRowIndex}:G${newRowIndex}`);
            worksheet.getCell(`E${newRowIndex}`).value = 'TOTAL';

            let totalWeight = purchases.reduce((acc, purchase) => acc + purchase['WEIGHT'], 0)
            let totalBirds = purchases.reduce((acc, purchase) => acc + purchase['BIRDS'], 0)
            let totalAvg = (totalWeight / totalBirds).toFixed(2) || 0
            let totalRate = purchases.reduce((acc, purchase) => acc + purchase['RATE'], 0)
            let totalAmount = purchases.reduce((acc, purchase) => acc + purchase['AMOUNT'], 0)

            worksheet.getCell(`H${newRowIndex}`).value = totalBirds;
            worksheet.getCell(`I${newRowIndex}`).value = totalWeight;
            worksheet.getCell(`J${newRowIndex}`).value = totalAvg;
            worksheet.getCell(`K${newRowIndex}`).value = (totalRate / purchases.length).toFixed(2) || 0;
            worksheet.getCell(`L${newRowIndex}`).value = totalAmount;

            ['E','H','I','J','K','L'].forEach((cell) => {
                worksheet.getCell(`${cell}${newRowIndex}`).style = { font: { bold: true, color: { argb: 'FFFFFF' } } };
                worksheet.getCell(`${cell}${newRowIndex}`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '0xFF000000' }
                };
            });
          }

          newRowIndex++;
      
          // Add sales
          const salesHeaders = ['S N', 'DELEVERY DETAILS', 'BILL NO', 'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'TOTAL', 'CASH', 'ONLINE', 'DISC'];
          const salesCells = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
          salesHeaders.forEach((header, index) => {
            if (salesCells[index]) {
              worksheet.getCell(`${salesCells[index]}${newRowIndex}`).value = header || '';
              worksheet.getCell(`${salesCells[index]}${newRowIndex}`).style = { font: { bold: true } };
              worksheet.getCell(`${salesCells[index]}${newRowIndex}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'CEC8A0' } // Light khaki-beige background
            };
            }
          });

          newRowIndex += 1; // Add spacing
          if (sales && sales.length > 0) {
            console.log("sales excel me", sales)
            sales.forEach((sale, saleIndex) => {
              const saleValues = [
                saleIndex + 1,
                sale['DELIVERY DETAILS'] || 'N/A',
                sale['BILL NO'] || 'N/A',
                sale['BIRDS'] || 0,
                sale['WEIGHT'] || 0,
                sale['AVG'] || 0,
                sale['RATE'] || 0,
                sale['TOTAL'] || 0,
                sale['CASH'] || 0,
                sale['ONLINE'] || 0,
                sale['DISC'] || 0,
              ];
              saleValues.forEach((value, index) => {
                if (salesCells[index]) {
                  worksheet.getCell(`${salesCells[index]}${newRowIndex}`).value = value;
                }
              });
              newRowIndex++;
            });

            // here total sales row
            worksheet.mergeCells(`E${newRowIndex}:G${newRowIndex}`);
            worksheet.getCell(`E${newRowIndex}`).value = 'TOTAL';
            let totalBirds = sales.reduce((acc, sale) => acc + sale['BIRDS'], 0)
            let totalWeight = sales.reduce((acc, sale) => acc + sale['WEIGHT'], 0)
            let totalAvg = (totalWeight / totalBirds).toFixed(2) || 0
            let totalRate = sales.reduce((acc, sale) => acc + sale['RATE'], 0)
            let totalAmount = sales.reduce((acc, sale) => acc + sale['TOTAL'], 0)
            let totalCash = sales.reduce((acc, sale) => acc + sale['CASH'], 0)
            let totalOnline = sales.reduce((acc, sale) => acc + sale['ONLINE'], 0)
            let totalDisc = sales.reduce((acc, sale) => acc + sale['DISC'], 0)

            worksheet.getCell(`H${newRowIndex}`).value = totalBirds;
            worksheet.getCell(`I${newRowIndex}`).value = totalWeight;
            worksheet.getCell(`J${newRowIndex}`).value = totalAvg;
            worksheet.getCell(`K${newRowIndex}`).value = (totalRate / sales.length).toFixed(2) || 0;
            worksheet.getCell(`L${newRowIndex}`).value = totalAmount;
            worksheet.getCell(`M${newRowIndex}`).value = totalCash;
            worksheet.getCell(`N${newRowIndex}`).value = totalOnline;
            worksheet.getCell(`O${newRowIndex}`).value = totalDisc;

            ['E','H','I','J','K','L','M','N','O'].forEach((cell) => {
                worksheet.getCell(`${cell}${newRowIndex}`).style = { font: { bold: true, color: { argb: 'FFFFFF' } } };
                worksheet.getCell(`${cell}${newRowIndex}`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: '0xFF000000' }
                };
            });
            newRowIndex++;
          } else {
            newRowIndex += 2;
          }
      
          // death birds loss
          worksheet.mergeCells(`E${newRowIndex}:G${newRowIndex}`);
          worksheet.getCell(`E${newRowIndex}`).value = 'DEATH BIRDS LOSS';
          worksheet.getCell(`H${newRowIndex}`).value = death_birds_loss['BIRDS'];
          worksheet.getCell(`I${newRowIndex}`).value = death_birds_loss['WEIGHT'];
          worksheet.getCell(`J${newRowIndex}`).value = death_birds_loss['AVG'];
          worksheet.getCell(`K${newRowIndex}`).value = death_birds_loss['RATE'];
          worksheet.getCell(`L${newRowIndex}`).value = death_birds_loss['AMOUNT'];
          newRowIndex++;
          
          // natural weight loss
          worksheet.mergeCells(`E${newRowIndex}:G${newRowIndex}`);
          worksheet.getCell(`E${newRowIndex}`).value = 'NATURAL WEIGHT LOSS';
          worksheet.getCell(`H${newRowIndex}`).value = natural_weight_loss['BIRDS'];
          worksheet.getCell(`I${newRowIndex}`).value = natural_weight_loss['WEIGHT'];
          worksheet.getCell(`J${newRowIndex}`).value = natural_weight_loss['AVG'];
          worksheet.getCell(`K${newRowIndex}`).value = natural_weight_loss['RATE'];
          worksheet.getCell(`L${newRowIndex}`).value = natural_weight_loss['AMOUNT'];
          newRowIndex++;

          // total weight loss
          worksheet.mergeCells(`E${newRowIndex}:G${newRowIndex}`);
          worksheet.getCell(`E${newRowIndex}`).value = 'TOTAL WEIGHT LOSS';
          worksheet.getCell(`H${newRowIndex}`).value = total_weight_loss['BIRDS'];
          worksheet.getCell(`I${newRowIndex}`).value = total_weight_loss['WEIGHT'];
          worksheet.getCell(`J${newRowIndex}`).value = total_weight_loss['AVG'];
          worksheet.getCell(`K${newRowIndex}`).value = total_weight_loss['RATE'];
          worksheet.getCell(`L${newRowIndex}`).value = total_weight_loss['AMOUNT'];

          ['E','H','I','J','K','L','M','N','O'].forEach((cell, index) => {
            worksheet.getCell(`${cell}${newRowIndex}`).style = { font: { bold: true, color: { argb: 'FFFFFF' } } };
            worksheet.getCell(`${cell}${newRowIndex}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '0xFF000000' } // Light khaki-beige background
            };
        });
        newRowIndex++;
        


          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const fileName = `Trip_${trip.tripId || trip.id}_SalesBook_${new Date().toISOString().split('T')[0]}.xlsx`;
          saveAs(blob, fileName);
        } catch (error) {
          console.error('Error generating Excel:', error);
          alert(`Error generating Excel file: ${error.message}`);
        }
      };
      
      generateExcel();
    } catch (error) {
      console.error('Error in downloadExcel2:', error);
      alert(`Error: ${error.message}`);
    }
  };