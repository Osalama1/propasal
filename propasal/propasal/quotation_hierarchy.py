# Copyright (c) 2024, Propasal and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, cint
from propasal.propasal.quotation_item_utils import (
	get_quotation_item_details,
	build_items_by_name,
	build_items_by_idx,
	find_item_by_name,
	find_items_by_parent,
	get_root_items,
	validate_percentage,
	normalize_percentage,
	calculate_percentage_amount,
	validate_fixed_amount_constraint,
	get_children_sum_recursive,
	DEFAULT_QUANTITY,
	DEFAULT_CONTRACT_PERCENTAGE,
	DEFAULT_ITEM_LEVEL,
	PERCENTAGE_MAX,
	PERCENTAGE_MIN,
	PERCENTAGE_DIVISOR,
)
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def get_effective_parent_amount(parent_item):
	"""
	Get the effective parent amount for percentage calculations.
	
	If parent has a discount (net_amount < amount), use net_amount.
	This ensures children percentages are calculated against the discounted amount.
	
	Args:
		parent_item: The parent Quotation Item row
		
	Returns:
		float: The effective amount to use for percentage calculations
	"""
	if not parent_item:
		return 0
	
	# Priority: net_amount (if different from amount, means discount applied)
	# Then calculated_amount, then amount
	net_amt = flt(parent_item.net_amount) or 0
	calculated_amt = flt(parent_item.calculated_amount) or 0
	amt = flt(parent_item.amount) or 0
	
	# If net_amount is set and different from amount, use net_amount (discount applied)
	if net_amt > 0:
		return net_amt
	
	# Otherwise use calculated_amount or amount
	return calculated_amt or amt


def _invalidate_quotation_cache(quotation_name: str, doc=None) -> None:
	"""
	Invalidate all cache entries related to a quotation.
	
	Args:
		quotation_name: Name of the quotation
		doc: Optional Quotation doc to invalidate parent-specific keys
	"""
	if not quotation_name:
		return
	
	# Always invalidate root keys
	cache_keys = {
		f"quotation_children_{quotation_name}_root",
		f"quotation_children_{quotation_name}_None",
		f"quotation_children_{quotation_name}",
	}
	
	# If we have the document, invalidate all parent-specific keys too
	if doc and getattr(doc, "items", None):
		for row in doc.items:
			if row.item_code:
				cache_keys.add(f"quotation_children_{quotation_name}_{row.item_code}")
			if row.item_name:
				cache_keys.add(f"quotation_children_{quotation_name}_{row.item_name}")
	
	for key in cache_keys:
		frappe.cache().delete_value(key)
	
	frappe.logger().debug(
		f"Cache invalidated for quotation: {quotation_name} ({len(cache_keys)} keys)"
	)


def add_quotation_hierarchy_fields():
	"""Add custom fields to Quotation Item for hierarchical structure"""
	
	quotation_item_fields = {
		"Quotation Item": [
			# Section: Hierarchical Structure
			{
				"fieldname": "hierarchy_section",
				"fieldtype": "Section Break",
				"label": "Hierarchical Structure",
				"insert_after": "item_name",
				"collapsible": 1,
			},
			{
				"fieldname": "item_level",
				"fieldtype": "Select",
				"label": "Item Level",
				"options": "\nActivity\nPhase\nTask",
				"insert_after": "hierarchy_section",
				"default": "Task",
				"in_list_view": 1,
			},
			{
				"fieldname": "parent_activity",
				"fieldtype": "Link",
				"label": "Parent Activity",
				"description": "The Activity/Phase this item belongs to",
				"options": "Quotation Item",
				"insert_after": "item_level",
				"hidden": 0,
			},
			{
				"fieldname": "parent_row_no",
				"fieldtype": "Data",
				"label": "Parent Row No",
				"description": "Row number (idx) of parent item",
				"read_only": 1,
				"print_hide": 1,
				"insert_after": "parent_activity",
			},
			{
				"fieldname": "activity_reference_id",
				"fieldtype": "Data",
				"label": "Activity Reference ID",
				"description": "Internal reference ID for hierarchy tracking",
				"read_only": 1,
				"hidden": 1,
				"no_copy": 1,
				"print_hide": 1,
				"insert_after": "parent_row_no",
			},
			{
				"fieldname": "is_expandable",
				"fieldtype": "Check",
				"label": "Is Expandable",
				"description": "Indicates if this item has children",
				"read_only": 1,
				"default": 0,
				"print_hide": 1,
				"insert_after": "activity_reference_id",
			},
			
			# Section: Percentage & Fee Calculation
			{
				"fieldname": "percentage_section",
				"fieldtype": "Section Break",
				"label": "Percentage & Fee Calculation",
				"insert_after": "is_expandable",
				"collapsible": 1,
			},
			{
				"fieldname": "custom_is_fixed",
				"fieldtype": "Check",
				"label": "Is Fixed Amount",
				"description": "If checked, amount is fixed and children must not exceed it. If unchecked, amount is calculated from children sum.",
				"default": 0,
				"insert_after": "percentage_section",
			},
			{
				"fieldname": "contract_percentage",
				"fieldtype": "Percent",
				"label": "Contract Percentage (%)",
				"description": "Percentage relative to parent item",
				"precision": 2,
				"insert_after": "custom_is_fixed",
				"in_list_view": 0,
			},
			{
				"fieldname": "total_percentage",
				"fieldtype": "Percent",
				"label": "Total Percentage (%)",
				"description": "Percentage of total quotation amount",
				"precision": 2,
				"read_only": 1,
				"print_hide": 0,
				"insert_after": "contract_percentage",
			},
			{
				"fieldname": "calculated_amount",
				"fieldtype": "Currency",
				"label": "Calculated Amount",
				"description": "Auto-calculated based on total percentage",
				"read_only": 1,
				"options": "currency",
				"print_hide": 0,
				"insert_after": "total_percentage",
			},
		]
	}
	
	# Add tree view field to Quotation
	quotation_fields = {
		"Quotation": [
			{
				"fieldname": "hierarchy_tree_tab",
				"fieldtype": "Tab Break",
				"label": "Hierarchy Tree",
				"insert_after": "items",
			},
			{
				"fieldname": "quotation_tree",
				"fieldtype": "HTML",
				"label": "Quotation Hierarchy Tree",
				"insert_after": "hierarchy_tree_tab",
				"hidden": 0,
				"read_only": 1,
			},
		]
	}
	
	create_custom_fields(quotation_item_fields, ignore_validate=True, update=True)
	create_custom_fields(quotation_fields, ignore_validate=True, update=True)
	
	# Clear cache to ensure fields are available
	frappe.clear_cache(doctype="Quotation")
	frappe.clear_cache(doctype="Quotation Item")
	
	frappe.msgprint(_("Custom fields added to Quotation Item and Quotation"))


@frappe.whitelist()
def recalculate_quotation(quotation_name):
	"""Force full recalculation of quotation hierarchy"""
	try:
		doc = frappe.get_doc("Quotation", quotation_name)
	except frappe.DoesNotExistError:
		frappe.throw(_("Quotation '{0}' not found").format(quotation_name))
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to access Quotation '{0}'").format(quotation_name))
	
	if doc.docstatus > 0:
		frappe.throw(_("Cannot recalculate a submitted or cancelled quotation"))
	
	# Force full recalculation
	set_reference_ids(doc)
	set_is_expandable(doc)
	calculate_hierarchical_percentages(doc)
	
	# Save and invalidate cache
	doc.save()
	_invalidate_quotation_cache(doc.name, doc)
	
	return {
		"success": True,
		"message": _("Quotation recalculated successfully"),
		"grand_total": doc.grand_total
	}


@frappe.whitelist()
def get_quotation_children(doctype=None, parent=None, is_root=None, **kwargs):
	"""Get children for tree view - EXACT BOM Creator pattern with caching"""
	if isinstance(kwargs, str):
		kwargs = frappe.parse_json(kwargs)
	
	if isinstance(kwargs, dict):
		kwargs = frappe._dict(kwargs)
	
	# BOM Creator Pattern: parent parameter is passed differently for root vs children
	# For root: parent is passed in kwargs.parent_id
	# For children: parent is the node's name
	quotation_name = kwargs.get("parent_id") or kwargs.get("quotation_name")
	
	if not quotation_name:
		return []
	
	# Build cache key based on quotation name and parent (for tree expansion)
	cache_key = f"quotation_children_{quotation_name}_{parent or 'root'}"
	
	# Try to get from cache first (skip cache if name filter is provided)
	if not kwargs.get("name"):
		cached_result = frappe.cache().get_value(cache_key)
		if cached_result is not None:
			frappe.logger().debug(f"Cache hit for quotation children: {cache_key}")
			return cached_result
	
	# Get meta for field checks
	try:
		meta = frappe.get_meta("Quotation Item")
	except Exception:
		return []
	
	# Check if parent_activity field exists - if not, fields haven't been migrated
	if not meta.has_field("parent_activity"):
		frappe.msgprint(
			_("Custom fields not found. Please run migration: <code>bench migrate</code>"),
			indicator="orange",
			alert=True
		)
		return []
	
	# Build fields list - only include fields that exist
	# BOM Creator Pattern: item_code as value (primary display)
	fields = [
		"item_code",
		"item_name",
		"parent as parent_id",
		"idx",
		"name",
		"rate",
		"amount",
		"qty",
		"uom",
		# Standard ERPNext discount/pricing fields
		"net_amount",
		"discount_percentage",
		"discount_amount",
		"price_list_rate",
		"net_rate",
	]
	
	# Add optional custom fields if they exist
	optional_fields = [
		("is_expandable", "is_expandable"),  # Don't alias - keep as is_expandable
		("item_level", "item_level"),
		("contract_percentage", "contract_percentage"),
		("total_percentage", "total_percentage"),
		("calculated_amount", "calculated_amount"),
		("activity_reference_id", "activity_reference_id"),
		("parent_activity", "parent_activity"),
		("parent_row_no", "parent_row_no"),
		("custom_is_fixed", "custom_is_fixed"),
	]
	
	for fieldname, field_expr in optional_fields:
		if meta.has_field(fieldname):
			fields.append(field_expr)
	
	# BOM Creator Pattern: Use item_code for parent relationship (like fg_item)
	query_filters = {
		"parent": quotation_name,  # Quotation document name
	}
	
	# Determine if this is root or child query
	# Root: parent equals quotation_name OR parent is empty
	# Child: parent is an item_code
	is_root_query = not parent or parent == quotation_name or parent == ""
	
	if not is_root_query:
		# Children of a specific item - find parent by item_code OR item_name
		# First, try to find parent by item_code
		parent_items = frappe.get_all(
			"Quotation Item",
			filters={"parent": quotation_name, "item_code": parent},
			fields=["name"],
			limit=1
		)
		
		# If not found by item_code, try item_name (for items with empty item_code)
		if not parent_items:
			parent_items = frappe.get_all(
				"Quotation Item",
				filters={"parent": quotation_name, "item_name": parent},
				fields=["name"],
				limit=1
			)
		
		if parent_items:
			# Filter items that have this parent's name as parent_activity
			query_filters["parent_activity"] = parent_items[0].name
			frappe.logger().info(f"Found children for parent: {parent} (name: {parent_items[0].name})")
		else:
			# No parent found - return empty
			frappe.logger().warning(f"Parent not found: {parent}")
			return []
	else:
		# Root level - items with no parent_activity
		query_filters["parent_activity"] = ["in", ["", None]]
	
	if kwargs.name:
		query_filters["name"] = kwargs.name
	
	try:
		items = frappe.get_all("Quotation Item", fields=fields, filters=query_filters, order_by="idx")
		
		# BOM Creator Pattern: Post-process to add required fields
		processed_items = []
		for item in items:
			# Convert to frappe._dict for proper attribute access
			item = frappe._dict(item)
			
			# BOM Creator Pattern: value = item_code OR item_name for tree expansion
			# When tree expands, it passes value as parent parameter
			# We query by item_code OR item_name to find parent, then match parent_activity
			item.value = item.get("item_code") or item.get("item_name") or f"Item-{item.get('idx', '')}"
			
			# Store label separately for display
			item.label = item.get("item_code") or item.get("item_name") or f"Item-{item.get('idx', '')}"
			
			# Set doctype for tree
			item.doctype = "Quotation Item"
			
			# Set expandable field (tree needs this as 'expandable', not 'is_expandable')
			item.expandable = item.get("is_expandable") or 0
			
			processed_items.append(item)
		
		items = processed_items
		
		# DON'T add hierarchical numbering here - it breaks tree rendering
		# The tree will render items multiple times (root, then children)
		# items = add_hierarchical_numbers(items, quotation_name)
		
		# Cache the result (skip cache if name filter is provided)
		if not kwargs.get("name"):
			# Cache for 5 minutes (300 seconds)
			frappe.cache().set_value(cache_key, items, expires_in_sec=300)
			frappe.logger().debug(f"Cache set for quotation children: {cache_key}")
		
		return items
	except Exception as e:
		# If query fails due to missing fields, return empty list with message
		if "Unknown column" in str(e):
			frappe.msgprint(
				_("Custom fields not found. Please run migration: <code>bench migrate</code>"),
				indicator="orange",
				alert=True
			)
			return []
		raise


def add_hierarchical_numbers(items, quotation_name):
	"""Add hierarchical numbering like 1, 1.1, 1.2, 2, 2.1 to items"""
	if not items:
		return items
	
	# Build a map of items by name for quick lookup
	items_by_name = {item.name: item for item in items}
	
	# Build parent-child relationships
	children_map = {}
	root_items = []
	
	for item in items:
		parent_activity = getattr(item, 'parent_activity', None)
		if parent_activity and parent_activity in items_by_name:
			if parent_activity not in children_map:
				children_map[parent_activity] = []
			children_map[parent_activity].append(item)
		else:
			root_items.append(item)
	
	# Sort root items by idx
	root_items.sort(key=lambda x: x.idx)
	
	# Recursively assign hierarchical numbers
	result = []
	level_counters = {}  # Track counters for each level
	
	def assign_number(item, parent_number="", level=0):
		# Get or initialize counter for this level
		if level not in level_counters:
			level_counters[level] = 0
		
		level_counters[level] += 1
		
		if parent_number:
			# Child item: use parent number + counter
			item_number = f"{parent_number}.{level_counters[level]}"
		else:
			# Root item: just use counter
			item_number = str(level_counters[level])
		
		# Add hierarchical number to value (label)
		original_value = item.value or item.item_name or ""
		item.value = f"{item_number}. {original_value}"
		item.hierarchical_number = item_number
		
		result.append(item)
		
		# Process children - reset counter for next level
		children = children_map.get(item.name, [])
		children.sort(key=lambda x: x.idx)
		
		# Reset counter for children level
		child_level = level + 1
		if child_level not in level_counters:
			level_counters[child_level] = 0
		
		for child in children:
			assign_number(child, item_number, child_level)
	
	# Process all root items
	for root_item in root_items:
		assign_number(root_item, "", 0)
	
	return result


def set_reference_ids(doc):
	"""Set parent_row_no and activity_reference_id for tree structure
	NOTE: parent_activity stores the NAME (not item_code) of parent item"""
	if not doc.items:
		return
	
	# Build maps for quick lookup (using helper functions)
	items_by_name = build_items_by_name(doc.items)
	items_by_idx = build_items_by_idx(doc.items)
	items_by_item_code = {}
	
	# Build item_code map (handling duplicate item_codes)
	for row in doc.items:
		if row.item_code:
			if row.item_code not in items_by_item_code:
				items_by_item_code[row.item_code] = []
			items_by_item_code[row.item_code].append(row)
	
	for row in doc.items:
		# Set parent_row_no from parent_activity (which stores NAME, not item_code)
		if row.parent_activity and row.parent_activity in items_by_name:
			parent_item = items_by_name[row.parent_activity]
			row.parent_row_no = cint(parent_item.idx)
		else:
			row.parent_row_no = 0
		
		# Set activity_reference_id for tree grouping
		if row.parent_row_no and row.parent_row_no in items_by_idx:
			# Child item - reference parent
			row.activity_reference_id = items_by_idx[row.parent_row_no].name
		elif not row.parent_activity:
			# Root item - reference itself
			row.activity_reference_id = row.name
		else:
			row.activity_reference_id = ""


def set_is_expandable(doc):
	"""
	Set is_expandable flag:
	1. Items marked as Activity or Phase are always expandable (groups)
	2. Items that have children are expandable
	"""
	if not doc.items:
		return
	
	# Find all items that are used as parent_activity (have children) - using helper
	parent_activities = set()
	for row in doc.items:
		parent_activity = getattr(row, 'parent_activity', None)
		if parent_activity:
			parent_activities.add(parent_activity)
	
	for row in doc.items:
		# Groups (Activity/Phase) are ALWAYS expandable, even without children
		if hasattr(row, 'item_level') and row.item_level in ["Activity", "Phase"]:
			row.is_expandable = 1
		# Items that have children are expandable
		elif row.name in parent_activities:
			row.is_expandable = 1
		# Tasks without children are NOT expandable
		else:
			row.is_expandable = 0


def calculate_hierarchical_percentages(doc):
	"""
	ENHANCED CALCULATION LOGIC WITH FIXED AMOUNTS:
	1. Bottom-up: Calculate non-fixed amounts from children sum
	2. Top-down: Calculate child amounts from fixed parent amounts × child percentage
	3. Bottom-up: Calculate grand total from leaf items, then percentages
	4. Sync with Quotation totals
	"""
	if not doc.items:
		return
	
	# Map items by name for quick lookup (using helper function)
	items_by_name = build_items_by_name(doc.items)
	
	# Import helper function for recursive sum
	from propasal.propasal.quotation_item_utils import get_children_sum_recursive
	
	# PASS 1: BOTTOM-UP - Calculate non-fixed amounts from children sum
	# Process children FIRST (true bottom-up)
	def calculate_non_fixed_amounts(item):
		"""Calculate amount for non-fixed items from their children sum
		IMPORTANT: Leaf items keep their user-entered values"""
		# Get all children
		children = find_items_by_parent(doc.items, item.name)
		
		# First, recursively process all children (bottom-up order)
		for child in children:
			calculate_non_fixed_amounts(child)
		
		if not children:
			# Leaf node - RATE IS USER INPUT, NEVER RECALCULATE IT
			# Only calculate amount = rate × qty
			original_rate = flt(item.rate)
			qty = flt(item.qty) or 1
			
			if original_rate > 0:
				# User has set rate - calculate amount from rate × qty
				calculated = original_rate * qty
				item.calculated_amount = calculated
				item.amount = calculated
				# Rate stays unchanged - it's user input
			elif flt(item.amount) > 0:
				# Amount is set but rate is 0 - preserve amount as-is
				item.calculated_amount = flt(item.amount)
				# Don't calculate rate from amount - rate is user input only
			else:
				item.calculated_amount = 0
				item.amount = 0
			
			# Recalculate percentage from amount (for display purposes only)
			# Percentage is derived from amount, not the other way around
			# Use net_amount if parent has discount, so percentage reflects discounted parent value
			parent_activity = getattr(item, 'parent_activity', '')
			if parent_activity:
				parent_item = find_item_by_name(doc.items, parent_activity)
				if parent_item:
					parent_amount = get_effective_parent_amount(parent_item)
					if parent_amount > 0 and item.calculated_amount > 0:
						item.contract_percentage = (item.calculated_amount / parent_amount) * 100
			
			return item.calculated_amount
		
		# Has children - check if item is fixed
		is_fixed = getattr(item, 'custom_is_fixed', False)
		
		if is_fixed:
			# Fixed item - preserve its entered amount and rate
			if flt(item.rate) > 0:
				# Preserve rate, recalculate amount from rate * qty
				parent_amount = flt(item.rate) * flt(item.qty)
				item.calculated_amount = parent_amount
				item.amount = parent_amount
			elif flt(item.amount) > 0:
				# If amount is set but rate is 0, preserve amount
				item.calculated_amount = flt(item.amount)
			# Don't change rate for fixed items when qty changes
		else:
			# Non-fixed item - calculate from children sum
			# #region agent log
			import json; log_data = {"location":"quotation_hierarchy.py:594","message":"Parent item calculation","data":{"item_name":getattr(item,"item_name",""),"rate_before":flt(item.rate),"qty":flt(item.qty)},"timestamp":frappe.utils.now(),"sessionId":"debug-session","runId":"initial","hypothesisId":"B"}; open("/home/frappe/frappe-bench/.cursor/debug.log","a").write(json.dumps(log_data)+"\n")
			# #endregion
			
			children_sum = get_children_sum_recursive(doc.items, item.name)
			item.calculated_amount = children_sum
			item.amount = children_sum
			
			# Rate is USER INPUT - NEVER calculate it, always preserve user input
			original_rate = flt(item.rate)
			item.rate = original_rate  # Preserve user input, never calculate
			
			# #region agent log
			log_data = {"location":"quotation_hierarchy.py:604","message":"Parent item calculation result","data":{"item_name":getattr(item,"item_name",""),"rate_after":flt(item.rate),"amount_after":flt(item.amount),"children_sum":children_sum},"timestamp":frappe.utils.now(),"sessionId":"debug-session","runId":"initial","hypothesisId":"B"}; open("/home/frappe/frappe-bench/.cursor/debug.log","a").write(json.dumps(log_data)+"\n")
			# #endregion
		
		return item.calculated_amount
	
	# PASS 2: TOP-DOWN - Calculate child amounts from parent amounts
	# KEY PRINCIPLE:
	# - FIXED children: Keep their amount, recalculate percentage
	# - NON-FIXED children: Keep their percentage, recalculate amount from parent
	# - Propagate changes down the tree (even through non-fixed intermediate nodes)
	def calculate_child_amounts_from_parent(parent_item, force_recalculate=False):
		"""Calculate child amounts based on parent amount and their percentages
		
		Args:
			parent_item: The parent item
			force_recalculate: If True, recalculate all children regardless of parent fixed status
		"""
		# Get all children
		children = find_items_by_parent(doc.items, parent_item.name)
		
		if not children:
			return
		
		# Check if parent is fixed OR if we need to force recalculate
		parent_is_fixed = getattr(parent_item, 'custom_is_fixed', False)
		
		if not parent_is_fixed and not force_recalculate:
			# Parent is not fixed and no force - just recurse to find nested fixed items
			for child in children:
				calculate_child_amounts_from_parent(child, force_recalculate=False)
			return
		
		# Parent is fixed OR force_recalculate - calculate children
		# Use net_amount if parent has discount applied
		parent_amount = get_effective_parent_amount(parent_item)
		
		for child in children:
			# Check if CHILD is fixed
			child_is_fixed = getattr(child, 'custom_is_fixed', False)
			
			if child_is_fixed:
				# FIXED child: Keep its fixed amount, recalculate percentage
				child_amount = flt(child.amount) or (flt(child.rate) * flt(child.qty))
				if child_amount <= 0:
					# No amount set - use percentage to calculate
					child_percentage = normalize_percentage(child.contract_percentage)
					child_amount = calculate_percentage_amount(parent_amount, child_percentage)
				
				child.calculated_amount = child_amount
				child.amount = child_amount
				# Recalculate percentage based on amount
				if parent_amount > 0:
					child.contract_percentage = (child_amount / parent_amount) * 100
				
				# Recursively calculate for fixed child's children
				calculate_child_amounts_from_parent(child, force_recalculate=False)
			else:
				# NON-FIXED child: Keep percentage, recalculate amount from parent
				# #region agent log
				import json; log_data = {"location":"quotation_hierarchy.py:658","message":"Non-fixed child calculation","data":{"child_name":getattr(child,"item_name",""),"rate_before":flt(child.rate),"qty":flt(child.qty)},"timestamp":frappe.utils.now(),"sessionId":"debug-session","runId":"initial","hypothesisId":"C"}; open("/home/frappe/frappe-bench/.cursor/debug.log","a").write(json.dumps(log_data)+"\n")
				# #endregion
				
				child_percentage = normalize_percentage(child.contract_percentage)
				child_amount = calculate_percentage_amount(parent_amount, child_percentage)
				child.calculated_amount = child_amount
				child.amount = child_amount
				
				# Rate is USER INPUT - NEVER calculate it, always preserve user input
				original_rate = flt(child.rate)
				child.rate = original_rate  # Preserve user input, never calculate
				
				# #region agent log
				log_data = {"location":"quotation_hierarchy.py:672","message":"Non-fixed child calculation result","data":{"child_name":getattr(child,"item_name",""),"rate_after":flt(child.rate),"amount_after":flt(child.amount),"child_amount":child_amount},"timestamp":frappe.utils.now(),"sessionId":"debug-session","runId":"initial","hypothesisId":"C"}; open("/home/frappe/frappe-bench/.cursor/debug.log","a").write(json.dumps(log_data)+"\n")
				# #endregion
				
				# IMPORTANT: Force recalculate this child's children too!
				# Because we just updated this child's amount, its children need to be recalculated
				calculate_child_amounts_from_parent(child, force_recalculate=True)
	
	# Process all root-level items (no parent_activity) - using helper function
	root_items = get_root_items(doc.items)
	
	# First pass: Calculate non-fixed amounts bottom-up
	for root_item in root_items:
		calculate_non_fixed_amounts(root_item)
	
	# Second pass: Calculate children from fixed parents top-down
	for root_item in root_items:
		calculate_child_amounts_from_parent(root_item, force_recalculate=False)
	
	# PASS 2: Calculate grand total from root item amounts
	# Root items represent the actual project values, so we use their amounts
	# (not leaf totals) for the grand total calculation
	def get_leaf_total(item):
		"""Get total of leaf items (items with no children) under this item
		Used for calculating total_percentage only, not for grand total"""
		children = find_items_by_parent(doc.items, item.name)
		
		if not children:
			# Leaf node - return its amount
			return flt(item.calculated_amount) or flt(item.amount) or 0
		
		# Has children - sum their leaf totals
		total = 0
		for child in children:
			total += get_leaf_total(child)
		
		return total
	
	# Calculate grand total from root item amounts (not leaf totals)
	# This ensures that:
	# - Fixed root items use their fixed amount
	# - Calculated root items use their calculated amount (sum of children)
	# - Multiple root items are summed together
	calculated_grand_total = 0
	for root_item in root_items:
		# Use root item's calculated_amount or amount
		# This respects both fixed and calculated root items
		root_amount = flt(root_item.calculated_amount) or flt(root_item.amount) or 0
		calculated_grand_total += root_amount
	
	# PASS 3: Calculate total_percentage for each item (% of grand total)
	if calculated_grand_total > 0:
		for row in doc.items:
			item_total = get_leaf_total(row)
			row.total_percentage = (item_total / calculated_grand_total) * PERCENTAGE_DIVISOR
	else:
		for row in doc.items:
			row.total_percentage = 0.0
	
	# PASS 4: Let ERPNext calculate totals
	# Note: calculate_totals_from_hierarchy() in quotation.py overrides the default
	# total calculation to sum root item amounts (not leaf items).
	# This ensures that:
	# - Fixed root items use their fixed amount
	# - Calculated root items use their calculated amount (sum of children)
	# - Multiple root items are summed together
	# Root items represent the actual project values, so we use their amounts for grand total.


@frappe.whitelist()
def delete_quotation_item(item_name, parent):
	"""Delete quotation item and its children recursively - following BOM Creator pattern"""
	try:
		doc = frappe.get_doc("Quotation", parent)
	except frappe.DoesNotExistError:
		frappe.throw(_("Quotation '{0}' not found").format(parent))
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to access Quotation '{0}'").format(parent))
	except Exception as e:
		frappe.log_error(
			message=f"Error retrieving Quotation {parent}: {str(e)}",
			title="Delete Quotation Item Error"
		)
		frappe.throw(_("Error retrieving quotation. Please try again or contact support."))
	
	# Prevent modifications on submitted/cancelled documents
	if doc.docstatus > 0:
		frappe.throw(
			_("Cannot modify hierarchy structure on a submitted or cancelled quotation. Please cancel the quotation first to make changes.")
		)
	
	# Find item and its children (items that have this item as parent_activity)
	items_to_delete = []
	
	def collect_children(item_name):
		items_to_delete.append(item_name)
		# Find all items that have this item as parent_activity (using helper function)
		children_items = find_items_by_parent(doc.items, item_name)
		children = [row.name for row in children_items]
		for child in children:
			collect_children(child)
	
	collect_children(item_name)
	
	# Use transaction management to ensure atomicity
	try:
		# Remove items from doc
		doc.items = [row for row in doc.items if row.name not in items_to_delete]
		
		# Recalculate
		calculate_hierarchical_percentages(doc)
		
		# Validate fixed amount constraints after deletion
		# Check all fixed parents to ensure their children still don't exceed them
		for item in doc.items:
			if hasattr(item, 'custom_is_fixed') and getattr(item, 'custom_is_fixed', False):
				children_sum = get_children_sum_recursive(doc.items, item.name)
				parent_amount = flt(item.calculated_amount) or flt(item.amount) or 0
				if children_sum > parent_amount:
					frappe.db.rollback()
					frappe.throw(
						_("Row {0}: After deletion, total of child items ({1}) exceeds fixed amount ({2}).").format(
							item.idx,
							frappe.format(children_sum, {"fieldtype": "Currency", "currency": doc.currency or "EGP"}),
							frappe.format(parent_amount, {"fieldtype": "Currency", "currency": doc.currency or "EGP"})
						)
					)
		
		doc.save()
		
		# Invalidate cache after modification
		_invalidate_quotation_cache(doc.name, doc)
		
		return True
	except Exception as e:
		# Rollback transaction on error
		frappe.db.rollback()
		frappe.log_error(
			message=f"Error deleting quotation item: {str(e)}",
			title="Delete Quotation Item Error"
		)
		raise


@frappe.whitelist()
def add_quotation_item(**kwargs):
	"""Add item to quotation from tree - following BOM Creator pattern EXACTLY"""
	if isinstance(kwargs, str):
		kwargs = frappe.parse_json(kwargs)
	
	if isinstance(kwargs, dict):
		kwargs = frappe._dict(kwargs)
	
	# Add error handling for document retrieval
	try:
		doc = frappe.get_doc("Quotation", kwargs.parent)
	except frappe.DoesNotExistError:
		frappe.throw(_("Quotation '{0}' not found").format(kwargs.parent))
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to access Quotation '{0}'").format(kwargs.parent))
	except Exception as e:
		frappe.log_error(
			message=f"Error retrieving Quotation {kwargs.parent}: {str(e)}",
			title="Add Quotation Item Error"
		)
		frappe.throw(_("Error retrieving quotation. Please try again or contact support."))
	
	# Prevent modifications on submitted/cancelled documents
	if doc.docstatus > 0:
		frappe.throw(
			_("Cannot modify hierarchy structure on a submitted or cancelled quotation. Please cancel the quotation first to make changes.")
		)
	
	# BOM Creator Pattern: item_code is REQUIRED
	if not kwargs.get("item_code"):
		frappe.throw("Item Code is required")
	
	# Validate contract_percentage if provided (using helper function)
	if kwargs.get("contract_percentage") is not None:
		validate_percentage(kwargs.get("contract_percentage"), "Contract Percentage")
	
	# Get item details from Item master - following BOM Creator pattern
	item_data = {}
	if kwargs.get("item_code"):
		from propasal.propasal.quotation_item_utils import get_quotation_item_details
		
		item_data = get_quotation_item_details(kwargs.item_code, doc)
		
		# Override with user-provided values if present
		if kwargs.get("rate"):
			item_data["rate"] = flt(kwargs.get("rate"))
		if kwargs.get("item_name"):
			item_data["item_name"] = kwargs.get("item_name")
	
	# Prepare item row data
	# For service items, amount = rate (qty is typically 1)
	qty = flt(kwargs.get("qty") or DEFAULT_QUANTITY)
	
	# Ensure qty is at least 1 (ERPNext requirement)
	if qty <= 0:
		qty = DEFAULT_QUANTITY
	
	# Determine parent_activity first (needed for percentage calculation)
	parent_activity = kwargs.get("parent_activity") or ""
	if parent_activity == doc.name:
		parent_activity = ""  # Root level - no parent
	
	# Get parent amount for percentage calculation
	# Use net_amount if parent has discount applied (so children are % of discounted amount)
	parent_amount = 0
	if parent_activity:
		parent_item = find_item_by_name(doc.items, parent_activity)
		if parent_item:
			parent_amount = get_effective_parent_amount(parent_item)
			# Fallback if no effective amount yet
			if not parent_amount:
				parent_amount = flt(parent_item.rate) * flt(parent_item.qty)
	
	# Calculate rate, amount, and percentage
	# Priority: If user provides AMOUNT, calculate percentage from it
	# If user provides only PERCENTAGE, calculate amount from parent
	user_amount = flt(kwargs.get("amount") or 0)
	user_percentage = flt(kwargs.get("contract_percentage") if kwargs.get("contract_percentage") is not None else 100)
	user_rate = flt(kwargs.get("rate") or 0)
	
	if user_amount > 0:
		# Dialog "Amount" field sets rate, not amount
		rate = user_amount  # User enters "amount" in dialog → sets rate
		amount = rate * qty  # Calculate for initial setup (Frappe will recalculate)
		# Calculate percentage from amount if parent exists
		if parent_amount > 0:
			contract_percentage = (amount / parent_amount) * 100
		else:
			contract_percentage = user_percentage  # Root item or no parent amount
	elif user_rate > 0:
		# User provided rate
		rate = user_rate
		amount = rate * qty
		if parent_amount > 0:
			contract_percentage = (amount / parent_amount) * 100
		else:
			contract_percentage = user_percentage
	elif parent_amount > 0 and user_percentage > 0:
		# Percentage provided: calculate amount → set rate
		calculated_amount = (parent_amount * user_percentage) / 100
		rate = calculated_amount  # Set rate = calculated amount
		amount = rate * qty  # Calculate for initial setup (Frappe will recalculate)
		contract_percentage = user_percentage
	elif item_data.get("rate"):
		rate = flt(item_data.get("rate"))
		amount = rate * qty
		contract_percentage = user_percentage
	else:
		rate = 0
		amount = 0
		contract_percentage = user_percentage
	
	# Set UOM - default to "Nos" if not available
	default_uom = frappe.db.get_single_value("Stock Settings", "stock_uom") or "Nos"
	uom = item_data.get("uom") or item_data.get("stock_uom") or default_uom
	
	# VALIDATION: If parent is fixed and child is Phase/Activity, child must also be fixed
	item_level = kwargs.get("item_level") or DEFAULT_ITEM_LEVEL
	requested_is_fixed = kwargs.get("is_fixed") or kwargs.get("custom_is_fixed") or False
	
	if parent_activity:
		# Find parent item
		parent_item = find_item_by_name(doc.items, parent_activity)
		if parent_item:
			parent_is_fixed = getattr(parent_item, 'custom_is_fixed', False)
			parent_item_level = getattr(parent_item, 'item_level', '')
			
			# If parent is fixed and child is Phase/Activity (not Task), child must be fixed
			if parent_is_fixed and item_level in ['Activity', 'Phase']:
				if not requested_is_fixed:
					frappe.throw(
						_("Cannot add non-fixed {0} '{1}' under fixed {2} '{3}'. "
						  "Child groups (Phase/Activity) under a fixed parent must also be fixed. "
						  "This constraint does not apply to Tasks.").format(
							item_level,
							kwargs.get("item_name") or kwargs.get("item_code") or "",
							parent_item_level,
							parent_item.item_name or parent_item.item_code or ""
						)
					)
	
	item_row = {
		"item_code": kwargs.get("item_code") or "",
		"item_name": kwargs.get("item_name") or item_data.get("item_name") or "",
		"description": kwargs.get("description") or item_data.get("description") or "",
		"item_level": item_level,
		"parent_activity": parent_activity,
		"parent_row_no": "",  # Will be set by set_reference_ids
		"contract_percentage": normalize_percentage(contract_percentage),  # Use calculated percentage
		"custom_is_fixed": 1 if requested_is_fixed else 0,
		"qty": qty,
		"rate": rate,
		"amount": amount,
		"calculated_amount": amount,  # Set calculated_amount to preserve user-entered value
		"uom": uom,
		"stock_uom": item_data.get("stock_uom") or uom,
		"is_expandable": 1 if item_level in ['Activity', 'Phase'] else 0,  # Groups are expandable
		# Clear price_list_rate to prevent ERPNext from auto-calculating discounts
		# When rate is set from percentage/amount, it should NOT be treated as a discount from price_list_rate
		"price_list_rate": 0,
		"discount_percentage": 0,
		"discount_amount": 0,
	}
	
	# Append to items
	new_item = doc.append("items", item_row)
	
	# Use transaction management to ensure atomicity
	# If any step fails, the entire operation is rolled back
	try:
		# IMPORTANT: Save first to get idx assigned
		doc.save()
		
		# NOW set reference IDs using the saved idx
		set_reference_ids(doc)
		set_is_expandable(doc)
		calculate_hierarchical_percentages(doc)
		
		# Validate fixed amount constraints before final save
		parent_activity = kwargs.get("parent_activity") or ""
		if parent_activity and parent_activity != doc.name:
			# Validate against parent's fixed amount
			new_item_amount = flt(new_item.amount) or flt(new_item.calculated_amount) or 0
			is_valid, error_msg, current_sum, parent_amount = validate_fixed_amount_constraint(
				doc.items,
				parent_activity,
				new_item_amount,
				exclude_item_name=new_item.name  # Exclude the item we just added
			)
			if not is_valid:
				frappe.db.rollback()
				frappe.throw(error_msg)
		
		# Save again with calculated values
		doc.save()
		
		# Invalidate cache after modification
		_invalidate_quotation_cache(doc.name, doc)
		
		return doc
	except Exception as e:
		# Rollback transaction on error
		frappe.db.rollback()
		frappe.log_error(
			message=f"Error adding quotation item: {str(e)}",
			title="Add Quotation Item Error"
		)
		raise


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_parent_items(doctype, txt, searchfield, start, page_len, filters):
	"""Get list of parent items (expandable items only) for parent_activity field"""
	quotation = filters.get("quotation")
	current_item = filters.get("current_item")
	
	if not quotation:
		return []
	
	# Get all expandable items from this quotation (excluding current item)
	items = frappe.get_all(
		"Quotation Item",
		filters={
			"parent": quotation,
			"parenttype": "Quotation",
			"is_expandable": 1,
			"name": ["!=", current_item] if current_item else ["is", "set"]
		},
		fields=["name", "item_code", "item_name", "item_level"],
		order_by="idx asc"
	)
	
	# Filter by search text if provided
	if txt:
		txt_lower = txt.lower()
		items = [
			item for item in items 
			if txt_lower in (item.get("item_code") or "").lower() 
			or txt_lower in (item.get("item_name") or "").lower()
		]
	
	# Return in format: [[name, "item_code - item_name (level)"]]
	result = []
	for item in items:
		display = f"{item.get('item_code') or item.get('item_name')} ({item.get('item_level', '')})"
		result.append([item.get("name"), display])
	
	return result


@frappe.whitelist()
def quick_create_item(item_code, item_name, item_group="Services"):
	"""Quickly create a service item"""
	if frappe.db.exists("Item", item_code):
		return {"exists": True, "name": item_code}
	
	item = frappe.get_doc({
		"doctype": "Item",
		"item_code": item_code,
		"item_name": item_name,
		"item_group": item_group,
		"stock_uom": "Nos",
		"is_stock_item": 0,
		"is_sales_item": 1,
		"include_item_in_manufacturing": 0,
	})
	item.insert(ignore_permissions=True)
	
	return {"exists": False, "name": item.name}


@frappe.whitelist()
def add_multiple_items(quotation_name, parent_name, items):
	"""Add multiple items at once"""
	import json
	if isinstance(items, str):
		items = json.loads(items)
	
	try:
		doc = frappe.get_doc("Quotation", quotation_name)
	except frappe.DoesNotExistError:
		frappe.throw(_("Quotation '{0}' not found").format(quotation_name))
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to access Quotation '{0}'").format(quotation_name))
	except Exception as e:
		frappe.log_error(
			message=f"Error retrieving Quotation {quotation_name}: {str(e)}",
			title="Add Multiple Items Error"
		)
		frappe.throw(_("Error retrieving quotation. Please try again or contact support."))
	
	# Prevent modifications on submitted/cancelled documents
	if doc.docstatus > 0:
		frappe.throw(
			_("Cannot modify hierarchy structure on a submitted or cancelled quotation. Please cancel the quotation first to make changes.")
		)
	
	# Find parent item (using helper function)
	parent_item = find_item_by_name(doc.items, parent_name)
	if not parent_item:
		frappe.throw(_("Parent item not found"))
	
	# Add all items
	added_count = 0
	new_items = []  # Track newly added items
	
	for item_data in items:
		if not item_data.get("item_code"):
			continue
		
		# Fetch item details (but DON'T use Price List rate - we'll calculate our own)
		item_details = get_quotation_item_details(item_data.get("item_code"), doc)
		
		# Get parent amount for percentage calculation
		parent_amount_for_calc = flt(parent_item.calculated_amount) or flt(parent_item.amount) or 0
		
		# Calculate rate from percentage/amount
		# DO NOT use Price List rate - rate should be calculated from percentage/amount
		user_percentage = flt(item_data.get("contract_percentage") or 0)
		user_amount = flt(item_data.get("amount") or 0)
		user_rate = flt(item_data.get("rate") or 0)
		
		# Determine rate:
		# 1. If amount provided: rate = amount (amount is what user wants as rate)
		# 2. If percentage provided: rate = calculated amount from percentage
		# 3. If rate provided: use it
		# 4. Otherwise: rate = 0
		calculated_rate = 0
		if user_amount > 0:
			# Amount provided → rate = amount
			calculated_rate = user_amount
		elif user_percentage > 0 and parent_amount_for_calc > 0:
			# Percentage provided → rate = calculated amount from percentage
			calculated_amount = (parent_amount_for_calc * user_percentage) / 100
			calculated_rate = calculated_amount
		elif user_rate > 0:
			# Rate explicitly provided
			calculated_rate = user_rate
		
		# Add new row
		new_row = doc.append("items", {})
		new_row.item_code = item_data.get("item_code")
		new_row.item_name = item_details.get("item_name") or item_data.get("item_code")
		new_row.description = item_data.get("description") or item_details.get("description")
		new_row.uom = item_details.get("stock_uom") or "Nos"
		new_row.qty = DEFAULT_QUANTITY
		# Set rate to our calculated value (NOT Price List rate)
		new_row.rate = calculated_rate
		# Calculate amount from rate * qty
		new_row.amount = calculated_rate * new_row.qty
		new_row.item_level = DEFAULT_ITEM_LEVEL
		contract_pct = normalize_percentage(item_data.get("contract_percentage"))
		# Validate percentage range
		validate_percentage(contract_pct, "Contract Percentage")
		new_row.contract_percentage = contract_pct
		new_row.custom_is_fixed = 1 if item_data.get("is_fixed") or item_data.get("custom_is_fixed") else 0
		new_row.is_expandable = 0
		# Set parent immediately (before save, so it's part of the row)
		new_row.parent_activity = parent_item.name
		# Clear price_list_rate to prevent ERPNext from auto-calculating discounts
		new_row.price_list_rate = 0
		new_row.discount_percentage = 0
		new_row.discount_amount = 0
		
		new_items.append(new_row)
		added_count += 1
	
	# Use transaction management to ensure atomicity
	try:
		# First save to get idx for new items
		doc.save()
		
		# Set parent_row_no for all new items (parent_activity was already set above)
		for new_row in new_items:
			new_row.parent_row_no = parent_item.idx
		
		# Save again with references and calculate hierarchy
		set_reference_ids(doc)
		set_is_expandable(doc)
		calculate_hierarchical_percentages(doc)
		
		# Validate fixed amount constraints ONCE (not per-item!)
		# All items are already in doc.items, so new_child_amount=0
		is_valid, error_msg, current_sum, parent_amount = validate_fixed_amount_constraint(
			doc.items,
			parent_item.name,
			new_child_amount=0,  # Items already counted in doc.items
			exclude_item_name=None
		)
		if not is_valid:
			frappe.db.rollback()
			frappe.throw(error_msg)
		
		doc.save()
		
		# Invalidate cache after modification
		_invalidate_quotation_cache(doc.name, doc)
		
		return {"success": True, "added_count": added_count}
	except Exception as e:
		# Rollback transaction on error
		frappe.db.rollback()
		frappe.log_error(
			message=f"Error adding multiple items: {str(e)}",
			title="Add Multiple Items Error"
		)
		raise


@frappe.whitelist()
def duplicate_item(quotation_name, source_item_name, target_parent_name, include_children=1, new_percentage=None, new_amount=None):
	"""Duplicate an item (and optionally its children) to another parent"""
	try:
		doc = frappe.get_doc("Quotation", quotation_name)
	except frappe.DoesNotExistError:
		frappe.throw(_("Quotation '{0}' not found").format(quotation_name))
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to access Quotation '{0}'").format(quotation_name))
	except Exception as e:
		frappe.log_error(
			message=f"Error retrieving Quotation {quotation_name}: {str(e)}",
			title="Duplicate Item Error"
		)
		frappe.throw(_("Error retrieving quotation. Please try again or contact support."))
	
	# Prevent modifications on submitted/cancelled documents
	if doc.docstatus > 0:
		frappe.throw(
			_("Cannot modify hierarchy structure on a submitted or cancelled quotation. Please cancel the quotation first to make changes.")
		)
	
	# Find source item (using helper function)
	source_item = find_item_by_name(doc.items, source_item_name)
	if not source_item:
		frappe.throw(_("Source item not found"))
	
	# Find target parent (using helper function)
	target_parent = find_item_by_name(doc.items, target_parent_name)
	if not target_parent:
		frappe.throw(_("Target parent not found"))
	
	# Use transaction management to ensure atomicity
	try:
		# Get target parent's fixed status and amount for validation and calculation
		# Use net_amount if parent has discount applied
		target_parent_is_fixed = getattr(target_parent, 'custom_is_fixed', False)
		target_parent_amount = get_effective_parent_amount(target_parent)
		
		# Calculate existing children percentage sum in target (to know how much space is available)
		existing_target_children = find_items_by_parent(doc.items, target_parent.name)
		existing_percentage_sum = sum(flt(c.contract_percentage) for c in existing_target_children)
		available_percentage = max(0, 100 - existing_percentage_sum)
		
		# Get source children and calculate their total percentage
		direct_children = find_items_by_parent(doc.items, source_item.name)
		
		if direct_children:
			# Calculate total percentage of source children
			source_children_pct_sum = sum(flt(c.contract_percentage) for c in direct_children)
		else:
			# Single item duplication
			source_children_pct_sum = flt(source_item.contract_percentage)
		
		# Calculate scaling factor to fit within available space
		# If source percentages exceed available space, scale them down proportionally
		if source_children_pct_sum > 0 and source_children_pct_sum > available_percentage:
			scaling_factor = available_percentage / source_children_pct_sum
		else:
			scaling_factor = 1.0
		
		# Duplicate the item (recursive function)
		# KEY CHANGE: Copy PERCENTAGE (scaled), calculate AMOUNT from new parent
		def duplicate_recursive(item, new_parent_name, new_parent_idx, parent_is_fixed, parent_amount, scale_factor=1.0):
			# Create duplicate
			new_row = doc.append("items", {})
			new_row.item_code = item.item_code
			new_row.item_name = item.item_name
			new_row.description = item.description
			new_row.uom = item.uom
			new_row.qty = item.qty
			new_row.item_level = item.item_level
			
			# FIXED: Copy PERCENTAGE (with scaling), calculate AMOUNT from new parent amount
			# This ensures items fit proportionally within their new parent
			if new_percentage:
				# User specified a percentage for duplication - use it directly (no scaling)
				contract_pct = normalize_percentage(new_percentage)
			else:
				# Copy source percentage and apply scaling factor
				source_pct = flt(item.contract_percentage) or 0
				contract_pct = normalize_percentage(source_pct * scale_factor)
			
			validate_percentage(contract_pct, "Contract Percentage")
			new_row.contract_percentage = contract_pct
			
			# Calculate amount from percentage × parent amount (not copy from source)
			if new_amount:
				# User specified explicit amount
				calculated_amount = flt(new_amount)
			elif parent_amount > 0 and contract_pct > 0:
				# Calculate from percentage of new parent
				calculated_amount = (contract_pct / 100) * parent_amount
			else:
				# Default to 0
				calculated_amount = 0
			
			# Rate is USER INPUT - copy from source item, don't calculate
			new_row.rate = flt(item.rate) or 0  # Preserve rate from source item (user input)
			new_row.amount = calculated_amount
			new_row.calculated_amount = calculated_amount
			new_row.is_expandable = item.is_expandable if include_children else 0
			# Clear price_list_rate to prevent ERPNext from auto-calculating discounts
			new_row.price_list_rate = 0
			new_row.discount_percentage = 0
			new_row.discount_amount = 0
			
			# Handle custom_is_fixed flag based on parent and item level
			if new_row.item_level in ['Activity', 'Phase']:
				if parent_is_fixed:
					new_row.custom_is_fixed = 1
				else:
					new_row.custom_is_fixed = 0
			else:
				new_row.custom_is_fixed = getattr(item, 'custom_is_fixed', 0)
			
			# Will be set after first save
			doc.save()
			
			# Set parent references
			new_row.parent_activity = new_parent_name
			new_row.parent_row_no = new_parent_idx
			
			# Get this item's fixed status and amount for children
			new_item_is_fixed = getattr(new_row, 'custom_is_fixed', False)
			new_item_amount = flt(new_row.amount) or 0
			
			# If including children, duplicate them too
			# Children of this item keep their relative percentages (no additional scaling)
			if include_children and item.is_expandable:
				children = find_items_by_parent(doc.items, item.name)
				for child in children:
					# Children don't need additional scaling - they're relative to their parent
					duplicate_recursive(child, new_row.name, new_row.idx, new_item_is_fixed, new_item_amount, scale_factor=1.0)
		
		# IMPORTANT: If source_item is a group (has children), duplicate ONLY the children, NOT the group itself
		# If source_item is a task/item (no children), duplicate the item itself
		if direct_children:
			# Source is a group - duplicate only its children (not the group itself)
			# Apply scaling factor to top-level children only
			for child in direct_children:
				duplicate_recursive(child, target_parent.name, target_parent.idx, target_parent_is_fixed, target_parent_amount, scale_factor=scaling_factor)
		else:
			# Source is a single item/task - duplicate the item itself
			duplicate_recursive(source_item, target_parent.name, target_parent.idx, target_parent_is_fixed, target_parent_amount, scale_factor=scaling_factor)
		
		# Recalculate hierarchy
		set_reference_ids(doc)
		set_is_expandable(doc)
		calculate_hierarchical_percentages(doc)
		doc.save()
		
		# Invalidate cache after modification
		_invalidate_quotation_cache(doc.name, doc)
		
		# Return success with scaling info
		result = {"success": True}
		if scaling_factor < 1.0:
			result["scaled"] = True
			result["scaling_factor"] = scaling_factor
			result["message"] = _("Items duplicated successfully. Percentages were scaled to {0:.1f}% to fit within available space.").format(scaling_factor * 100)
		
		return result
	except Exception as e:
		# Rollback transaction on error
		frappe.db.rollback()
		frappe.log_error(
			message=f"Error duplicating item: {str(e)}",
			title="Duplicate Item Error"
		)
		raise


@frappe.whitelist()
def move_item(quotation_name, item_name, new_parent_name, new_percentage):
	"""Move an item to a new parent with recalculated values"""
	try:
		doc = frappe.get_doc("Quotation", quotation_name)
	except frappe.DoesNotExistError:
		frappe.throw(_("Quotation '{0}' not found").format(quotation_name))
	except frappe.PermissionError:
		frappe.throw(_("You do not have permission to access Quotation '{0}'").format(quotation_name))
	except Exception as e:
		frappe.log_error(
			message=f"Error retrieving Quotation {quotation_name}: {str(e)}",
			title="Move Item Error"
		)
		frappe.throw(_("Error retrieving quotation. Please try again or contact support."))
	
	# Prevent modifications on submitted/cancelled documents
	if doc.docstatus > 0:
		frappe.throw(
			_("Cannot modify hierarchy structure on a submitted or cancelled quotation. Please cancel the quotation first to make changes.")
		)
	
	# Find the item being moved (using helper functions)
	item_to_move = find_item_by_name(doc.items, item_name)
	new_parent = find_item_by_name(doc.items, new_parent_name)
	
	if not item_to_move:
		frappe.throw(_("Item not found"))
	
	if not new_parent:
		frappe.throw(_("New parent not found"))
	
	# Prevent moving item to itself
	if item_name == new_parent_name:
		frappe.throw(_("Cannot move item to itself"))
	
	# Check for circular reference: new_parent cannot be a descendant of item_to_move
	def is_descendant(parent_name, child_name, items_by_name, visited=None):
		"""Check if child_name is a descendant of parent_name"""
		if visited is None:
			visited = set()
		
		if child_name == parent_name:
			return True
		
		if child_name in visited:
			return False
		
		visited.add(child_name)
		
		# Find all children of child_name
		for item in doc.items:
			if getattr(item, 'parent_activity', None) == child_name:
				if is_descendant(parent_name, item.name, items_by_name, visited):
					return True
		
		return False
	
	items_by_name = build_items_by_name(doc.items)
	
	# Check if new_parent is a descendant of item_to_move (would create circular reference)
	if is_descendant(item_to_move.name, new_parent_name, items_by_name):
		frappe.throw(
			_("Cannot move item '{0}' to '{1}': This would create a circular reference because '{1}' is a descendant of '{0}'").format(
				item_to_move.item_code or item_to_move.item_name or item_name,
				new_parent.item_code or new_parent.item_name or new_parent_name
			)
		)
	
	# Use transaction management to ensure atomicity
	try:
		# Validate and update parent references
		contract_pct = normalize_percentage(new_percentage)
		# Validate percentage range (using helper function)
		validate_percentage(contract_pct, "Contract Percentage")
		
		item_to_move.parent_activity = new_parent.name
		item_to_move.parent_row_no = new_parent.idx
		item_to_move.contract_percentage = contract_pct
		
		# Recalculate the entire hierarchy first to get updated amounts
		set_reference_ids(doc)
		set_is_expandable(doc)
		calculate_hierarchical_percentages(doc)
		
		# Validate fixed amount constraint for new parent
		moved_item_amount = flt(item_to_move.amount) or flt(item_to_move.calculated_amount) or 0
		is_valid, error_msg, current_sum, parent_amount = validate_fixed_amount_constraint(
			doc.items,
			new_parent.name,
			moved_item_amount,
			exclude_item_name=item_to_move.name  # Exclude the item being moved
		)
		if not is_valid:
			frappe.db.rollback()
			frappe.throw(error_msg)
		
		# Save the document
		doc.save()
		
		# Invalidate cache after modification
		_invalidate_quotation_cache(doc.name, doc)
		
		frappe.logger().debug(f"Moved item {item_name} to parent {new_parent_name} with percentage {new_percentage}")
		
		return {
			"success": True,
			"message": "Item moved successfully"
		}
	except Exception as e:
		# Rollback transaction on error
		frappe.db.rollback()
		frappe.log_error(
			message=f"Error moving item: {str(e)}",
			title="Move Item Error"
		)
		raise


def get_parent_row_no(doc, item_name):
	"""Get parent row number (idx) for an item"""
	for row in doc.items:
		if row.name == item_name:
			return str(row.idx)
	return ""


@frappe.whitelist()
def get_quotation_hierarchy_for_export(quotation_name):
	"""Get quotation hierarchy organized for export to Task doctype"""
	try:
		doc = frappe.get_doc("Quotation", quotation_name)
	except frappe.DoesNotExistError:
		frappe.throw(_("Quotation '{0}' not found").format(quotation_name))
	
	if not doc.items:
		return {"hierarchy": [], "total_items": 0}
	
	# Build hierarchy from quotation items
	items_by_name = {item.name: item for item in doc.items}
	
	hierarchy = []
	
	# Find root items (Activities - no parent)
	for item in doc.items:
		if not item.parent_activity:
			activity = {
				"name": item.name,
				"item_code": item.item_code,
				"item_name": item.item_name,
				"description": item.description,
				"level": item.item_level or "Activity",
				"amount": flt(item.amount),
				"contract_percentage": flt(item.contract_percentage),
				"children": []
			}
			
			# Find children (Phases)
			for child in doc.items:
				if child.parent_activity == item.name:
					phase = {
						"name": child.name,
						"item_code": child.item_code,
						"item_name": child.item_name,
						"description": child.description,
						"level": child.item_level or "Phase",
						"amount": flt(child.amount),
						"contract_percentage": flt(child.contract_percentage),
						"children": []
					}
					
					# Find grandchildren (Tasks)
					for grandchild in doc.items:
						if grandchild.parent_activity == child.name:
							phase["children"].append({
								"name": grandchild.name,
								"item_code": grandchild.item_code,
								"item_name": grandchild.item_name,
								"description": grandchild.description,
								"level": grandchild.item_level or "Task",
								"amount": flt(grandchild.amount),
								"contract_percentage": flt(grandchild.contract_percentage)
							})
					
					activity["children"].append(phase)
			
			hierarchy.append(activity)
	
	return {
		"hierarchy": hierarchy,
		"total_items": len(doc.items),
		"quotation_name": doc.name,
		"customer": doc.party_name or doc.customer_name
	}


@frappe.whitelist()
def export_quotation_to_tasks(quotation_name, project_name=None, create_project=False, new_project_name=None):
	"""Export quotation hierarchy to Task doctype"""
	try:
		doc = frappe.get_doc("Quotation", quotation_name)
	except frappe.DoesNotExistError:
		frappe.throw(_("Quotation '{0}' not found").format(quotation_name))
	
	if not doc.items:
		frappe.throw(_("Quotation has no items to export"))
	
	# Create or get project
	project = None
	if create_project and new_project_name:
		# Create new project
		project = frappe.get_doc({
			"doctype": "Project",
			"project_name": new_project_name,
			"status": "Open",
			"company": doc.company,
			"customer": doc.party_name
		})
		project.insert(ignore_permissions=True)
		project_name = project.name
	elif project_name:
		if not frappe.db.exists("Project", project_name):
			frappe.throw(_("Project '{0}' not found").format(project_name))
	
	created_tasks = []
	task_mapping = {}  # Map quotation item name to task name
	
	def create_task(item, parent_task_name=None, is_group=False):
		"""Create a Task from quotation item"""
		# Determine is_group based on item level
		item_level = (item.item_level or "").lower()
		if item_level == "activity" or item_level == "phase":
			is_group = True
		elif item_level == "task":
			is_group = False
		
		task = frappe.get_doc({
			"doctype": "Task",
			"subject": item.item_name or item.item_code,
			"description": item.description or "",
			"project": project_name,
			"parent_task": parent_task_name,
			"is_group": is_group,
			"status": "Open",
			"expected_time": flt(item.amount) / 1000 if flt(item.amount) > 0 else 0,  # Convert amount to hours placeholder
			"task_weight": flt(item.contract_percentage) / 100 if flt(item.contract_percentage) > 0 else 0
		})
		task.insert(ignore_permissions=True)
		
		task_mapping[item.name] = task.name
		created_tasks.append({
			"task_name": task.name,
			"subject": task.subject,
			"level": item.item_level,
			"parent_task": parent_task_name,
			"is_group": is_group
		})
		
		return task
	
	try:
		# Process hierarchy - Activities first (root items with level "Activity")
		for item in doc.items:
			item_level = (item.item_level or "").lower()
			if not item.parent_activity and item_level == "activity":
				# Root item (Activity) - create task with is_group=1, no parent
				activity_task = create_task(item, None, is_group=True)
		
		# Process Phases (items with level "Phase" that have Activity as parent)
		for item in doc.items:
			item_level = (item.item_level or "").lower()
			if item_level == "phase" and item.parent_activity and item.parent_activity in task_mapping:
				parent_item = next((i for i in doc.items if i.name == item.parent_activity), None)
				if parent_item:
					parent_level = (parent_item.item_level or "").lower()
					if parent_level == "activity":
						# This is a Phase (direct child of Activity) - create task with is_group=1
						phase_task = create_task(item, task_mapping[item.parent_activity], is_group=True)
		
		# Process Tasks (items with level "Task" that have Phase as parent)
		for item in doc.items:
			item_level = (item.item_level or "").lower()
			if item_level == "task" and item.parent_activity and item.parent_activity in task_mapping:
				parent_item = next((i for i in doc.items if i.name == item.parent_activity), None)
				if parent_item:
					parent_level = (parent_item.item_level or "").lower()
					if parent_level == "phase":
						# This is a Task (child of Phase) - create task with is_group=0
						create_task(item, task_mapping[item.parent_activity], is_group=False)
		
		return {
			"success": True,
			"created_count": len(created_tasks),
			"tasks": created_tasks,
			"project": project_name
		}
	
	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(
			message=f"Error exporting to tasks: {str(e)}",
			title="Export to Tasks Error"
		)
		raise


@frappe.whitelist()
def get_projects_list():
	"""Get list of projects for selection"""
	projects = frappe.get_all(
		"Project",
		filters={"status": ["not in", ["Cancelled", "Completed"]]},
		fields=["name", "project_name", "status"],
		order_by="modified desc",
		limit=50
	)
	return projects
