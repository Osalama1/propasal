# Propasal App - Installation Guide

## Overview
Propasal is a custom ERPNext v15 app that adds hierarchical quotation management with a modern tree view interface for managing Activities, Phases, and Tasks.

## Requirements
- ERPNext v15
- Frappe Framework v15
- Python 3.10+
- Node.js (for asset compilation)

## Installation Steps

### 1. Get the App
```bash
cd /path/to/frappe-bench
bench get-app propasal /path/to/propasal
```

### 2. Install on Site
```bash
bench --site your-site-name install-app propasal
```

This will automatically:
- Create all custom fields for Quotation and Quotation Item
- Set up the hierarchy tree tab in Quotation
- Run all necessary patches
- Configure the app hooks

### 3. Verify Installation
```bash
bench --site your-site-name migrate
bench --site your-site-name clear-cache
```

### 4. Restart Bench
```bash
bench restart
```

### 5. Clear Browser Cache
- Hard refresh your browser: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- Or clear browser cache completely

## Custom Fields Created

### Quotation Item Fields
The following custom fields are automatically created in **Quotation Item**:

#### Hierarchical Structure Section
- `item_level` (Select): Activity, Phase, or Task
- `parent_activity` (Link): Parent Activity/Phase
- `parent_row_no` (Data): Parent row number
- `activity_reference_id` (Data): Internal reference ID (hidden)
- `is_expandable` (Check): Has children indicator

#### Percentage & Fee Calculation Section
- `custom_is_fixed` (Check): Fixed amount flag
- `contract_percentage` (Percent): Percentage relative to parent
- `total_percentage` (Percent): Percentage of total quotation (read-only)
- `calculated_amount` (Currency): Auto-calculated amount (read-only)

### Quotation Fields
The following custom fields are automatically created in **Quotation**:

- `hierarchy_tree_tab` (Tab Break): Creates "Hierarchy Tree" tab
- `quotation_tree` (HTML): Tree view container

## Features

### 1. Hierarchical Structure
- **Activities**: Top-level items (e.g., Construction Phase, Design Phase)
- **Phases**: Sub-groups under Activities (e.g., Foundation Work, Electrical)
- **Tasks**: Individual work items under Phases

### 2. Tree View Interface
- Modern, compact tree visualization
- Drag-and-drop to reorganize hierarchy
- Expand/collapse nodes
- Real-time percentage and amount calculations

### 3. Percentage Calculations
- **Contract Percentage**: Relative to parent item
- **Total Percentage**: Relative to quotation total
- **Fixed vs. Calculated**: 
  - Fixed items have set amounts
  - Calculated items sum from children

### 4. Operations
- Add/Edit/Delete items from tree
- Add multiple items at once
- Duplicate activities with full hierarchy
- Move items between parents
- Export to ERPNext Task doctype

### 5. Validations
- Parent-child percentage constraints
- Fixed amount validation (children can't exceed parent)
- Hierarchical integrity checks

## Patches

The following patches run during installation/migration:

1. `add_quotation_hierarchy_fields`: Creates all custom fields
2. `update_parent_item_to_idx`: Updates parent references
3. `ensure_fields_visible`: Ensures all fields are visible and configured

## Troubleshooting

### Fields Not Showing
```bash
bench --site your-site-name console
```
```python
from propasal.install import create_quotation_hierarchy_fields
create_quotation_hierarchy_fields()
frappe.db.commit()
```

### Tree Not Loading
1. Clear browser cache: `Ctrl+Shift+R`
2. Clear site cache: `bench --site your-site-name clear-cache`
3. Restart bench: `bench restart`

### Migration Errors
If you see errors during migration:
```bash
# Check for missing fields
bench --site your-site-name console
```
```python
import frappe
# Check Quotation Item fields
fields = frappe.get_all("Custom Field", filters={"dt": "Quotation Item"}, fields=["fieldname", "label"])
print(f"Found {len(fields)} Quotation Item custom fields")

# Check Quotation fields
fields = frappe.get_all("Custom Field", filters={"dt": "Quotation"}, fields=["fieldname", "label"])
print(f"Found {len(fields)} Quotation custom fields")
```

### Rebuild Tree
If hierarchy appears broken:
```bash
bench --site your-site-name console
```
```python
import frappe
from propasal.propasal.quotation_hierarchy import set_reference_ids, set_is_expandable, calculate_hierarchical_percentages

# For a specific quotation
doc = frappe.get_doc("Quotation", "your-quotation-name")
set_reference_ids(doc)
set_is_expandable(doc)
calculate_hierarchical_percentages(doc)
doc.save()
frappe.db.commit()
```

## Uninstallation

To remove the app:
```bash
bench --site your-site-name uninstall-app propasal
```

**Note**: This will NOT remove the custom fields. To remove custom fields:
```bash
bench --site your-site-name console
```
```python
import frappe
# Delete Quotation Item custom fields
frappe.db.delete("Custom Field", {"dt": "Quotation Item", "fieldname": ["like", "%hierarchy%"]})
frappe.db.delete("Custom Field", {"dt": "Quotation Item", "fieldname": ["like", "%percentage%"]})
# Delete Quotation custom fields
frappe.db.delete("Custom Field", {"dt": "Quotation", "fieldname": ["in", ["hierarchy_tree_tab", "quotation_tree"]]})
frappe.db.commit()
```

## Support

For issues or questions:
- See [README.md](README.md) for an overview and quick start
- Use the verification script and troubleshooting sections above
- Open an issue on the app repository if applicable

## Version

Current version: 1.0
Compatible with: ERPNext v15, Frappe v15
