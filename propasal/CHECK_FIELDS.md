# Quick Check Script for Fields

## Run this in Browser Console (F12) when on Quotation form:

```javascript
// 1. Check if JavaScript is loaded
console.log("=== JavaScript Check ===");
console.log("propasal namespace:", typeof propasal);
console.log("QuotationTreeView class:", typeof propasal?.quotation?.QuotationTreeView);

// 2. Check if fields exist in form
console.log("\n=== Fields Check ===");
console.log("quotation_tree field:", cur_frm.fields_dict.quotation_tree);
console.log("hierarchy_tree_tab field:", cur_frm.fields_dict.hierarchy_tree_tab);
console.log("All fields with 'tree' or 'hierarchy':", 
    Object.keys(cur_frm.fields_dict).filter(f => 
        f.includes("tree") || f.includes("hierarchy") || f.includes("Tree")
    )
);

// 3. Check if item fields exist
console.log("\n=== Item Fields Check ===");
if (cur_frm.doc.items && cur_frm.doc.items.length > 0) {
    let item = cur_frm.doc.items[0];
    console.log("Has item_level:", 'item_level' in item);
    console.log("Has parent_activity:", 'parent_activity' in item);
    console.log("Has parent_row_no:", 'parent_row_no' in item);
    console.log("Has contract_percentage:", 'contract_percentage' in item);
}

// 4. Check custom buttons
console.log("\n=== Buttons Check ===");
console.log("Custom buttons:", cur_frm.custom_buttons);

// 5. Manually trigger tree build
console.log("\n=== Manual Tree Build ===");
if (cur_frm.fields_dict.quotation_tree) {
    console.log("Field exists, triggering build...");
    cur_frm.trigger("build_hierarchy_tree");
} else {
    console.error("quotation_tree field NOT FOUND!");
    console.log("Available fields:", Object.keys(cur_frm.fields_dict).slice(0, 20));
}

// 6. Check if field is hidden
if (cur_frm.fields_dict.quotation_tree) {
    let field = cur_frm.fields_dict.quotation_tree;
    console.log("\n=== Field Properties ===");
    console.log("Field wrapper:", field.wrapper);
    console.log("Field hidden:", field.df?.hidden);
    console.log("Field type:", field.df?.fieldtype);
}
```

## If Fields Don't Show:

### Option 1: Run Migration
```bash
bench migrate
```

### Option 2: Manually Add Fields via Console
```python
# In Frappe console (bench console)
from propasal.propasal.quotation_hierarchy import add_quotation_hierarchy_fields
add_quotation_hierarchy_fields()
```

### Option 3: Check Customize Form
1. Go to Customize Form
2. Select "Quotation"
3. Look for "Hierarchy Tree" tab
4. If missing, the fields weren't created
5. If present but hidden, uncheck "Hidden" checkbox

### Option 4: Force Field Visibility
```python
# In Frappe console
import frappe

# Make quotation_tree visible
field = frappe.get_doc("Custom Field", {"dt": "Quotation", "fieldname": "quotation_tree"})
if field:
    field.hidden = 0
    field.save()
    frappe.clear_cache(doctype="Quotation")
```



