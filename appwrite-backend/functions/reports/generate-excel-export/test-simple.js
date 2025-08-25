import ExcelJS from 'exceljs';
import moment from 'moment';
import fs from 'fs';

// Simple test to verify Excel generation works
async function testExcelGeneration() {
  console.log('🧪 Testing Excel generation...');
  
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test Report');
    
    // Add some test data
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Vaccine', key: 'vaccine', width: 15 }
    ];
    
    // Add headers
    worksheet.addRow(['Name', 'Age', 'Vaccine']);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E86AB' }
    };
    
    // Add test data
    worksheet.addRow(['John Doe', 5, 'Measles']);
    worksheet.addRow(['Jane Smith', 3, 'Polio']);
    worksheet.addRow(['Bob Johnson', 7, 'DTP']);
    
    // Save test file
    const filename = `test_excel_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    await workbook.xlsx.writeFile(filename);
    
    console.log(`✅ Test Excel file generated: ${filename}`);
    console.log('📊 File size:', fs.statSync(filename).size, 'bytes');
    
    // Clean up
    setTimeout(() => {
      if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
        console.log('🧹 Test file cleaned up');
      }
    }, 5000);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run test
testExcelGeneration()
  .then(success => {
    if (success) {
      console.log('✅ Basic Excel generation test passed');
    } else {
      console.log('❌ Basic Excel generation test failed');
    }
  })
  .catch(console.error);