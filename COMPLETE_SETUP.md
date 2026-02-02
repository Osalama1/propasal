# Propasal App - Complete Setup Summary

## ✅ What's Been Configured

The Propasal app is now **ready for installation** with all required fields and configurations in place.

### 1. Installation Hook (`propasal/install.py`)
- ✅ `after_install` hook configured in `hooks.py`
- ✅ Automatically creates all custom fields on installation
- ✅ Handles both Quotation and Quotation Item fields
- ✅ Clears cache after field creation

### 2. Custom Fields Created

#### Quotation Item (11 fields + 2 section breaks)
```
Hierarchical Structure Section:
├── hierarchy_section (Section Break)
├── item_level (Select): Activity | Phase | Task
├── parent_activity (Link): Links to parent Quotation Item
├── parent_row_no (Data): Parent row index
├── activity_reference_id (Data): Internal reference (hidden)
└── is_expandable (Check): Has children flag

Percentage & Fee Calculation Section:
├── percentage_section (Section Break)
├── custom_is_fixed (Check): Fixed amount flag
├── contract_percentage (Percent): % relative to parent
├── total_percentage (Percent): % of quotation total (read-only)
└── calculated_amount (Currency): Auto-calculated (read-only)
```

#### Quotation (2 fields)
```
├── hierarchy_tree_tab (Tab Break): Creates "Hierarchy Tree" tab
└── quotation_tree (HTML): Tree view container
```

### 3. Patches (`propasal/patches.txt`)
```
[post_model_sync]
1. add_quotation_hierarchy_fields    → Creates all fields
2. update_parent_item_to_idx         → Updates parent references
3. ensure_fields_visible             → Ensures fields are visible
```

### 4. File Structure
```
propasal/
├── install.py                      ✅ Installation hook
├── hooks.py                        ✅ App configuration
├── patches.txt                     ✅ Migration patches
├── propasal/
│   ├── quotation_hierarchy.py     ✅ Core backend logic
│   ├── quotation_item_utils.py    ✅ Utility functions
│   ├── overrides/
│   │   └── quotation.py           ✅ Quotation doctype override
│   ├── services/
│   │   └── quotation_hierarchy_service.py  ✅ Event handlers
│   └── patches/
│       └── v1_0/
│           ├── add_quotation_hierarchy_fields.py
│           ├── update_parent_item_to_idx.py
│           └── ensure_fields_visible.py
└── public/
    ├── js/
    │   └── quotation_hierarchy.js  ✅ Frontend tree view
    └── css/
        └── quotation_tree.css      ✅ Tree styling
```

### 5. Hooks Configured (`hooks.py`)
- ✅ `after_install`: Runs field creation
- ✅ `doctype_js`: Adds JS to Quotation
- ✅ `app_include_css`: Adds tree CSS globally
- ✅ `override_doctype_class`: Overrides Quotation class
- ✅ `doc_events`: Hooks for update/cancel/trash

### 6. Removed Files
- ❌ `propasal/propasal/custom/quotation_item.json` (Deleted - was causing migration errors)
- ❌ `propasal/propasal/custom/` directory (Removed - empty)

## 📦 Installation Commands

### Fresh Installation
```bash
# 1. Install app on site
bench --site pco.ontimeconsultants.com install-app propasal

# 2. Migrate (runs patches)
bench --site pco.ontimeconsultants.com migrate

# 3. Clear cache
bench --site pco.ontimeconsultants.com clear-cache

# 4. Restart bench
bench restart
```

### Verify Installation
```bash
bench --site pco.ontimeconsultants.com console
```
```python
exec(open('apps/propasal/verify_installation.py').read())
verify_installation()
```

### Manual Field Creation (if needed)
```bash
bench --site pco.ontimeconsultants.com console
```
```python
from propasal.install import create_quotation_hierarchy_fields
create_quotation_hierarchy_fields()
frappe.db.commit()
exit()
```

## 🎯 Key Features After Installation

### 1. Hierarchy Tree Tab
- New tab "Hierarchy Tree" appears in Quotation form
- Shows visual tree of Activities → Phases → Tasks
- Drag-and-drop reorganization
- Expand/collapse nodes

### 2. Item Levels
- **Activity**: Top-level items (e.g., "Construction Phase")
- **Phase**: Sub-groups (e.g., "Foundation Work")
- **Task**: Individual items (e.g., "Concrete Pouring")

### 3. Percentage Calculations
- **Contract %**: Percentage relative to parent
- **Total %**: Percentage of quotation grand total
- **Auto-calculation**: Amounts calculate based on percentages

### 4. Fixed vs. Calculated Amounts
- **Fixed**: Set amount, children must fit within it
- **Calculated**: Amount = sum of children amounts

### 5. Tree Operations
- ➕ Add Activity/Phase/Task
- ✏️ Edit item details
- 🗑️ Delete items
- 📋 Duplicate with full hierarchy
- 🔄 Move items between parents
- 📤 Export to ERPNext Tasks

## 🔧 Troubleshooting

### Issue: Fields Not Showing
**Solution**:
```bash
bench --site pco.ontimeconsultants.com console
```
```python
from propasal.install import create_quotation_hierarchy_fields
create_quotation_hierarchy_fields()
frappe.db.commit()
```

### Issue: Migration Error "KeyError: 'name'"
**Solution**: ✅ Already fixed - removed `custom/quotation_item.json`

### Issue: Tree Not Loading
**Solution**:
1. Hard refresh browser: `Ctrl+Shift+R`
2. Clear cache: `bench --site pco.ontimeconsultants.com clear-cache`
3. Restart: `bench restart`

### Issue: "Task tree view empty"
**Solution**: That's ERPNext's Task doctype, not related to Propasal.
- Check if Task default view is set to "Tree"
- Rebuild Task nested set: See INSTALLATION.md

## 📝 Testing Checklist

After installation, test these features:

- [ ] Open a new Quotation
- [ ] See "Hierarchy Tree" tab
- [ ] Add an Activity (root level item)
- [ ] Add a Phase under the Activity
- [ ] Add Tasks under the Phase
- [ ] Check percentage calculations
- [ ] Try drag-and-drop to move items
- [ ] Test "Add Multiple Items" feature
- [ ] Test "Duplicate" feature
- [ ] Test "Rebuild & Recalculate" button
- [ ] Export hierarchy to Tasks

## 🚀 Next Steps

1. **Install on pco.ontimeconsultants.com**:
   ```bash
   bench --site pco.ontimeconsultants.com install-app propasal
   bench --site pco.ontimeconsultants.com migrate
   bench --site pco.ontimeconsultants.com clear-cache
   bench restart
   ```

2. **Verify Installation**:
   - Run verification script (see above)
   - Check for any errors or warnings

3. **Test in Browser**:
   - Hard refresh (Ctrl+Shift+R)
   - Create/open a Quotation
   - Navigate to "Hierarchy Tree" tab

4. **Report Issues**:
   - If any fields missing, run manual field creation
   - If tree not loading, check browser console for errors

## 📄 Documentation Files

- `INSTALLATION.md`: Detailed installation guide
- `verify_installation.py`: Verification script
- `COMPLETE_SETUP.md`: This file
- `README.md`: App overview
- `QUOTATION_HIERARCHY_README.md`: Technical documentation

## ✨ Summary

**Status**: ✅ Ready for Installation

The Propasal app is now completely configured and ready to install on any ERPNext v15 site. All custom fields will be created automatically during installation, and the hierarchy tree view will be immediately available in the Quotation form.

**No manual configuration needed** - just install and use!
