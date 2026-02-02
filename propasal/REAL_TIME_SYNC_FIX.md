# Real-Time Sync Fix - Tree View ↔️ Table

## Changes Made

### 1. **Fixed Data Source for Sync**
**Problem:** Tree was reading from `frm.doc.items`, but grid edits are stored in `locals[cdt][cdn]` and grid rows.

**Solution:** Now reads directly from grid rows:
```javascript
syncFromDocument() {
    // Get items from the grid (which has the latest values from user edits)
    const items = [];
    if (this.frm.fields_dict.items && this.frm.fields_dict.items.grid) {
        // Get items from grid rows (this has the most up-to-date data)
        this.frm.fields_dict.items.grid.grid_rows.forEach(row => {
            if (row.doc) {
                items.push(row.doc);
            }
        });
    }
    
    // Fallback to frm.doc.items if grid is not available
    if (items.length === 0) {
        items.push(...(this.frm.doc.items || []));
    }
}
```

### 2. **Enhanced Event Listeners**
**Problem:** Single debounced event wasn't catching all changes.

**Solution:** Multiple event listeners for comprehensive coverage:
```javascript
// 1. Grid render events (fires when grid is rendered/updated)
$grid.on('grid-row-render', syncDebounced);

// 2. Input change events (while typing) - debounced
$grid.on('change', 'input, select, textarea', syncDebounced);

// 3. Blur events (when field loses focus) - IMMEDIATE sync
$grid.on('blur', 'input, select, textarea', syncImmediate);

// 4. Frappe field change events - IMMEDIATE sync
frappe.ui.form.on("Quotation Item", {
    amount: syncImmediate,
    rate: syncImmediate,
    contract_percentage: syncImmediate,
    qty: syncImmediate
});
```

### 3. **Added Console Logging**
For debugging, the sync now logs:
- 🔄 When sync starts
- 📊 Number of items being synced
- ➜ First 3 items' values (amount, percentage)
- ✅ When sync completes
- 🔔 Which event triggered the sync

### 4. **Immediate vs Debounced Sync**
- **Debounced (300ms)**: For `change` events while typing
- **Immediate**: For `blur` events (field loses focus) and frappe field events

## Testing Instructions

### Test 1: Edit Amount in Table ✅
1. Open a Quotation with hierarchy items
2. Click on Phase row in Items table
3. Change amount from 100000 to 200000
4. Press Tab or click outside the field
5. **Expected:** Tree updates IMMEDIATELY showing 200000
6. **Check console:** Should see "💰 Amount changed in grid" and sync messages

### Test 2: Edit Percentage in Table ✅
1. Click on Phase row in Items table
2. Change contract_percentage from 13.3 to 25
3. Press Tab or click outside
4. **Expected:** Tree updates IMMEDIATELY showing 25%
5. **Check console:** Should see "📊 Contract percentage changed in grid"

### Test 3: No Reload Required ✅
1. Edit any value in table (amount, rate, percentage)
2. Watch the tree view
3. **Expected:** Tree updates WITHOUT page reload
4. Values should match table exactly

### Test 4: Multiple Edits ✅
1. Edit amount in row 1
2. Edit percentage in row 2
3. Edit rate in row 3
4. **Expected:** Tree updates after each blur/field change
5. All values match table

## Debug Console Output

When working correctly, you should see:
```
🔔 Field blur, syncing tree immediately...
🔄 Syncing tree from document...
📊 Building tree from 5 items
  ➜ SERVICE-001: 750000 (100%)
  ➜ SERVICE-002: 200000 (26.67%)
  ➜ SERVICE-003: 50000 (6.67%)
✅ Tree sync complete
```

## Architecture

```
┌─────────────────────┐
│  User Edits Table   │
│  (Items Grid)       │
└──────────┬──────────┘
           │
           ├─── change event (debounced 300ms)
           ├─── blur event (immediate)
           └─── frappe field events (immediate)
           │
           ▼
┌──────────────────────────┐
│  syncFromDocument()      │
│  - Reads from grid.rows  │
│  - Updates nodes Map     │
│  - Calls renderFromDoc   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────┐
│  Tree UI Updates     │
│  (Visual Refresh)    │
└──────────────────────┘
```

## Key Differences from Previous Implementation

| Aspect | Before | After |
|--------|--------|-------|
| Data Source | `frm.doc.items` (stale) | `grid.grid_rows[].doc` (live) |
| Event Type | Single debounced | Multiple: debounced + immediate |
| Sync Trigger | grid-refresh only | blur, change, field events |
| Debug Info | None | Comprehensive console logs |
| Update Speed | 500ms delay | Immediate on blur |

## Troubleshooting

### If tree doesn't update:
1. Open browser console (F12)
2. Edit a value in table
3. Check for sync logs
4. If no logs appear, the event listener might not be attached
5. Refresh page and try again

### If values are wrong:
1. Check console for which items are being synced
2. Verify the values shown in console match table
3. If console shows wrong values, grid data might not be updating
4. Try clicking outside the field (blur) to trigger save

### If tree shows old data after page reload:
- This is expected - reload fetches from server
- Make changes in table
- Save the document
- Then reload to see server-calculated values

## Performance

- **Debounced sync (300ms):** Prevents excessive updates while typing
- **Immediate sync on blur:** Ensures update as soon as field loses focus
- **Grid row source:** Faster than re-parsing `frm.doc.items`
- **Console logs:** Can be removed for production if needed

