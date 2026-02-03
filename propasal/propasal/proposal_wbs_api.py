# Copyright (c) 2026, PCO and contributors
# For license information, please see license.txt

"""
Proposal WBS Item API

This module provides whitelisted API endpoints for managing the Proposal WBS Item tree.
These endpoints are called from the frontend (ModernTree UI) to perform CRUD operations
on the hierarchical WBS structure.
"""

import frappe
from frappe import _
from frappe.utils import flt, cint


def get_root_wbs_item(quotation_name):
	"""Get the root WBS item for a quotation"""
	if not quotation_name:
		return None
	root = frappe.db.get_value(
		"Proposal WBS Item",
		{"quotation": quotation_name, "is_root": 1},
		["name", "item_name", "amount", "currency"],
		as_dict=True
	)
	if root:
		return frappe.get_doc("Proposal WBS Item", root.name)
	return None


def get_children_sum(parent_name):
	"""Get sum of children amounts for a parent WBS item"""
	if not parent_name:
		return 0
	result = frappe.db.sql("""
		SELECT COALESCE(SUM(amount), 0) as total
		FROM `tabProposal WBS Item`
		WHERE parent_proposal_wbs_item = %s
	""", parent_name)
	return flt(result[0][0]) if result else 0


def recalculate_wbs_tree(quotation_name):
	"""Recalculate the entire WBS tree for a quotation"""
	if not quotation_name:
		return
	
	root = get_root_wbs_item(quotation_name)
	if root:
		root.calculate_parent_amounts()
		root.recalculate_tree_percentages()


@frappe.whitelist()
def get_wbs_tree(quotation_name, parent=None):
	"""
	Get the WBS tree for a quotation.
	
	Args:
		quotation_name: Name of the Quotation document
		parent: Parent WBS item name (optional, for lazy loading)
	
	Returns:
		List of WBS items with hierarchy information
	"""
	if not quotation_name:
		return []
	
	# Check permission
	if not frappe.has_permission("Quotation", "read", quotation_name):
		frappe.throw(_("Not permitted to read this quotation"), frappe.PermissionError)
	
	filters = {"quotation": quotation_name}
	
	if parent:
		filters["parent_proposal_wbs_item"] = parent
	else:
		# Get root items (no parent)
		filters["parent_proposal_wbs_item"] = ["is", "not set"]
	
	items = frappe.get_all(
		"Proposal WBS Item",
		filters=filters,
		fields=[
			"name",
			"item_name",
			"item_code",
			"item_level",
			"description",
			"amount",
			"rate",
			"qty",
			"currency",
			"is_group",
			"is_root",
			"custom_is_fixed",
			"calculated_amount",
			"weight_in_parent_percent",
			"total_project_percent",
			"parent_proposal_wbs_item",
			"lft",
			"rgt"
		],
		order_by="lft asc"
	)
	
	# Add expandable flag and children count
	for item in items:
		children_count = frappe.db.count(
			"Proposal WBS Item",
			{"parent_proposal_wbs_item": item.name}
		)
		item["expandable"] = children_count > 0
		item["children_count"] = children_count
	
	return items


@frappe.whitelist()
def get_full_wbs_tree(quotation_name):
	"""
	Get the complete WBS tree for a quotation (all levels).
	
	Args:
		quotation_name: Name of the Quotation document
	
	Returns:
		List of all WBS items ordered by lft (tree order)
	"""
	if not quotation_name:
		return []
	
	# Check permission
	if not frappe.has_permission("Quotation", "read", quotation_name):
		frappe.throw(_("Not permitted to read this quotation"), frappe.PermissionError)
	
	items = frappe.get_all(
		"Proposal WBS Item",
		filters={"quotation": quotation_name},
		fields=[
			"name",
			"item_name",
			"item_code",
			"item_level",
			"description",
			"amount",
			"rate",
			"qty",
			"currency",
			"is_group",
			"is_root",
			"custom_is_fixed",
			"calculated_amount",
			"weight_in_parent_percent",
			"total_project_percent",
			"parent_proposal_wbs_item",
			"lft",
			"rgt"
		],
		order_by="lft asc"
	)
	
	# Build tree structure
	items_by_name = {item.name: item for item in items}
	
	for item in items:
		item["expandable"] = item.is_group
		item["children"] = []
	
	# Build parent-child relationships
	roots = []
	for item in items:
		if item.parent_proposal_wbs_item:
			parent = items_by_name.get(item.parent_proposal_wbs_item)
			if parent:
				parent["children"].append(item)
		else:
			roots.append(item)
	
	return roots


@frappe.whitelist()
def add_wbs_item(quotation, item_name, item_level, parent_item=None, amount=0, 
				 rate=0, qty=1, description=None, item_code=None, custom_is_fixed=0,
				 weight_in_parent_percent=0):
	"""
	Add a new WBS item to the tree.
	
	Supports adding by amount OR percentage:
	- If amount is provided, percentage is calculated from parent
	- If percentage is provided (and amount=0), amount is calculated from parent
	
	Args:
		quotation: Quotation document name
		item_name: Name/title of the WBS item
		item_level: Level type (Activity, Phase, Task)
		parent_item: Parent WBS item name (optional, for root items)
		amount: Amount for this item
		rate: Rate per unit
		qty: Quantity
		description: Item description
		item_code: Link to Item master (optional)
		custom_is_fixed: Whether amount is fixed
		weight_in_parent_percent: Percentage of parent's amount (optional)
	
	Returns:
		Created WBS item document
	"""
	# Check for unsaved quotation
	if not quotation or str(quotation).startswith("new-"):
		frappe.throw(_("Please save the Quotation first before adding WBS items"))
	
	# Check permission
	if not frappe.has_permission("Quotation", "write", quotation):
		frappe.throw(_("Not permitted to modify this quotation"), frappe.PermissionError)
	
	# Check quotation status
	quotation_doc = frappe.get_doc("Quotation", quotation)
	if quotation_doc.docstatus != 0:
		frappe.throw(_("Cannot modify WBS for submitted/cancelled quotation"))
	
	# If percentage is provided but amount is not, pre-calculate amount
	amount = flt(amount)
	weight_in_parent_percent = flt(weight_in_parent_percent)
	
	if weight_in_parent_percent > 0 and amount == 0 and parent_item:
		parent_amount = frappe.db.get_value("Proposal WBS Item", parent_item, "amount")
		if parent_amount and flt(parent_amount) > 0:
			amount = (weight_in_parent_percent / 100) * flt(parent_amount)
	
	# Create WBS item
	wbs_item = frappe.new_doc("Proposal WBS Item")
	wbs_item.quotation = quotation
	wbs_item.item_name = item_name
	wbs_item.item_level = item_level
	wbs_item.parent_proposal_wbs_item = parent_item if parent_item else None
	wbs_item.amount = flt(amount, 2)
	wbs_item.rate = flt(rate)
	wbs_item.qty = flt(qty) or 1
	wbs_item.description = description
	wbs_item.item_code = item_code
	wbs_item.custom_is_fixed = cint(custom_is_fixed)
	wbs_item.weight_in_parent_percent = flt(weight_in_parent_percent, 2)
	wbs_item.currency = quotation_doc.currency
	
	# Set is_group based on level
	if item_level in ["Activity", "Phase"]:
		wbs_item.is_group = 1
	
	# Set is_root if no parent
	if not parent_item:
		wbs_item.is_root = 1
	
	wbs_item.insert()
	
	return {
		"success": True,
		"name": wbs_item.name,
		"message": _("WBS item created successfully"),
		"item": wbs_item.as_dict()
	}


@frappe.whitelist()
def update_wbs_item(name, **kwargs):
	"""
	Update a WBS item.
	
	Supports bi-directional financial sync:
	- If only percentage is provided, amount is calculated from parent
	- If only amount is provided, percentage is calculated from parent
	- If both are provided, amount takes precedence
	
	Args:
		name: WBS item name
		**kwargs: Fields to update (item_name, amount, rate, qty, etc.)
	
	Returns:
		Updated WBS item
	"""
	if not name:
		frappe.throw(_("WBS item name is required"))
	
	wbs_item = frappe.get_doc("Proposal WBS Item", name)
	
	# Check permission via quotation
	if wbs_item.quotation:
		if not frappe.has_permission("Quotation", "write", wbs_item.quotation):
			frappe.throw(_("Not permitted to modify this quotation"), frappe.PermissionError)
		
		# Check quotation status
		quotation_doc = frappe.get_doc("Quotation", wbs_item.quotation)
		if quotation_doc.docstatus != 0:
			frappe.throw(_("Cannot modify WBS for submitted/cancelled quotation"))
	
	# Parse kwargs if string
	if isinstance(kwargs, str):
		kwargs = frappe.parse_json(kwargs)
	
	# Fields that can be updated
	allowed_fields = [
		"item_name", "item_code", "item_level", "description",
		"amount", "rate", "qty", "custom_is_fixed", "weight_in_parent_percent"
	]
	
	# Track which financial field was explicitly provided
	percent_explicitly_set = "weight_in_parent_percent" in kwargs and kwargs["weight_in_parent_percent"] is not None
	amount_explicitly_set = "amount" in kwargs and kwargs["amount"] is not None
	
	# Pre-calculate amount from percentage if ONLY percentage was provided
	if percent_explicitly_set and not amount_explicitly_set and wbs_item.parent_proposal_wbs_item:
		parent_amount = frappe.db.get_value("Proposal WBS Item", wbs_item.parent_proposal_wbs_item, "amount")
		if parent_amount and flt(parent_amount) > 0:
			calculated_amount = (flt(kwargs["weight_in_parent_percent"]) / 100) * flt(parent_amount)
			kwargs["amount"] = flt(calculated_amount, 2)
	
	# Track if amount changed for distribution
	old_amount = wbs_item.amount
	amount_changed = False
	
	for field in allowed_fields:
		if field in kwargs and kwargs[field] is not None:
			if field == "amount":
				new_amount = flt(kwargs[field])
				if flt(old_amount) != new_amount:
					amount_changed = True
				wbs_item.set(field, new_amount)
			else:
				wbs_item.set(field, kwargs[field])
	
	wbs_item.save()
	
	# If amount changed on a group item with fixed amount, distribute to children
	if amount_changed and wbs_item.is_group and wbs_item.custom_is_fixed:
		wbs_item.distribute_amount_to_children(wbs_item.amount)
	
	return {
		"success": True,
		"name": wbs_item.name,
		"message": _("WBS item updated successfully"),
		"item": wbs_item.as_dict()
	}


@frappe.whitelist()
def delete_wbs_item(name, delete_children=True):
	"""
	Delete a WBS item and optionally its children.
	
	Args:
		name: WBS item name to delete
		delete_children: If True, delete all children recursively
	
	Returns:
		Success message
	"""
	if not name:
		frappe.throw(_("WBS item name is required"))
	
	wbs_item = frappe.get_doc("Proposal WBS Item", name)
	quotation = wbs_item.quotation
	parent = wbs_item.parent_proposal_wbs_item
	
	# Check permission via quotation
	if quotation:
		if not frappe.has_permission("Quotation", "write", quotation):
			frappe.throw(_("Not permitted to modify this quotation"), frappe.PermissionError)
		
		# Check quotation status
		quotation_doc = frappe.get_doc("Quotation", quotation)
		if quotation_doc.docstatus != 0:
			frappe.throw(_("Cannot modify WBS for submitted/cancelled quotation"))
	
	if delete_children:
		# Delete all descendants first (children, grandchildren, etc.)
		descendants = frappe.get_all(
			"Proposal WBS Item",
			filters={
				"lft": [">", wbs_item.lft],
				"rgt": ["<", wbs_item.rgt]
			},
			fields=["name"],
			order_by="rgt desc"  # Delete from deepest first
		)
		
		for desc in descendants:
			frappe.delete_doc("Proposal WBS Item", desc.name, force=True)
	
	# Delete the item itself
	frappe.delete_doc("Proposal WBS Item", name, force=True)
	
	# Recalculate tree after deletion
	if quotation:
		try:
			recalculate_wbs_tree(quotation)
		except Exception:
			pass  # Tree might be empty now
	
	return {
		"success": True,
		"message": _("WBS item deleted successfully")
	}


@frappe.whitelist()
def move_wbs_item(name, new_parent):
	"""
	Move a WBS item to a new parent.
	
	Args:
		name: WBS item name to move
		new_parent: New parent WBS item name (or None for root)
	
	Returns:
		Updated WBS item
	"""
	if not name:
		frappe.throw(_("WBS item name is required"))
	
	wbs_item = frappe.get_doc("Proposal WBS Item", name)
	
	# Check permission via quotation
	if wbs_item.quotation:
		if not frappe.has_permission("Quotation", "write", wbs_item.quotation):
			frappe.throw(_("Not permitted to modify this quotation"), frappe.PermissionError)
	
	# Validate new parent is in same quotation
	if new_parent:
		new_parent_doc = frappe.get_doc("Proposal WBS Item", new_parent)
		if new_parent_doc.quotation != wbs_item.quotation:
			frappe.throw(_("Cannot move item to a different quotation's tree"))
		
		# Cannot move item under itself or its descendants
		if new_parent_doc.lft >= wbs_item.lft and new_parent_doc.rgt <= wbs_item.rgt:
			frappe.throw(_("Cannot move item under itself or its descendants"))
	
	# Store old parent for recalculation
	old_parent = wbs_item.parent_proposal_wbs_item
	
	# Update parent
	wbs_item.parent_proposal_wbs_item = new_parent if new_parent else None
	wbs_item.is_root = 0 if new_parent else 1
	wbs_item.save()
	
	# Update old parent's is_group if needed
	if old_parent:
		children_count = frappe.db.count(
			"Proposal WBS Item",
			{"parent_proposal_wbs_item": old_parent}
		)
		if children_count == 0:
			frappe.db.set_value(
				"Proposal WBS Item",
				old_parent,
				"is_group",
				0,
				update_modified=False
			)
	
	# Update new parent's is_group
	if new_parent:
		frappe.db.set_value(
			"Proposal WBS Item",
			new_parent,
			"is_group",
			1,
			update_modified=False
		)
	
	# Recalculate tree
	if wbs_item.quotation:
		recalculate_wbs_tree(wbs_item.quotation)
	
	return {
		"success": True,
		"name": wbs_item.name,
		"message": _("WBS item moved successfully"),
		"item": wbs_item.as_dict()
	}


@frappe.whitelist()
def duplicate_wbs_item(name, new_name=None, include_children=True, target_parent=None):
	"""
	Duplicate a WBS item and optionally its children.
	
	Args:
		name: WBS item name to duplicate
		new_name: Optional new name for the duplicate
		include_children: If True, duplicate all children recursively
		target_parent: Optional target parent (for "copy to different parent" feature)
	
	Returns:
		New WBS item
	"""
	if not name:
		frappe.throw(_("WBS item name is required"))
	
	source = frappe.get_doc("Proposal WBS Item", name)
	
	# Check permission via quotation
	if source.quotation:
		if not frappe.has_permission("Quotation", "write", source.quotation):
			frappe.throw(_("Not permitted to modify this quotation"), frappe.PermissionError)
	
	# Create duplicate
	new_item = frappe.copy_doc(source)
	new_item.item_name = new_name or f"{source.item_name} (Copy)"
	
	# If target_parent specified, set it
	if target_parent:
		new_item.parent_proposal_wbs_item = target_parent
		new_item.is_root = 0
	
	new_item.insert()
	
	if include_children:
		# Duplicate children recursively
		_duplicate_children(source.name, new_item.name, source.quotation)
	
	# Recalculate tree
	if source.quotation:
		recalculate_wbs_tree(source.quotation)
	
	return {
		"success": True,
		"name": new_item.name,
		"message": _("WBS item duplicated successfully"),
		"item": new_item.as_dict()
	}


def _duplicate_children(source_parent, new_parent, quotation):
	"""Recursively duplicate children of a WBS item"""
	children = frappe.get_all(
		"Proposal WBS Item",
		filters={"parent_proposal_wbs_item": source_parent},
		fields=["name"],
		order_by="lft asc"
	)
	
	for child in children:
		source_child = frappe.get_doc("Proposal WBS Item", child.name)
		new_child = frappe.copy_doc(source_child)
		new_child.parent_proposal_wbs_item = new_parent
		new_child.insert()
		
		# Recursively duplicate grandchildren
		_duplicate_children(child.name, new_child.name, quotation)


@frappe.whitelist()
def distribute_amount(name, new_amount):
	"""
	Distribute amount to children (Up-Down calculation).
	
	Args:
		name: WBS item name
		new_amount: New amount to distribute
	
	Returns:
		Success message with updated children
	"""
	if not name:
		frappe.throw(_("WBS item name is required"))
	
	wbs_item = frappe.get_doc("Proposal WBS Item", name)
	
	# Check permission via quotation
	if wbs_item.quotation:
		if not frappe.has_permission("Quotation", "write", wbs_item.quotation):
			frappe.throw(_("Not permitted to modify this quotation"), frappe.PermissionError)
	
	# Update amount and distribute
	wbs_item.amount = flt(new_amount)
	wbs_item.custom_is_fixed = 1  # Set as fixed when distributing
	wbs_item.save()
	wbs_item.distribute_amount_to_children(flt(new_amount))
	
	# Recalculate percentages
	wbs_item.recalculate_tree_percentages()
	
	return {
		"success": True,
		"message": _("Amount distributed successfully"),
		"grand_total": get_root_wbs_item(wbs_item.quotation).amount if wbs_item.quotation else 0
	}


@frappe.whitelist()
def get_wbs_summary(quotation_name):
	"""
	Get summary statistics for a quotation's WBS tree.
	
	Args:
		quotation_name: Quotation document name
	
	Returns:
		Summary statistics
	"""
	if not quotation_name:
		return {}
	
	# Check permission
	if not frappe.has_permission("Quotation", "read", quotation_name):
		frappe.throw(_("Not permitted to read this quotation"), frappe.PermissionError)
	
	# Count items by level
	level_counts = frappe.db.sql("""
		SELECT item_level, COUNT(*) as count
		FROM `tabProposal WBS Item`
		WHERE quotation = %s
		GROUP BY item_level
	""", quotation_name, as_dict=True)
	
	counts = {lc.item_level: lc.count for lc in level_counts}
	
	# Get totals
	root = get_root_wbs_item(quotation_name)
	
	return {
		"activities": counts.get("Activity", 0),
		"phases": counts.get("Phase", 0),
		"tasks": counts.get("Task", 0),
		"total_items": sum(counts.values()),
		"grand_total": root.amount if root else 0,
		"currency": root.currency if root else None
	}


@frappe.whitelist()
def create_root_wbs_item(quotation_name, item_name=None):
	"""
	Create a root WBS item for a quotation if one doesn't exist.
	
	Args:
		quotation_name: Quotation document name
		item_name: Optional name for root item
	
	Returns:
		Root WBS item
	"""
	if not quotation_name:
		frappe.throw(_("Quotation name is required"))
	
	# Check for unsaved quotation
	if str(quotation_name).startswith("new-"):
		frappe.throw(_("Please save the Quotation first"))
	
	# Check if root already exists
	existing_root = get_root_wbs_item(quotation_name)
	if existing_root:
		return {
			"success": True,
			"name": existing_root.name,
			"message": _("Root WBS item already exists"),
			"item": existing_root.as_dict()
		}
	
	# Check permission
	if not frappe.has_permission("Quotation", "write", quotation_name):
		frappe.throw(_("Not permitted to modify this quotation"), frappe.PermissionError)
	
	quotation = frappe.get_doc("Quotation", quotation_name)
	
	if quotation.docstatus != 0:
		frappe.throw(_("Cannot create WBS for submitted/cancelled quotation"))
	
	# Create root item
	root_name = item_name or quotation.title or f"Project - {quotation_name}"
	
	root = frappe.new_doc("Proposal WBS Item")
	root.quotation = quotation_name
	root.item_name = root_name
	root.item_level = "Activity"
	root.is_group = 1
	root.is_root = 1
	root.currency = quotation.currency
	root.amount = quotation.grand_total or 0
	root.insert()
	
	# Update quotation with root_wbs_item link
	frappe.db.set_value(
		"Quotation",
		quotation_name,
		"root_wbs_item",
		root.name,
		update_modified=False
	)
	
	return {
		"success": True,
		"name": root.name,
		"message": _("Root WBS item created successfully"),
		"item": root.as_dict()
	}


@frappe.whitelist()
def sync_quotation_total(quotation_name):
	"""
	Sync the WBS grand total to the Quotation.
	
	Args:
		quotation_name: Quotation document name
	
	Returns:
		Success message with totals
	"""
	if not quotation_name:
		frappe.throw(_("Quotation name is required"))
	
	root = get_root_wbs_item(quotation_name)
	if not root:
		frappe.throw(_("No WBS tree found for quotation"))
	
	root.sync_quotation_grand_total()
	
	return {
		"success": True,
		"message": _("Quotation total synced successfully"),
		"wbs_total": root.amount,
		"quotation_total": frappe.db.get_value("Quotation", quotation_name, "grand_total")
	}


@frappe.whitelist()
def auto_initialize_wbs(doc, method=None):
	"""
	Auto-initialize WBS root item on Quotation save (called from hooks).
	Only creates if use_wbs_tree is enabled and no root exists.
	"""
	quotation_name = doc.name if hasattr(doc, 'name') else doc
	
	# Skip for unsaved quotations
	if str(quotation_name).startswith("new-"):
		return None
	
	# Check if WBS should be auto-created
	quotation = frappe.get_doc("Quotation", quotation_name)
	
	# Only auto-create if use_wbs_tree is enabled
	if not quotation.get("use_wbs_tree"):
		return None
	
	# Check if root already exists
	existing = get_root_wbs_item(quotation_name)
	if existing:
		return existing
	
	# Create root
	result = create_root_wbs_item(quotation_name)
	return result.get("item") if result else None


@frappe.whitelist()
def bulk_add_wbs_items(quotation, parent_item, items):
	"""
	Bulk add multiple WBS items under a parent.
	
	Args:
		quotation: Quotation document name
		parent_item: Parent WBS item name
		items: List of items to add (each with item_name, item_code, amount, etc.)
	
	Returns:
		List of created items
	"""
	# Check for unsaved quotation
	if not quotation or str(quotation).startswith("new-"):
		frappe.throw(_("Please save the Quotation first before adding WBS items"))
	
	# Check permission
	if not frappe.has_permission("Quotation", "write", quotation):
		frappe.throw(_("Not permitted to modify this quotation"), frappe.PermissionError)
	
	# Parse items if string
	if isinstance(items, str):
		items = frappe.parse_json(items)
	
	quotation_doc = frappe.get_doc("Quotation", quotation)
	if quotation_doc.docstatus != 0:
		frappe.throw(_("Cannot modify WBS for submitted/cancelled quotation"))
	
	# Check parent and prepare for validation
	parent = None
	parent_amount = 0
	parent_is_fixed = False
	if parent_item:
		parent = frappe.get_doc("Proposal WBS Item", parent_item)
		parent_amount = flt(parent.amount)
		parent_is_fixed = cint(parent.custom_is_fixed)
	
	# Get existing children sum for fixed parent validation
	existing_children_sum = 0
	if parent_is_fixed and parent_amount > 0:
		existing_children_sum = get_children_sum(parent_item)
	
	# Process and create items
	created = []
	batch_amount_so_far = 0
	
	for idx, item_data in enumerate(items):
		item_name = (item_data.get("item_name") or "").strip()
		if not item_name:
			continue  # Skip empty rows
		
		amount = flt(item_data.get("amount", 0), 2)
		weight_in_parent_percent = flt(item_data.get("weight_in_parent_percent", 0), 2)
		
		# Pre-calculate amount from percentage if needed
		if weight_in_parent_percent > 0 and amount == 0 and parent_amount > 0:
			amount = (weight_in_parent_percent / 100) * parent_amount
		elif amount > 0 and weight_in_parent_percent == 0 and parent_amount > 0:
			weight_in_parent_percent = (amount / parent_amount) * 100
		
		# Fixed parent validation: check before each insert
		if parent_is_fixed and parent_amount > 0:
			total_with_this = existing_children_sum + batch_amount_so_far + amount
			if total_with_this > parent_amount + 0.01:
				frappe.throw(
					_("Total of children would exceed fixed parent amount ({0}). "
					  "Row {1}: reduce amount or percentage.").format(
						frappe.format_value(parent_amount, {"fieldtype": "Currency"}),
						idx + 1
					)
				)
		
		wbs_item = frappe.new_doc("Proposal WBS Item")
		wbs_item.quotation = quotation
		wbs_item.parent_proposal_wbs_item = parent_item
		wbs_item.item_name = item_name
		wbs_item.item_code = item_data.get("item_code") or None
		wbs_item.item_level = item_data.get("item_level", "Task")
		wbs_item.amount = flt(amount, 2)
		wbs_item.weight_in_parent_percent = flt(weight_in_parent_percent, 2)
		wbs_item.description = item_data.get("description") or ""
		wbs_item.currency = quotation_doc.currency
		wbs_item.is_group = 0  # Tasks are not groups
		wbs_item.is_root = 0
		wbs_item.custom_is_fixed = 0
		wbs_item.insert()
		
		created.append({
			"name": wbs_item.name,
			"item_name": wbs_item.item_name
		})
		batch_amount_so_far += flt(wbs_item.amount, 2)
	
	# Recalculate tree
	recalculate_wbs_tree(quotation)
	
	return {
		"success": True,
		"message": _("{0} items added successfully").format(len(created)),
		"items": created
	}
