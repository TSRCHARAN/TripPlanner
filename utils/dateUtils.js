/**
 * 🗓️ Convert YYYY-MM-DD or Date object → DD-MM-YYYY (Abhibus / ConfirmTKT)
 */
export function toDDMMYYYY(dateInput) {
  if (!dateInput) return null;

  let d;
  if (typeof dateInput === "string") {
    // Accept both yyyy-mm-dd and dd-mm-yyyy
    const parts = dateInput.split("-");
    if (parts[0].length === 4) {
      // yyyy-mm-dd → dd-mm-yyyy
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else if (parts[2]?.length === 4) {
      // already dd-mm-yyyy
      return dateInput;
    }
    d = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    d = dateInput;
  }

  if (!d || isNaN(d)) return null;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * ✅ Example:
 * toDDMMYYYY("2025-11-23") → "23-11-2025"
 * toDDMMYYYY("23-11-2025") → "23-11-2025"
 * toDDMMYYYY(new Date())   → "25-10-2025"
 */
