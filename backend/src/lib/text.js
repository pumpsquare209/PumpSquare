export function textValue(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join("\n");
  if (value === null || value === undefined || typeof value === "object") return "";
  return String(value);
}
