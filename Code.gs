function doGet(e) {
  // รับพารามิเตอร์ card_id จากคำขอ GET
  var cardId = e.parameter.card_id;
  if (!cardId) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: "Missing card_id parameter" 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dbSheet = ss.getSheetByName("Database");
  var logSheet = ss.getSheetByName("Logs");

  // อ่านข้อมูลทั้งหมดจากแท็บ Database
  var data = dbSheet.getDataRange().getValues();
  var resultStatus = "not_found";
  var userRole = "Guest";

  // วนลูปตรวจสอบตั้งแต่แถวที่ 2 เป็นต้นไป (ข้าม Header)
  for (var i = 1; i < data.length; i++) {
    var sheetCardId = String(data[i][0]).trim().toUpperCase();
    var role = String(data[i][1]).trim();
    var status = String(data[i][2]).trim().toLowerCase();

    // เปรียบเทียบ Card ID
    if (sheetCardId === cardId.trim().toUpperCase()) {
      userRole = role;
      if (status === "allow") {
        resultStatus = "allow";
      } else if (status === "banned") {
        resultStatus = "banned";
      }
      break;
    }
  }

  // หากสถานะเป็น Allow ให้บันทึกลงแท็บ Logs อัตโนมัติ
  if (resultStatus === "allow") {
    var fullDateTime = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
    logSheet.appendRow([fullDateTime, cardId]);
  }

  // ส่งผลลัพธ์กลับในรูปแบบ JSON ให้ ESP32
  var response = {
    status: resultStatus,
    role: userRole
  };

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
