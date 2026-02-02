# Copyright (c) 2024, Propasal and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def after_install():
	"""
	Hook that runs after the propasal app is installed
	Creates all required custom fields for Quotation hierarchy
	"""
	create_quotation_hierarchy_fields()
	frappe.db.commit()
	print("✓ Propasal app installed successfully with all custom fields")


def create_quotation_hierarchy_fields():
	"""
	Create all custom fields required for Quotation hierarchy
	This is the complete field definition ensuring all fields are created
	"""
	
	# ========================================================================
	# QUOTATION ITEM FIELDS
	# ========================================================================
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
	
	# ========================================================================
	# QUOTATION FIELDS (Tree View Tab)
	# ========================================================================
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
	
	# Create all custom fields
	try:
		print("Creating Quotation Item custom fields...")
		create_custom_fields(quotation_item_fields, ignore_validate=True, update=True)
		print("✓ Quotation Item fields created")
		
		print("Creating Quotation custom fields...")
		create_custom_fields(quotation_fields, ignore_validate=True, update=True)
		print("✓ Quotation fields created")
		
		# Clear cache to ensure fields are available
		frappe.clear_cache(doctype="Quotation")
		frappe.clear_cache(doctype="Quotation Item")
		print("✓ Cache cleared")
		
	except Exception as e:
		frappe.log_error(
			message=f"Error creating custom fields: {str(e)}",
			title="Propasal Installation Error"
		)
		raise
