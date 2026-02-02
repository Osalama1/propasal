# Propasal App - Installation Checklist

## ✅ Pre-Installation Verification

### App Structure
- [x] `install.py` created with after_install hook
- [x] `hooks.py` configured with after_install
- [x] All patches in `patches.txt`
- [x] No problematic JSON files in custom/
- [x] All Python files syntax-checked

### Required Files Present
- [x] `propasal/install.py`
- [x] `propasal/hooks.py`
- [x] `propasal/propasal/quotation_hierarchy.py`
- [x] `propasal/propasal/quotation_item_utils.py`
- [x] `propasal/propasal/overrides/quotation.py`
- [x] `propasal/public/js/quotation_hierarchy.js`
- [x] `propasal/public/css/quotation_tree.css`

## 📦 Installation Steps for pco.ontimeconsultants.com

### Step 1: Install App
```bash
cd /home/frappe/frappe-bench
bench --site pco.ontimeconsultants.com install-app propasal
```

**Expected Output:**
- ✓ Installing propasal...
- ✓ Custom fields added to Quotation Item and Quotation
- ✓ Propasal app installed successfully

### Step 2: Run Migration
```bash
bench --site pco.ontimeconsultants.com migrate
```

**Expected Output:**
- Updating DocTypes for propasal: [========================================] 100%
- Running patches...
- ✓ add_quotation_hierarchy_fields
- ✓ update_parent_item_to_idx
- ✓ ensure_fields_visible

### Step 3: Clear Cache
```bash
bench --site pco.ontimeconsultants.com clear-cache
```

### Step 4: Restart Bench
```bash
bench restart
```

### Step 5: Build Assets (if needed)
```bash
bench build --app propasal
```

## 🔍 Verification Steps

### 1. Run Verification Script
```bash
bench --site pco.ontimeconsultants.com console
```
```python
exec(open('apps/propasal/verify_installation.py').read())
verify_installation()
```

**Expected**: All checks pass ✓

### 2. Check Custom Fields in Database
```bash
bench --site pco.ontimeconsultants.com console
```
```python
import frappe

# Check Quotation Item fields
qi_fields = frappe.get_all("Custom Field", 
    filters={"dt": "Quotation Item"}, 
    fields=["fieldname", "fieldtype", "label"]
)
print(f"Quotation Item custom fields: {len(qi_fields)}")
for f in qi_fields:
    print(f"  - {f.fieldname} ({f.fieldtype}): {f.label}")

# Check Quotation fields
q_fields = frappe.get_all("Custom Field", 
    filters={"dt": "Quotation"}, 
    fields=["fieldname", "fieldtype", "label"]
)
print(f"\nQuotation custom fields: {len(q_fields)}")
for f in q_fields:
    print(f"  - {f.fieldname} ({f.fieldtype}): {f.label}")

exit()
```

**Expected Quotation Item Fields (11+)**:
- hierarchy_section
- item_level
- parent_activity
- parent_row_no
- activity_reference_id
- is_expandable
- percentage_section
- custom_is_fixed
- contract_percentage
- total_percentage
- calculated_amount

**Expected Quotation Fields (2)**:
- hierarchy_tree_tab
- quotation_tree

### 3. Test in Browser

#### A. Clear Browser Cache
- Chrome/Edge: `Ctrl+Shift+Delete` → Clear cache
- Or hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

#### B. Open Quotation Form
1. Go to: `https://pco.ontimeconsultants.com/app/quotation`
2. Create new or open existing quotation
3. Look for **"Hierarchy Tree"** tab (after "Items" tab)

#### C. Check Tree View
- [ ] "Hierarchy Tree" tab is visible
- [ ] Tab contains tree view interface
- [ ] "Add Activity" button is present
- [ ] "Rebuild & Recalculate" button is present
- [ ] "Expand All" / "Collapse All" buttons work

#### D. Test Basic Operations
- [ ] Add an Activity
- [ ] Add a Phase under Activity
- [ ] Add a Task under Phase
- [ ] Edit an item from tree
- [ ] Delete an item
- [ ] Check percentage calculations update

### 4. Check for JavaScript Errors
1. Open browser console (F12)
2. Go to Quotation form
3. Check for errors (should be none)

## 🚨 Common Issues & Solutions

### Issue 1: "App not found" during install
**Solution:**
```bash
cd /home/frappe/frappe-bench
bench get-app propasal ./apps/propasal
bench --site pco.ontimeconsultants.com install-app propasal
```

### Issue 2: Migration error "KeyError: 'name'"
**Status:** ✅ FIXED - Removed problematic quotation_item.json

### Issue 3: Fields not showing in form
**Solution:**
```bash
bench --site pco.ontimeconsultants.com console
```
```python
from propasal.install import create_quotation_hierarchy_fields
create_quotation_hierarchy_fields()
frappe.db.commit()
exit()
```

### Issue 4: "Hierarchy Tree" tab not appearing
**Solutions:**
1. Clear browser cache (hard refresh)
2. Check if field exists:
```python
import frappe
field = frappe.db.get_value("Custom Field", 
    {"dt": "Quotation", "fieldname": "hierarchy_tree_tab"}, 
    ["name", "hidden"]
)
print(field)
```
3. If hidden=1, update:
```python
frappe.db.set_value("Custom Field", field, "hidden", 0)
frappe.db.commit()
```

### Issue 5: Tree not loading/rendering
**Solutions:**
1. Check browser console for JS errors
2. Verify quotation_hierarchy.js is loaded
3. Clear cache: `bench --site pco.ontimeconsultants.com clear-cache`
4. Rebuild: `bench build --app propasal`

## 📊 Field Summary

### Quotation Item - 13 Total Fields

| Field Name | Type | Visible | Editable |
|------------|------|---------|----------|
| hierarchy_section | Section Break | Yes | - |
| item_level | Select | Yes | Yes |
| parent_activity | Link | Yes | Yes |
| parent_row_no | Data | Yes | No |
| activity_reference_id | Data | No | No |
| is_expandable | Check | Yes | No |
| percentage_section | Section Break | Yes | - |
| custom_is_fixed | Check | Yes | Yes |
| contract_percentage | Percent | Yes | Yes |
| total_percentage | Percent | Yes | No |
| calculated_amount | Currency | Yes | No |

### Quotation - 2 Total Fields

| Field Name | Type | Visible | Editable |
|------------|------|---------|----------|
| hierarchy_tree_tab | Tab Break | Yes | - |
| quotation_tree | HTML | Yes | No |

## ✅ Post-Installation Checklist

After successful installation:

- [ ] All fields created in database
- [ ] Verification script passes
- [ ] "Hierarchy Tree" tab visible in Quotation
- [ ] Tree view renders correctly
- [ ] Can add Activity/Phase/Task
- [ ] Percentages calculate automatically
- [ ] Can edit items from tree
- [ ] Can delete items
- [ ] Can duplicate items
- [ ] Can move items
- [ ] Export to Tasks works
- [ ] No JavaScript errors in console

## 📞 Support

If you encounter issues:

1. Check `INSTALLATION.md` for detailed troubleshooting
2. Run verification script to identify problems
3. Review browser console for JS errors
4. Check Frappe logs: `bench --site pco.ontimeconsultants.com console`

## 🎉 Success Criteria

Installation is successful when:
- ✅ All 13 Quotation Item fields exist
- ✅ All 2 Quotation fields exist
- ✅ "Hierarchy Tree" tab is visible
- ✅ Tree view loads without errors
- ✅ Can perform all CRUD operations
- ✅ Calculations work automatically

---

**Ready to Install!** 🚀

The Propasal app is fully configured and ready for deployment on pco.ontimeconsultants.com.
