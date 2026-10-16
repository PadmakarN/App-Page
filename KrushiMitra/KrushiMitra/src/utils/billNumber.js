export function generateBillNumber() {
  const prefix = "DYP";
  const timestamp = Date.now().toString().slice(-6);
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${timestamp}-${randomNum}`;
}