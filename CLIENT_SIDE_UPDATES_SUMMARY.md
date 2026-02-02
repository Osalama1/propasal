# Client-Side JavaScript Updates Summary

**Date:** January 2026  
**Purpose:** Update client-side JavaScript to align with server-side architecture changes

---

## ✅ Changes Made

### 1. **Document Status Validation** ✅

**Added:**
- Check for submitted/cancelled documents before allowing hierarchy operations
- `is_document_readonly()` helper method
- `show_readonly_message()` method to display read-only message
- Status checks in all tree operations (add, delete, move, duplicate)

**Locations:**
- `refresh()` handler - checks docstatus and shows appropriate UI
- `add_group()`, `add_item()`, `delete_node()`, `duplicate_node()`, `handle_drop()` - all check readonly status

**Benefits:**
- Prevents users from attempting operations on submitted/cancelled documents
- Clear error messages guide users on how to proceed
- Consistent behavior with server-side validation

---

### 2. **Error Handling Improvements** ✅

**Added:**
- `handle_server_error()` helper method for consistent error handling
- Specific handling for `ValidationError` exceptions
- Handling for "Cannot modify hierarchy" errors
- Error callbacks added to all `frappe.call()` operations

**Error Types Handled:**
- Validation errors (percentage range, etc.)
- Permission errors (submitted/cancelled documents)
- Generic server errors

**Benefits:**
- Users see clear, actionable error messages
- Better debugging information in console
- Graceful error handling prevents crashes

---

### 3. **Cache Invalidation and Tree Refresh** ✅

**Added:**
- `invalidate_cache_and_refresh()` helper method
- Automatic cache invalidation after all modification operations
- Document reload after operations to ensure consistency

**Operations Updated:**
- `add_group()` - invalidates cache after adding
- `add_item()` - invalidates cache after adding
- `delete_node()` - invalidates cache after deletion
- `duplicate_node()` - rebuilds tree after duplication
- `handle_drop()` - refreshes both old and new parent nodes
- `add_multiple_items()` - invalidates cache after bulk add

**Benefits:**
- Tree view always shows current data
- No stale data from cache
- Consistent state between tree and document

---

### 4. **Percentage Validation** ✅

**Added:**
- Client-side validation for percentage range (0-100%)
- `validator` function in dialog fields
- Automatic clamping of percentage values using `Math.max(0, Math.min(100, value))`

**Locations:**
- `add_group()` dialog - contract_percentage field
- `add_item()` dialog - contract_percentage field
- All API calls that send contract_percentage - values are clamped

**Benefits:**
- Immediate feedback for invalid inputs
- Prevents server errors by validating on client
- Better user experience with clear validation messages

---

### 5. **Improved User Feedback** ✅

**Enhanced:**
- Success messages after operations
- Error messages with clear titles and indicators
- Freeze messages during long operations
- Progress indicators for bulk operations

**Message Types:**
- Success: Green indicator with clear message
- Error: Red indicator with error details
- Warning: Orange indicator for readonly operations
- Info: Blue indicator for progress updates

---

## 📋 Updated Methods

### QuotationHierarchy Class

1. **`is_document_readonly()`**
   - Checks if document is submitted or cancelled
   - Returns boolean

2. **`invalidate_cache_and_refresh(node, view)`**
   - Invalidates tree cache
   - Reloads tree nodes
   - Reloads document

3. **`handle_server_error(error, default_message)`**
   - Handles different error types
   - Shows appropriate error messages
   - Logs errors for debugging

### Event Handlers

**All handlers now include:**
- Document status checks
- Error handling callbacks
- Cache invalidation after operations
- Proper user feedback

---

## 🔄 API Calls Updated

All `frappe.call()` operations now include:

```javascript
frappe.call({
	method: "...",
	args: {...},
	callback: (r) => {
		if (!r.exc && r.message) {
			// Success handling
			view.events.invalidate_cache_and_refresh(node, view);
		}
	},
	error: (r) => {
		view.events.handle_server_error(r, "Default error message");
	}
});
```

---

## 📊 Compatibility

**Server-Side Changes Supported:**
- ✅ Service layer abstraction
- ✅ Document event hooks (on_update_after_submit, on_cancel, on_trash)
- ✅ Caching strategy
- ✅ Enhanced validation (percentage range, docstatus)
- ✅ Better error messages

**Features:**
- ✅ Client-side validation matches server-side validation
- ✅ Cache invalidation syncs with server-side cache
- ✅ Error handling matches server error types
- ✅ Document status checks prevent invalid operations

---

## 🚀 Next Steps

1. **Test all operations:**
   - Add group/item
   - Delete item
   - Move item (drag & drop)
   - Duplicate item
   - Add multiple items
   - Edit item

2. **Test error scenarios:**
   - Try operations on submitted document
   - Try invalid percentage values
   - Try circular references

3. **Verify cache behavior:**
   - Operations invalidate cache correctly
   - Tree refreshes after operations
   - No stale data appears

---

**Status:** Client-side JavaScript fully updated to match server-side changes ✅

