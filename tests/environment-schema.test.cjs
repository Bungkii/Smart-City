const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/model.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {}, require };
vm.runInNewContext(compiled, context);

const reading = {
  system: 'environment', deviceId: 'EN-1', name: 'สถานีสิ่งแวดล้อม EN-1',
  location: 'ตำแหน่งยังไม่ยืนยัน', recordedAt: new Date().toISOString(),
  health: 'normal', data: { temperature: 28.5, humidity: 64 },
};
assert.equal(context.exports.telemetrySchema.safeParse(reading).success, true);
assert.equal(context.exports.telemetrySchema.safeParse({ ...reading, data: { ...reading.data, pm25: 18.2 } }).success, true);
assert.equal(context.exports.telemetrySchema.safeParse({ ...reading, data: { ...reading.data, pm25: 'estimated' } }).success, false);
console.log('PASS: real temperature/humidity accepted without fabricated PM2.5; valid measured PM2.5 remains supported.');
