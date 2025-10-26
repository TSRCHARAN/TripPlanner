export function mapBudgetToRange(category = "mid") {
  const c = (category || "mid").toLowerCase();
  if (c === "low") return { priceLevel: [0,1], roomPrice: [0,1500], fareLimit: 500 };
  if (c === "mid") return { priceLevel: [1,3], roomPrice: [1500,4000], fareLimit: 1500 };
  if (c === "high") return { priceLevel: [3,4], roomPrice: [4000,10000], fareLimit: 5000 };
  return { priceLevel: [1,3], roomPrice: [1500,4000], fareLimit: 1500 };
}
