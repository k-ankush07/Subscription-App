
export function generateWidgetId() {
  const timePart = Date.now() % 100000; 
  const randomPart = Math.floor(Math.random() * 90) + 10; 
  return Number(`${timePart}${randomPart}`);
}