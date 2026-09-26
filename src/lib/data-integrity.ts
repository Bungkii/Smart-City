import type { EventRow } from "./model";

// Fingerprints from the retired SQL installer. Keep existing records intact,
// but never present its synthetic telemetry as a hardware observation.
const legacyRows = [
  {
    "system": "traffic",
    "deviceId": "TR-1",
    "name": "สี่แยกกลางอัสสัมชัญ (Central 4-Way Junction)",
    "location": "สี่แยกสายหลัก อาคารเรียน A",
    "note": "ระบบไฟจราจร 4 ทิศทางพร้อมทำงาน",
    "data": {
      "signal": "green",
      "nSignal": "green",
      "eSignal": "red",
      "sSignal": "red",
      "wSignal": "red",
      "activeDirection": "North (เหนือ)",
      "waitSeconds": 4,
      "mode": "adaptive"
    },
    "position": {
      "lat": 13.7558,
      "lng": 100.5024
    }
  },
  {
    "system": "parking",
    "deviceId": "PK-01",
    "name": "ช่องจอด 01",
    "location": "อาคาร A",
    "note": "ระบบพร้อมทำงาน",
    "data": {
      "occupied": true,
      "bay": "A-01"
    },
    "position": {
      "lat": 13.7569,
      "lng": 100.5015
    }
  },
  {
    "system": "streetlight",
    "deviceId": "SL-01",
    "name": "ไฟถนนอัจฉริยะ 01",
    "location": "ถนนสายหลัก",
    "note": "ระบบไฟถนนพร้อมทำงาน",
    "data": {
      "on": false,
      "brightness": 0,
      "mode": "auto",
      "fault": null
    },
    "position": {
      "lat": 13.7562,
      "lng": 100.5035
    }
  },
  {
    "system": "gate",
    "deviceId": "GT-01",
    "name": "ประตูทิศเหนือ RFID",
    "location": "ทางเข้าหลัก อาคาร A",
    "note": "ระบบพร้อมสแกนบัตร",
    "data": {
      "open": false,
      "direction": null,
      "access": null,
      "cardRef": null
    },
    "position": {
      "lat": 13.7574,
      "lng": 100.5029
    }
  },
  {
    "system": "environment",
    "deviceId": "EN-01",
    "name": "สถานีสิ่งแวดล้อมกลาง",
    "location": "ใจกลางวิทยาเขต",
    "note": "สถานะอากาศปกติ",
    "data": {
      "pm25": 24,
      "temperature": 29.8,
      "humidity": 65
    },
    "position": {
      "lat": 13.7551,
      "lng": 100.5014
    }
  }
];

export function isDeviceEvent(event: EventRow): boolean {
 if (event.source !== "live" || event.note === "ระบบเชื่อมต่อพร้อมรับสัญญาณฮาร์ดแวร์จริง") return false;
 return !legacyRows.some(row => event.system === row.system && event.deviceId === row.deviceId && event.name === row.name && event.location === row.location && event.note === row.note && event.position?.lat === row.position.lat && event.position?.lng === row.position.lng && Object.entries(row.data).every(([key, value]) => (event.data as Record<string, unknown>)[key] === value));
}

const legacyCards = [
  {
    "card_id": "4A6F12C3",
    "name": "นายสมชาย ใจดี",
    "role": "Student",
    "status": "allow"
  },
  {
    "card_id": "B3459812",
    "name": "นางสาวกนกวรรณ เพียรธรรม",
    "role": "Teacher",
    "status": "allow"
  },
  {
    "card_id": "E19033FA",
    "name": "นายอนันต์ มั่นคง",
    "role": "Staff",
    "status": "allow"
  },
  {
    "card_id": "99AA88BB",
    "name": "บัตรระงับการใช้งาน",
    "role": "Guest",
    "status": "banned"
  }
];
export function isRegisteredCard(card: { card_id: string; name: string; role: string; status: string }): boolean {
 return !legacyCards.some(row => Object.entries(row).every(([key, value]) => card[key as keyof typeof card] === value));
}
