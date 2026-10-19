// Default category taxonomy used to generate the idempotent seed migration.
export const EXPENSE = [
  ["food-eating", "Food & Eating", "utensils", "#eb6834", ["Restaurants", "Street Food", "Snacks", "Tea & Coffee", "Online Food Delivery"]],
  ["groceries-household", "Groceries & Household", "shopping-basket", "#1baf7a", ["Groceries", "Vegetables", "Fruits", "Milk", "Cleaning Supplies", "Household Items"]],
  ["clothing-fashion", "Clothing & Fashion", "shirt", "#e87ba4", ["Clothes", "Shoes", "Accessories", "Bags", "Personal Shopping"]],
  ["daily-transportation", "Daily Transportation", "bus", "#2a78d6", ["Bus", "Train", "Metro", "Auto Rickshaw", "Taxi", "Fuel", "Parking", "Vehicle Maintenance"]],
  ["tour-travel", "Tour & Travel", "plane", "#6250d6", ["Flights", "Hotels", "Vacation", "Sightseeing", "Travel Tickets", "Travel Insurance"]],
  ["health-medical", "Health & Medical", "heart-pulse", "#e34948", ["Doctor", "Medicines", "Hospital", "Dental Care", "Medical Tests", "Gym", "Fitness"]],
  ["home-rent", "Home & Rent", "house", "#008300", ["Rent", "Electricity", "Water", "Gas", "Repairs", "Furniture", "Home Appliances"]],
  ["bills-utilities", "Bills & Utilities", "receipt", "#eda100", ["Mobile Recharge", "Internet", "OTT Subscriptions", "Software Subscriptions", "Other Bills"]],
  ["education", "Education", "graduation-cap", "#0e7490", ["Tuition Fees", "Courses", "Books", "Stationery", "Exams", "Certifications"]],
  ["entertainment-hobbies", "Entertainment & Hobbies", "gamepad-2", "#b45309", ["Movies", "Games", "Events", "Sports", "Music", "Hobbies"]],
  ["family-personal", "Family & Personal", "users", "#be185d", ["Family Expenses", "Gifts", "Personal Care", "Salon", "Baby Care"]],
  ["financial-expenses", "Financial Expenses", "landmark", "#475569", ["Bank Fees", "Loan Interest", "Credit Card Fees", "Other Financial Charges"]],
  ["pets", "Pets", "paw-print", "#92400e", ["Pet Food", "Veterinary Care", "Grooming", "Supplies"]],
  ["work-business", "Work & Business", "briefcase", "#1d4ed8", ["Office Expenses", "Business Travel", "Equipment", "Work Software"]],
  ["charity-donations", "Charity & Donations", "hand-heart", "#c2410c", ["Donations", "Religious Contributions", "Community Support"]],
  ["insurance", "Insurance", "shield", "#4338ca", ["Health Insurance", "Life Insurance", "Vehicle Insurance", "Other Insurance"]],
  ["taxes-government", "Taxes & Government Fees", "scale", "#334155", ["Income Tax", "Property Tax", "Government Fees", "Other Taxes"]],
  ["miscellaneous", "Miscellaneous", "circle-ellipsis", "#898781", ["Uncategorized", "Other Expenses"]],
];

export const INCOME = [
  ["salary", "Salary", "banknote", "#008300"],
  ["freelance-income", "Freelance Income", "laptop", "#2a78d6"],
  ["business-income", "Business Income", "store", "#eb6834"],
  ["rental-income", "Rental Income", "building-2", "#6250d6"],
  ["interest-income", "Interest Income", "percent", "#1baf7a"],
  ["investment-income", "Investment Income", "trending-up", "#0e7490"],
  ["refunds", "Refunds", "rotate-ccw", "#eda100"],
  ["gifts-received", "Gifts Received", "gift", "#e87ba4"],
  ["other-income", "Other Income", "circle-plus", "#898781"],
];

export const slugify = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
