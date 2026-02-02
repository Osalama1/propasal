# Fix Hierarchy Issues

## Problem 1: AttributeError - 'parent_activity' field doesn't exist

**Error:** `AttributeError: 'QuotationItem' object has no attribute 'parent_activity'`

**Solution:** The custom fields haven't been created yet. You need to run the migration.

### Steps to Fix:

1. **Run the migration to add fields:**
   ```bash
   bench migrate
   ```

2. **Or manually add fields:**
   ```python
   from propasal.propasal.quotation_hierarchy import add_quotation_hierarchy_fields
   add_quotation_hierarchy_fields()
   ```

3. **Or run the ensure patch:**
   ```python
   from propasal.propasal.patches.v1_0.ensure_hierarchy_fields import execute
   execute()
   ```

## Problem 2: Tree View Not Showing

**Possible Causes:**
1. The `quotation_tree` HTML field doesn't exist
2. The tree container is not found
3. JavaScript errors preventing tree from loading

### Steps to Fix:

1. **Check if HTML field exists:**
   - Go to Customize Form for Quotation
   - Look for "quotation_tree" field
   - If missing, run migration

2. **Check browser console:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Look for messages like "Tree container not found"

3. **Clear cache:**
   ```bash
   bench clear-cache
   bench clear-website-cache
   ```

4. **Rebuild assets:**
   ```bash
   bench build --app propasal
   ```

## Current Status

✅ **Fixed:**
- Added defensive checks in `validate_hierarchy()` to handle missing fields
- Added defensive checks in `set_hierarchy_references()` and `calculate_hierarchy_percentages()`
- Code will skip hierarchy logic if fields don't exist (no errors)

⚠️ **Action Required:**
- Run migration to create custom fields
- Clear cache after migration
- Refresh browser

## Fields That Need to Exist

After migration, these fields should exist in Quotation Item:

1. `item_level` (Select: Activity, Phase, Task)
2. `parent_activity` (Link to Quotation Item)
3. `parent_row_no` (Data)
4. `activity_reference_id` (Data, hidden)
5. `is_expandable` (Check)
6. `contract_percentage` (Percent)
7. `total_percentage` (Percent, read-only)
8. `calculated_amount` (Currency, read-only)

And in Quotation:
1. `hierarchy_tree_tab` (Tab Break)
2. `quotation_tree` (HTML field)

## Testing After Migration

1. Open a Quotation
2. Add an item with `item_level = "Activity"`
3. Add another item with `item_level = "Phase"` and set `parent_activity` to the Activity item
4. Go to "Hierarchy Tree" tab
5. You should see the tree view

## Debug Tree View

If tree still doesn't show, check in browser console:

```javascript
// Check if field exists
cur_frm.fields_dict.quotation_tree

// Check if wrapper exists
$(cur_frm.fields_dict.quotation_tree.wrapper).length

// Manually trigger tree build
cur_frm.trigger("build_hierarchy_tree")
```



