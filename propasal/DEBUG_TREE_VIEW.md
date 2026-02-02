# Debug Tree View Issues

## Quick Checks

### 1. Check if Custom Fields Exist

Run in browser console (F12) when on Quotation form:
```javascript
// Check if hierarchy fields exist
let item = cur_frm.doc.items[0];
if (item) {
    console.log("Has parent_activity:", 'parent_activity' in item);
    console.log("Has item_level:", 'item_level' in item);
    console.log("Has quotation_tree field:", !!cur_frm.fields_dict.quotation_tree);
}
```

### 2. Check if JavaScript is Loaded

```javascript
// Check if namespace exists
console.log("propasal.quotation:", typeof propasal?.quotation);

// Check if class is defined
console.log("QuotationTreeView:", typeof propasal?.quotation?.QuotationTreeView);
```

### 3. Manually Trigger Tree Build

```javascript
// Check if field exists
console.log("quotation_tree field:", cur_frm.fields_dict.quotation_tree);

// Manually trigger tree build
cur_frm.trigger("build_hierarchy_tree");

// Check buttons
console.log("Custom buttons:", cur_frm.custom_buttons);
```

### 4. Check Browser Console

Open DevTools (F12) → Console tab and look for:
- "Tree container not found"
- "quotation_tree field not found"
- "QuotationTreeView class not defined"
- Any JavaScript errors

## Common Issues & Solutions

### Issue 1: "quotation_tree field not found"

**Cause:** Custom fields haven't been created yet.

**Solution:**
```bash
bench migrate
```

Or manually:
```python
from propasal.propasal.quotation_hierarchy import add_quotation_hierarchy_fields
add_quotation_hierarchy_fields()
```

### Issue 2: Buttons Not Showing

**Cause:** JavaScript not loaded or form is new.

**Solution:**
1. Check if JavaScript file is loaded in Network tab
2. Hard refresh browser (Ctrl+Shift+R)
3. Rebuild assets: `bench build --app propasal`

### Issue 3: Tree Not Building

**Cause:** Field exists but tree class not defined or API error.

**Solution:**
1. Check browser console for errors
2. Verify API endpoint works:
   ```javascript
   frappe.call({
       method: "propasal.propasal.quotation_hierarchy.get_quotation_children",
       args: { parent: cur_frm.doc.name },
       callback: (r) => console.log("API Response:", r)
   });
   ```

## Step-by-Step Fix

1. **Run Migration:**
   ```bash
   bench migrate
   ```

2. **Clear Cache:**
   ```bash
   bench clear-cache
   bench clear-website-cache
   ```

3. **Rebuild Assets:**
   ```bash
   bench build --app propasal
   ```

4. **Refresh Browser:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache

5. **Open Quotation:**
   - Open an existing Quotation (not new)
   - Check for "Rebuild Tree" button in toolbar
   - Go to "Hierarchy Tree" tab
   - Tree should appear automatically

6. **If Still Not Working:**
   - Open browser console (F12)
   - Run the debug commands above
   - Check for errors
   - Share the console output



