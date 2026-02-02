# Fixed Amount vs Calculated Amount - Implementation Status

## ✅ Completed

### 1. Field Definition
- ✅ Added `custom_is_fixed` field to Quotation Item custom fields
- ✅ Field type: Checkbox
- ✅ Default: `false` (calculated)
- ✅ Description: "If checked, amount is fixed and children must not exceed it. If unchecked, amount is calculated from children sum."

### 2. Helper Functions (quotation_item_utils.py)
- ✅ `get_children_sum_recursive()` - Calculate sum of all descendants recursively
- ✅ `validate_fixed_amount_constraint()` - Validate that children don't exceed parent fixed amount

### 3. Calculation Logic (quotation_hierarchy.py:calculate_hierarchical_percentages)
- ✅ **PASS 1: Bottom-up** - Calculate non-fixed amounts from children sum
- ✅ **PASS 2: Top-down** - Calculate child amounts from fixed parent amounts × percentages
- ✅ Fixed items: Use their entered amount (rate × qty)
- ✅ Non-fixed items: Calculate from children sum recursively

### 4. Validation
- ✅ `validate_fixed_amount_constraints()` in `quotation.py` - Validates all fixed parents
- ✅ Validation integrated into `validate()` method
- ✅ Validates all hierarchy levels recursively

### 5. API Methods Validation
- ✅ `add_quotation_item()` - Validates before saving
- ✅ `add_multiple_items()` - Validates all added items
- ✅ `delete_quotation_item()` - Validates after deletion
- ✅ `duplicate_item()` - Validates after duplication
- ✅ `move_item()` - Validates new parent constraint

### 6. Field Assignment
- ✅ `add_quotation_item()` - Sets `custom_is_fixed` from kwargs
- ✅ `add_multiple_items()` - Sets `custom_is_fixed` from item_data

---

## ⏳ Pending

### 7. JavaScript UI Updates
- ⏳ Add `custom_is_fixed` checkbox in add/edit dialogs
- ⏳ Show validation errors in UI
- ⏳ Update tree display to show fixed vs calculated items
- ⏳ Client-side validation for fixed amounts

---

## 📋 Implementation Details

### Field Name
- **Database Field:** `custom_is_fixed` (Frappe automatically prefixes custom fields)

### Calculation Flow

#### Fixed Parent (`custom_is_fixed = true`)
1. User enters fixed amount (rate × qty)
2. Amount = fixed amount
3. Children calculated from parent amount × percentage
4. Validation: Children sum ≤ parent fixed amount

#### Calculated Parent (`custom_is_fixed = false`)
1. Amount = sum of all children (recursive)
2. Rate = amount / qty
3. Updates automatically when children change

### Validation Flow

```
validate() → validate_hierarchy() → validate_fixed_amount_constraints()
```

For each fixed item:
1. Calculate sum of all children recursively
2. Compare with parent fixed amount
3. Throw error if exceeded

### Error Messages

- **Exceeded Fixed Amount:**
  ```
  "Row {idx}: Total of child items ({sum}) exceeds fixed amount ({parent_amount}). 
   Please reduce child amounts or increase fixed amount."
  ```

- **After Deletion:**
  ```
  "Row {idx}: After deletion, total of child items ({sum}) exceeds fixed amount ({parent_amount})."
  ```

- **After Duplication:**
  ```
  "Row {idx}: After duplication, total of child items ({sum}) exceeds fixed amount ({parent_amount})."
  ```

---

## 🔧 Next Steps

1. **JavaScript UI Implementation:**
   - Update `quotation_hierarchy.js` to include `custom_is_fixed` checkbox
   - Add client-side validation
   - Show visual indicators for fixed vs calculated items

2. **Testing:**
   - Test fixed parent with multiple children
   - Test calculated parent with nested children
   - Test mixed hierarchy (fixed grandparent, calculated parent)
   - Test validation errors
   - Test all modification operations

3. **Documentation:**
   - Update user documentation
   - Add examples

---

## 📝 Notes

- Field name is `custom_is_fixed` (not `is_fixed`) because Frappe automatically prefixes custom fields
- Validation happens at multiple points: on save, on add, on edit, on move, on duplicate
- Calculation uses recursive functions to handle nested hierarchies
- Fixed amounts are validated top-down (parent → children → grandchildren)
- Calculated amounts are computed bottom-up (children → parent)

