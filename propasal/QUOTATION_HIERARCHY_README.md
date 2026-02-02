# Quotation Hierarchical Structure Feature

This feature adds a hierarchical tree structure to ERPNext Quotations, similar to the BOM Creator functionality. It allows you to organize quotation items into Activities → Phases → Tasks with automatic percentage and fee calculations.

## Features

1. **Hierarchical Structure**: Organize items into three levels:
   - **Activity** (Top level)
   - **Phase** (Under Activity)
   - **Task** (Under Phase)

2. **Automatic Percentage Calculation**:
   - **Contract Percentage**: Percentage relative to parent item
   - **Total Percentage**: Percentage of total quotation amount (calculated recursively)
   - **Calculated Amount**: Auto-calculated based on total percentage and grand total

3. **Tree View Visualization**: Interactive tree view to visualize and manage the hierarchy

4. **Validation**: Prevents circular references and validates level hierarchy

## Installation

1. The custom fields will be automatically added when you run the migration:
   ```bash
   bench migrate
   ```

2. Or manually run the patch:
   ```python
   from propasal.propasal.quotation_hierarchy import add_quotation_hierarchy_fields
   add_quotation_hierarchy_fields()
   ```

## Usage

### Adding Items with Hierarchy

1. **Add Activity Items**:
   - Set `Item Level` = "Activity"
   - Leave `Parent Item` empty
   - Set `Contract Percentage` (e.g., 40% of total)

2. **Add Phase Items**:
   - Set `Item Level` = "Phase"
   - Set `Parent Item` = Select the Activity item
   - Set `Contract Percentage` (e.g., 50% of parent Activity)

3. **Add Task Items**:
   - Set `Item Level` = "Task"
   - Set `Parent Item` = Select the Phase item
   - Set `Contract Percentage` (e.g., 20% of parent Phase)

### Calculation Logic

- **Activity**: `Total Percentage = Contract Percentage`
- **Phase**: `Total Percentage = (Parent Activity Total % × Contract %) / 100`
- **Task**: `Total Percentage = (Parent Phase Total % × Contract %) / 100`
- **Calculated Amount**: `(Grand Total × Total Percentage) / 100`

### Example

If you have:
- Grand Total: 100,000 EGP
- Activity 1: 40% contract percentage
  - Phase 1.1: 50% contract percentage (of Activity 1)
    - Task 1.1.1: 20% contract percentage (of Phase 1.1)

Calculations:
- Activity 1 Total % = 40%
- Activity 1 Amount = 40,000 EGP
- Phase 1.1 Total % = (40% × 50%) / 100 = 20%
- Phase 1.1 Amount = 20,000 EGP
- Task 1.1.1 Total % = (20% × 20%) / 100 = 4%
- Task 1.1.1 Amount = 4,000 EGP

### Tree View

1. Open a Quotation document
2. Scroll to the "Quotation Hierarchy Tree" section
3. Use the tree view to:
   - Visualize the hierarchy
   - Add new items
   - Edit existing items
   - Delete items (and their children)

### Custom Buttons

- **Rebuild Tree**: Rebuilds the tree visualization
- **Calculate Percentages**: Manually triggers percentage calculation

## Technical Details

### Custom Fields Added

**Quotation Item:**
- `item_level` (Select: Activity, Phase, Task)
- `parent_item` (Link to Quotation Item)
- `parent_reference_id` (Data, hidden)
- `activity_reference_id` (Data, hidden)
- `is_expandable` (Check, read-only)
- `contract_percentage` (Percent)
- `total_percentage` (Percent, read-only)
- `calculated_amount` (Currency, read-only)

**Quotation:**
- `quotation_tree` (HTML field for tree view)

### API Methods

- `propasal.propasal.quotation_hierarchy.get_quotation_children`: Get children for tree view
- `propasal.propasal.quotation_hierarchy.delete_quotation_item`: Delete item and children recursively

### Override

The `Quotation` doctype class is overridden to:
- Validate hierarchy on save
- Calculate percentages automatically
- Set reference IDs for tree structure

## Notes

- Percentages are calculated automatically on save
- The `calculated_amount` field overrides the standard `amount` field when set
- All percentage fields are read-only except `contract_percentage`
- The tree view requires items to be saved before they appear



