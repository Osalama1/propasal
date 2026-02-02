# Code Flow: Adding Phase/Item with Amount

## Scenario: User adds a Phase/Item and enters an Amount

### Step-by-Step Flow

#### 1. **User Opens Dialog** (`showAddGroupDialog` or `showAddTaskDialog`)

**Location:** `quotation_hierarchy.js` line 1245 (showAddGroupDialog) or 1470 (showAddTaskDialog)

**What happens:**
- Dialog shows fields: Item Code, Name, Percentage, Amount
- User enters amount (e.g., 100,000)
- User clicks "Add"

---

#### 2. **Dialog Creates itemData** (Line 1395-1405)

**Code:**
```javascript
const itemData = {
    parent_activity: parentName || "",
    item_code: values.item_code,
    item_name: values.item_name,
    item_level: values.item_level,
    qty: 1,
    custom_is_fixed: values.custom_is_fixed ? 1 : 0,
    contract_percentage: finalPercentage,  // From dialog (if provided)
    amount: finalAmount,                    // From dialog (e.g., 100,000)
    rate: 0                                 // ✅ FIXED: Set to 0 (not finalAmount)
};
```

**Key Points:**
- `amount: finalAmount` - User's entered amount (e.g., 100,000)
- `rate: 0` - Rate is NOT used when amount is the input method
- `contract_percentage: finalPercentage` - May be 0 if user only entered amount

---

#### 3. **Two Paths: New vs Saved Quotation**

##### Path A: **New Quotation** (Line 1408-1411)
```javascript
if (this.isNew || !this.docname || this.docname === "new") {
    this.addItemToDocument(itemData);
    return;
}
```

**Calls:** `addItemToDocument(itemData)` → Goes to Step 4A

##### Path B: **Saved Quotation** (Line 1415-1416)
```javascript
await this.addItem({ parent: this.docname, ...itemData });
```

**Calls:** Server API `add_quotation_item` → Goes to Step 4B

---

#### 4A. **addItemToDocument (New Quotation)** (Line 1205-1240)

**Code:**
```javascript
addItemToDocument(data) {
    const row = this.frm.add_child('items');
    
    row.item_code = data.item_code || '';
    row.item_name = data.item_name || '';
    row.item_level = data.item_level || 'Task';
    row.parent_activity = data.parent_activity || '';
    row.contract_percentage = data.contract_percentage || 100;
    row.qty = data.qty || 1;
    row.rate = flt(data.rate) || 0;  // ✅ Set to 0 (from itemData)
    
    // If amount is provided directly, set it
    if (data.amount !== undefined) {
        row.amount = flt(data.amount) || 0;  // ✅ Sets amount = 100,000
    }
    // Otherwise, Frappe will calculate amount from rate × qty
    
    this.frm.refresh_field('items');
    this.syncFromDocument();  // Updates UI tree
}
```

**What happens:**
1. Creates new row in child table
2. Sets `rate = 0` (from itemData)
3. Sets `amount = 100,000` (from itemData)
4. Sets `contract_percentage` (from itemData, or defaults to 100)
5. Refreshes items table
6. **Amount handler fires** (because amount was set)

---

#### 4B. **Server API: add_quotation_item (Saved Quotation)** (Line 913-945)

**Code:**
```python
if user_amount > 0:
    # User provided amount - use it
    amount = user_amount  # ✅ 100,000
    rate = flt(kwargs.get("rate") or 0)  # ✅ 0 (from itemData)
    # Calculate percentage from amount if parent exists
    if parent_amount > 0:
        contract_percentage = (user_amount / parent_amount) * 100
    else:
        contract_percentage = user_percentage
```

**What happens:**
1. Server receives: `amount=100000, rate=0, contract_percentage=0`
2. Since `user_amount > 0`, enters first branch
3. Sets `amount = 100,000`
4. Sets `rate = 0` (preserved from kwargs)
5. **Calculates `contract_percentage`** from amount if parent exists:
   - If parent amount = 500,000
   - Percentage = (100,000 / 500,000) × 100 = 20%
6. Creates item row with these values
7. Saves document
8. Calls `calculate_hierarchical_percentages(doc)` - recalculates all items

---

#### 5. **Amount Handler Fires** (Line 352-377)

**Triggered by:** Setting `row.amount = 100,000` in Step 4A

**Code:**
```javascript
amount(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    
    // Recalculate percentage from amount (NOT from rate)
    if (!row._skip_percentage_recalc && row.parent_activity) {
        const parentLocal = locals["Quotation Item"]?.[row.parent_activity];
        if (parentLocal) {
            const parentAmount = flt(parentLocal.calculated_amount) || flt(parentLocal.amount) || 0;
            const currentAmount = flt(row.amount) || 0;  // 100,000
            
            if (parentAmount > 0 && currentAmount > 0) {
                const newPercentage = (currentAmount / parentAmount) * 100;
                // ✅ Recalculates percentage from amount
                frappe.model.set_value(cdt, cdn, "contract_percentage", newPercentage);
            }
        }
    }
    
    // Sync tree
    if (propasal.quotation.TreeInstance) {
        propasal.quotation.TreeInstance.syncFromDocument();
    }
}
```

**What happens:**
1. Amount handler detects amount = 100,000
2. Gets parent amount (e.g., 500,000)
3. **Calculates percentage** = (100,000 / 500,000) × 100 = 20%
4. Sets `contract_percentage = 20%`
5. Syncs UI tree

---

#### 6. **UI Tree Updates** (Line 559-656)

**Triggered by:** `syncFromDocument()` call

**Code:**
```javascript
syncFromDocument() {
    // Reads from child table (locals)
    const items = [];
    grid.grid_rows.forEach(grid_row => {
        const localDoc = locals[grid_row.doc.doctype]?.[grid_row.doc.name];
        items.push(localDoc);
    });
    
    // Builds nodeData (rate is NOT included)
    const nodeData = {
        name: item.name,
        amount: flt(item.amount) || 0,           // ✅ 100,000
        calculated_amount: flt(item.calculated_amount) || flt(item.amount) || 0,
        contract_percentage: flt(item.contract_percentage) || 0,  // ✅ 20%
        // rate: REMOVED - not used in UI
    };
    
    this.renderFromDocument();  // Updates tree display
}
```

**What happens:**
1. Reads latest values from child table (locals)
2. Gets: `amount=100000, contract_percentage=20, rate=0`
3. **Rate is NOT stored in nodeData** (removed)
4. Tree displays: Amount = 100,000, Percentage = 20%
5. Rate is not shown (not relevant for UI)

---

## Summary: What Happens When Adding with Amount

### Input:
- User enters: `amount = 100,000`
- Dialog creates: `itemData = { amount: 100000, rate: 0, contract_percentage: 0 }`

### Process:
1. **Child Table:** Sets `rate=0, amount=100000, contract_percentage=0`
2. **Amount Handler:** Detects amount change → Calculates `percentage = (100000 / parent_amount) × 100`
3. **Child Table Updated:** `rate=0, amount=100000, contract_percentage=20%` (calculated)
4. **UI Tree:** Displays `amount=100000, percentage=20%` (rate not shown)

### Final State:
- ✅ **Rate = 0** (not used when amount is input method)
- ✅ **Amount = 100,000** (user input)
- ✅ **Percentage = 20%** (calculated from amount / parent × 100)
- ✅ **UI shows:** Amount and Percentage (rate hidden)

---

## Key Principles Enforced

1. **Rate = 0** when amount is the input method
2. **Amount = User Input** (preserved)
3. **Percentage = Calculated** from amount (not from rate)
4. **UI displays:** Amount and Percentage (rate not shown)
5. **No rate calculation** - rate stays 0
