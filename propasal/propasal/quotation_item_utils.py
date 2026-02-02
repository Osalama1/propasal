# Copyright (c) 2024, Propasal and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, cint

# ============================================================================
# CONSTANTS - Replace magic numbers throughout the codebase
# ============================================================================

# Default values for quotation items
DEFAULT_QUANTITY = 1  # Service items typically have qty = 1
DEFAULT_CONTRACT_PERCENTAGE = 100.0  # Default percentage if not specified
DEFAULT_ITEM_LEVEL = "Task"  # Default item level
PERCENTAGE_MAX = 100.0  # Maximum percentage value
PERCENTAGE_MIN = 0.0  # Minimum percentage value
PERCENTAGE_DIVISOR = 100.0  # Used for percentage calculations (value / 100.0)


# ============================================================================
# HELPER FUNCTIONS - Reduce code duplication
# ============================================================================

def build_items_by_name(items):
	"""
	Build a dictionary mapping item names to item objects.
	Common pattern used throughout the codebase.
	
	Args:
		items: List of item row objects
		
	Returns:
		dict: Dictionary mapping item.name -> item object
	"""
	return {row.name: row for row in items} if items else {}


def build_items_by_idx(items):
	"""
	Build a dictionary mapping item idx to item objects.
	
	Args:
		items: List of item row objects
		
	Returns:
		dict: Dictionary mapping item.idx -> item object
	"""
	return {row.idx: row for row in items} if items else {}


def find_item_by_name(items, item_name):
	"""
	Find an item in the items list by its name.
	Common pattern for finding parent items or specific items.
	
	Args:
		items: List of item row objects
		item_name: Name of the item to find
		
	Returns:
		Item object if found, None otherwise
	"""
	if not items or not item_name:
		return None
	
	for row in items:
		if row.name == item_name:
			return row
	return None


def find_items_by_parent(items, parent_name):
	"""
	Find all child items that have a specific parent.
	Common pattern for building parent-child relationships.
	
	Args:
		items: List of item row objects
		parent_name: Name of the parent item
		
	Returns:
		list: List of child items
	"""
	if not items or not parent_name:
		return []
	
	return [row for row in items if getattr(row, 'parent_activity', None) == parent_name]


def get_root_items(items):
	"""
	Get all root-level items (items with no parent_activity).
	
	Args:
		items: List of item row objects
		
	Returns:
		list: List of root items
	"""
	if not items:
		return []
	
	return [row for row in items if not getattr(row, 'parent_activity', None)]


def validate_percentage(value, field_name="Percentage", allow_none=False):
	"""
	Validate that a percentage value is within the valid range (0-100).
	
	Args:
		value: Percentage value to validate
		field_name: Name of the field for error message
		allow_none: If True, None values are allowed
		
	Returns:
		float: Validated percentage value
		
	Raises:
		ValidationError: If value is outside valid range
	"""
	if value is None and allow_none:
		return None
	
	pct = flt(value)
	if pct < PERCENTAGE_MIN or pct > PERCENTAGE_MAX:
		frappe.throw(
			_("{0} must be between {1}% and {2}%. Current value: {3}%").format(
				field_name, PERCENTAGE_MIN, PERCENTAGE_MAX, pct
			)
		)
	return pct


def normalize_percentage(value, default=None):
	"""
	Normalize a percentage value, applying default if needed.
	Also clamps to valid range as defensive check.
	
	Args:
		value: Percentage value (can be None)
		default: Default value to use if value is None/empty
		
	Returns:
		float: Normalized percentage (0-100)
	"""
	if default is None:
		default = DEFAULT_CONTRACT_PERCENTAGE
	
	pct = flt(value) if value is not None else default
	
	# Defensive clamping
	if pct < PERCENTAGE_MIN:
		pct = PERCENTAGE_MIN
	elif pct > PERCENTAGE_MAX:
		pct = PERCENTAGE_MAX
	
	return pct


def calculate_percentage_amount(parent_amount, percentage):
	"""
	Calculate child amount based on parent amount and percentage.
	Common calculation pattern used throughout the codebase.
	
	Args:
		parent_amount: Parent item amount
		percentage: Percentage value (0-100)
		
	Returns:
		float: Calculated child amount
	"""
	normalized_pct = normalize_percentage(percentage)
	return (flt(parent_amount) * normalized_pct) / PERCENTAGE_DIVISOR


def get_children_sum_recursive(items, parent_name, visited=None):
	"""
	Calculate the sum of all descendant amounts (all children and their children recursively).
	Only sums non-fixed items (fixed items use their own amount, not children sum).
	
	Args:
		items: List of all items
		parent_name: Name of the parent item
		visited: Set to prevent circular references
		
	Returns:
		float: Sum of all descendant amounts
	"""
	if not items or not parent_name:
		return 0.0
	
	if visited is None:
		visited = set()
	
	if parent_name in visited:
		return 0.0  # Circular reference
	
	visited.add(parent_name)
	
	children = find_items_by_parent(items, parent_name)
	total = 0.0
	
	for child in children:
		# Check if child is fixed
		child_is_fixed = getattr(child, 'custom_is_fixed', False)
		
		if child_is_fixed:
			# Fixed item: use its own amount
			child_amount = flt(getattr(child, 'calculated_amount', None) or getattr(child, 'amount', None) or 0)
			total += child_amount
		else:
			# Non-fixed item: recursively sum its descendants (or use its amount if leaf)
			child_children = find_items_by_parent(items, child.name)
			if child_children:
				# Has children: recursively sum descendants
				total += get_children_sum_recursive(items, child.name, visited.copy())
			else:
				# Leaf node: use its amount
				child_amount = flt(getattr(child, 'calculated_amount', None) or getattr(child, 'amount', None) or 0)
				total += child_amount
	
	return total


def validate_fixed_amount_constraint(items, parent_name, new_child_amount=0, exclude_item_name=None):
	"""
	Validate that adding/changing a child item doesn't exceed parent's fixed amount.
	
	Args:
		items: List of all items
		parent_name: Name of the parent item to check
		new_child_amount: Amount of the new/changed child (default: 0)
		exclude_item_name: Name of item to exclude from sum (when updating existing item)
		
	Returns:
		tuple: (is_valid: bool, error_message: str or None, current_sum: float, parent_amount: float)
	"""
	if not items or not parent_name:
		return True, None, 0.0, 0.0
	
	# Find parent item
	parent_item = find_item_by_name(items, parent_name)
	if not parent_item:
		return True, None, 0.0, 0.0
	
	# Check if parent is fixed
	parent_is_fixed = getattr(parent_item, 'custom_is_fixed', False)
	if not parent_is_fixed:
		# Parent is not fixed, no constraint validation needed
		return True, None, 0.0, 0.0
	
	# Parent is fixed - get its fixed amount
	parent_amount = flt(getattr(parent_item, 'calculated_amount', None) or getattr(parent_item, 'amount', None) or 0)
	
	if parent_amount <= 0:
		return True, None, 0.0, parent_amount
	
	# Calculate sum of all children (excluding the item being updated)
	children = find_items_by_parent(items, parent_name)
	current_sum = 0.0
	
	for child in children:
		# Skip excluded item (when updating existing item)
		if exclude_item_name and child.name == exclude_item_name:
			continue
		
		child_amount = flt(getattr(child, 'calculated_amount', None) or getattr(child, 'amount', None) or 0)
		
		# If child is not fixed, sum its descendants recursively
		if not getattr(child, 'custom_is_fixed', False):
			child_children = find_items_by_parent(items, child.name)
			if child_children:
				child_amount = get_children_sum_recursive(items, child.name)
		
		current_sum += child_amount
	
	# Add the new/updated child amount
	total_sum = current_sum + new_child_amount
	
	# Validate with small tolerance for floating-point precision (0.01 = 1 cent)
	TOLERANCE = 0.01
	if total_sum > (parent_amount + TOLERANCE):
		error_msg = _("Total of child items ({0}) exceeds parent fixed amount ({1}). Please reduce child amounts.").format(
			frappe.format(total_sum, {"fieldtype": "Currency"}),
			frappe.format(parent_amount, {"fieldtype": "Currency"})
		)
		return False, error_msg, total_sum, parent_amount
	
	return True, None, total_sum, parent_amount


def get_quotation_item_details(item_code, quotation_doc):
	"""Get item details - following BOM Creator pattern"""
	if not item_code:
		return {}
	
	try:
		# Get basic item details
		item = frappe.get_cached_doc("Item", item_code)
		
		item_details = {
			"item_name": item.item_name,
			"description": item.description,
			"stock_uom": item.stock_uom,
			"uom": item.stock_uom,
			"rate": 0,
		}
		
		# Try to get price from price list
		if quotation_doc.selling_price_list:
			price_list_rate = frappe.db.get_value(
				"Item Price",
				{
					"item_code": item_code,
					"price_list": quotation_doc.selling_price_list,
					"selling": 1,
				},
				"price_list_rate",
			)
			
			if price_list_rate:
				item_details["rate"] = flt(price_list_rate)
				item_details["price_list_rate"] = flt(price_list_rate)
		
		return item_details
		
	except Exception as e:
		frappe.log_error(f"Error fetching item details for {item_code}: {str(e)}")
		return {
			"item_name": item_code,
			"description": "",
			"stock_uom": "",
			"uom": "",
			"rate": 0,
		}



