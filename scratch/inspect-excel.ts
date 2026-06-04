import * as XLSX from "xlsx";
import * as path from "path";

const filePath = path.join("c:", "laragon", "www", "siakad-pplg", "REKAP NILAI RPL 4 (PPB) Ganjil + Genap.xlsx");

function inspect() {
  console.log("Reading file:", filePath);
  const workbook = XLSX.readFile(filePath);
  console.log("Sheet names in workbook:", workbook.SheetNames);

  workbook.SheetNames.forEach((sheetName) => {
    console.log(`\n=== SHEET: ${sheetName} ===`);
    const ws = workbook.Sheets[sheetName];
    if (!ws) {
      console.log("  -> Empty or not found");
      return;
    }
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
    console.log(`  -> Total rows: ${aoa.length}`);
    
    // Print the first 15 rows of each sheet to see the layout
    const rowsToPrint = aoa.slice(0, 15);
    rowsToPrint.forEach((row, idx) => {
      console.log(`  Row ${idx + 1}:`, row.slice(0, 15)); // print first 15 cells of row
    });
  });
}

inspect();
