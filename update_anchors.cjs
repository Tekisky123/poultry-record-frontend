const fs = require('fs');
const files = [
    'LiveFeedOpeningStockMonthlySummary.jsx',
    'LiveFeedOpeningStockDailySummary.jsx',
    'LiveFeedClosingStockMonthlySummary.jsx',
    'LiveFeedClosingStockDailySummary.jsx',
    'LiveBirdsOpeningStockMonthlySummary.jsx',
    'LiveBirdsOpeningStockDailySummary.jsx',
    'LiveBirdsClosingStockMonthlySummary.jsx',
    'LiveBirdsClosingStockDailySummary.jsx'
];

for (const file of files) {
    const filePath = 'd:/work/tekisky/fulltime-mentorship/projects/poultry-record-app/clinet/src/pages/' + file;
    let content = fs.readFileSync(filePath, 'utf8');
    
    const searchString1 = "const fyStartYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;";
    const searchString2 = "anchorDate = new Date(`${fyStartYear}-04-01T00:00:00`);";
    const searchString2Z = "anchorDate = new Date(`${fyStartYear}-04-01T00:00:00Z`);";
    
    let parts = content.split(searchString1);
    if(parts.length > 1) {
       let right = parts[1];
       let rightParts = right.split(searchString2);
       if(rightParts.length === 1) {
          rightParts = right.split(searchString2Z);
       }
       
       if(rightParts.length > 1) {
          content = parts[0] + "anchorDate = new Date(`${firstOpStock.date.split('T')[0]}T00:00:00`);" + rightParts[1];
          fs.writeFileSync(filePath, content);
          console.log('Updated', file);
       } else {
          console.log('Failed to find right part in', file);
       }
    } else {
       console.log('Failed to find left part in', file);
    }
}
