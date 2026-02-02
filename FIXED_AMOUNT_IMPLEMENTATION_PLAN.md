# Fixed Amount vs Calculated Amount Implementation Plan

## 📋 Requirements Summary

### Core Feature
- **New Field:** `is_fixed` (Checkbox) on Quotation Item
- **Fixed Amount (`is_fixed = true`):**
  - User enters a fixed amount
  - All children (tasks/phases/sub-groups) must NOT exceed this fixed amount
  - Validation error: "Total of child items ({amount}) exceeds parent fixed amount ({parent_amount})"
  
- **Calculated Amount (`is_fixed = false`):**
  - Amount is automatically calculated from sum of children
  - Bottom-up calculation

### Hierarchical Behavior
- **Top-down:** Fixed parent amounts constrain all descendants recursively
- **Bottom-up:** Non-fixed amounts calculated from children sum
- Validation applies at every level (parent → child → grandchild → etc.)

### Validation Points
1. When adding items
2. When changing amounts
3. When changing percentages
4. When moving items
5. When duplicating items
6. When saving quotation

---

## 🎯 Implementation Steps

### ✅ Step 1: Add Custom Field
- [x] Add `is_fixed` field to Quotation Item custom fields
- Location: `quotation_hierarchy.py:add_quotation_hierarchy_fields()`

### ✅ Step 2: Helper Functions
- [x] `get_children_sum_recursive()` - Calculate sum of descendants
- [x] `validate_fixed_amount_constraint()` - Validate fixed amount constraints
- Location: `quotation_item_utils.py`

### ⏳ Step 3: Modify Calculation Logic
- [ ] Update `calculate_hierarchical_percentages()` to handle fixed vs calculated
- Logic:
  - If `is_fixed = true`: Use fixed amount, calculate children from it
  - If `is_fixed = false`: Calculate amount from children sum (bottom-up)

### ⏳ Step 4: Add Validation
- [ ] Add validation in `validate_hierarchy()` method
- Validate all fixed parents don't have children exceeding their amount
- Recursive validation for all hierarchy levels

### ⏳ Step 5: Update API Methods
- [ ] `add_quotation_item()` - Validate before adding
- [ ] `add_multiple_items()` - Validate all items
- [ ] `duplicate_item()` - Validate after duplication
- [ ] `move_item()` - Validate new parent constraint
- [ ] `edit_node()` - Validate amount changes

### ⏳ Step 6: Update JavaScript UI
- [ ] Add `is_fixed` checkbox in add/edit dialogs
- [ ] Show validation errors in UI
- [ ] Update tree display to show fixed vs calculated

---

## 📐 Calculation Logic

### Scenario 1: Fixed Parent
```
Parent (is_fixed=true, amount=1000)
├── Child1 (20%) = 200
├── Child2 (30%) = 300
└── Child3 (50%) = 500
Total: 1000 ✅ (matches parent)
```

If Child1 changes to 600:
- Total: 600 + 300 + 500 = 1400
- Validation: ❌ "Exceeds parent fixed amount (1000)"

### Scenario 2: Calculated Parent
```
Parent (is_fixed=false)
├── Child1 (amount=200)
├── Child2 (amount=300)
└── Child3 (amount=500)
Parent amount = 200 + 300 + 500 = 1000 (auto-calculated)
```

### Scenario 3: Mixed (Nested)
```
GrandParent (is_fixed=true, amount=10000)
└── Parent (is_fixed=false)
    ├── Child1 = 3000
    └── Child2 = 4000
    Parent amount = 7000 (calculated)
    Total: 7000 ✅ (within GrandParent's 10000)
```

---

## 🔍 Validation Algorithm

```python
def validate_fixed_constraints(items):
    """
    Validate all fixed amount constraints in hierarchy
    """
    items_by_name = build_items_by_name(items)
    
    for item in items:
        if getattr(item, 'is_fixed', False):
            # Get all children
            children = find_items_by_parent(items, item.name)
            
            # Calculate sum of children
            children_sum = get_children_sum_recursive(items, item.name)
            
            # Get parent fixed amount
            parent_amount = flt(item.amount or item.calculated_amount or 0)
            
            # Validate
            if children_sum > parent_amount:
                raise ValidationError(
                    f"Row {item.idx}: Total of child items ({children_sum}) "
                    f"exceeds fixed amount ({parent_amount})"
                )
```

---

## 🎨 UI Changes

### Add Group/Item Dialog
- Add checkbox: "Is Fixed Amount"
- If checked: Show amount field (required)
- If unchecked: Show calculated amount (read-only)
- Show validation errors below amount field

### Tree Display
- Show indicator for fixed items (e.g., 🔒)
- Show calculated items differently
- Display parent amount constraint in tooltip

---

## 📝 Next Steps

1. Complete calculation logic modification
2. Add validation in validate_hierarchy()
3. Update all API methods with validation
4. Update JavaScript UI
5. Test all scenarios

