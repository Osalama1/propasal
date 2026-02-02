// Diagnostic script for Quotation Hierarchy
console.log("=== QUOTATION HIERARCHY DIAGNOSTIC ===");
console.log("1. Checking namespace:", typeof propasal);
console.log("2. Checking quotation namespace:", typeof propasal?.quotation);
console.log("3. Checking QuotationHierarchy class:", typeof propasal?.quotation?.QuotationHierarchy);
console.log("4. Checking frappe.views.TreeView:", typeof frappe?.views?.TreeView);

// Test if we can create the class
if (typeof propasal?.quotation?.QuotationHierarchy === 'function') {
	console.log("✓ QuotationHierarchy class is defined");
} else {
	console.error("✗ QuotationHierarchy class NOT defined");
}

// Log frappe version
console.log("Frappe version:", frappe?.boot?.versions?.frappe);
console.log("ERPNext version:", frappe?.boot?.versions?.erpnext);



