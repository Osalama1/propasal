# Tree View Synchronization Fixes

## Issues Fixed

### 1. **Adding from Tree Shows 0 Values**
**Problem:** When adding a phase/task from tree view, all values (amount, percentage) were showing as 0.

**Root Cause:** 
- The dialog was sending either `amount` OR `contract_percentage`, but backend was expecting both or calculating incorrectly
- The `rate` field wasn't being set properly when `amount` was provided

**Solution:**
```javascript
// Now explicitly sets rate = amount for service items
if (finalAmount > 0) {
    itemData.amount = finalAmount;
    itemData.rate = finalAmount;  // For service items, rate = amount
} else if (finalPercentage > 0) {
    itemData.contract_percentage = finalPercentage;
}
```

### 2. **Table Changes Not Reflecting in Tree View**
**Problem:** When editing values in the Items table (changing amount, percentage, etc.), the tree view UI didn't update.

**Root Cause:**
- The debounce sync was checking `!frm.is_new()` which prevented sync on unsaved documents
- The sync wasn't triggering on all grid events

**Solution:**
```javascript
// Now uses grid-refresh event which fires after any grid change
$(frm.fields_dict.items.grid.wrapper).on('grid-refresh', syncDebounce);

// Removed the is_new() check so sync works on all documents
if (propasal.quotation.TreeInstance) {
    console.log("Syncing tree from document changes...");
    propasal.quotation.TreeInstance.syncFromDocument();
}
```

### 3. **Tree Not Showing Updated Values After Save**
**Problem:** After saving the document, the tree would rebuild but not show the server-calculated values.

**Root Cause:**
- `after_save` was destroying the tree instance completely (`TreeInstance = null`)
- This caused loss of expanded state and required full reload
- The tree wasn't reloading from the server after save

**Solution:**
```javascript
after_save(frm) {
    // Keep the tree instance, just update it
    if (propasal.quotation.TreeInstance) {
        // Update flags
        propasal.quotation.TreeInstance.isNew = false;
        propasal.quotation.TreeInstance.docname = frm.doc.name;
        
        setTimeout(() => {
            // Reload tree to get server-calculated values
            propasal.quotation.TreeInstance.nodes.clear();
            propasal.quotation.TreeInstance.loadRootNodes();
        }, 300);
    }
}
```

### 4. **Async Refresh Not Waiting**
**Problem:** `refreshAfterChange` wasn't awaiting properly, causing race conditions.

**Solution:**
```javascript
async refreshAfterChange(parentName) {
    // Reload document first to get updated values from server
    await this.frm.reload_doc();
    
    // Clear nodes cache
    this.nodes.clear();
    
    // For saved documents, reload from API
    // For new documents, sync from document
    if (this.isNew || !this.docname || this.docname === "new") {
        this.syncFromDocument();
    } else {
        await this.loadRootNodes();
    }
    
    // Re-expand previously expanded nodes
    if (parentName && this.expandedNodes.has(parentName)) {
        const $node = this.$content.find(`[data-name="${parentName}"]`);
        if ($node.length && !$node.hasClass('is-expanded')) {
            this.toggleNode($node);
        }
    }
}
```

## Testing Checklist

✅ **Add Phase with Amount:**
   - Add Activity with 750k
   - Add Phase with amount 100k
   - Expected: Shows 100k and ~13.33% in tree immediately
   - Expected: After save, values persist

✅ **Add Task with Percentage:**
   - Add Activity with 750k
   - Add Task with 50%
   - Expected: Shows 375k and 50% in tree immediately
   - Expected: After save, values persist

✅ **Edit in Table:**
   - Change amount in Items table from 100k to 200k
   - Expected: Tree updates within 500ms to show 200k
   - Expected: Percentage recalculates automatically

✅ **Edit Percentage in Table:**
   - Change contract_percentage from 50% to 75%
   - Expected: Tree updates to show 75%
   - Expected: Amount recalculates based on parent

✅ **Save Document:**
   - Make changes via tree
   - Save document
   - Expected: Tree refreshes with server-calculated values
   - Expected: Expanded nodes stay expanded

## Key Changes Made

1. **quotation_hierarchy.js - showAddGroupDialog()**: Fixed to send `rate` along with `amount`
2. **quotation_hierarchy.js - showAddTaskDialog()**: Fixed to send `rate` along with `amount`
3. **quotation_hierarchy.js - setup_item_table_sync()**: Changed to use `grid-refresh` event and removed `is_new()` check
4. **quotation_hierarchy.js - after_save()**: Changed to update existing instance instead of destroying it
5. **quotation_hierarchy.js - refreshAfterChange()**: Added proper async/await and conditional reload logic

## Backend Behavior (No Changes Needed)

The backend `add_quotation_item()` function already handles:
- When `amount` is provided: Sets `rate = amount`, calculates `contract_percentage` from parent
- When `contract_percentage` is provided: Calculates `amount` from parent × percentage
- When both provided: Uses `amount` and recalculates `contract_percentage`

The backend `calculate_hierarchical_percentages()` function already:
- Respects user-entered amounts (doesn't overwrite them)
- Calculates non-fixed items from children sum
- Calculates fixed item children from parent amount × percentage
- Preserves `custom_is_fixed` constraints

## Performance Notes

- Debounce increased to 500ms to avoid excessive tree rebuilds during rapid typing
- `syncFromDocument()` is lightweight - rebuilds from existing `frm.doc.items`
- `loadRootNodes()` fetches from server - only called after save or when needed
- Tree preserves expanded state through `expandedNodes` Set

## Future Enhancements

Consider:
1. Visual indicator when sync is in progress
2. Highlight recently changed items in tree
3. Batch updates for multiple table changes
4. Undo/redo functionality for tree operations

