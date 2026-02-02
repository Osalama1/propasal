# Copyright (c) 2024, Propasal and contributors
# License: MIT

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


def execute():
	"""Update to use parent_activity (Link) and parent_row_no (Data) - following BOM Creator pattern"""
	
	# Check if parent_item exists (old field)
	parent_item_field = frappe.db.get_value(
		"Custom Field",
		{"dt": "Quotation Item", "fieldname": "parent_item"},
		["name"],
		as_dict=1
	)
	
	# Check if parent_idx exists (intermediate field)
	parent_idx_field = frappe.db.get_value(
		"Custom Field",
		{"dt": "Quotation Item", "fieldname": "parent_idx"},
		["name"],
		as_dict=1
	)
	
	# Check if parent_activity already exists
	parent_activity_exists = frappe.db.exists(
		"Custom Field",
		{"dt": "Quotation Item", "fieldname": "parent_activity"}
	)
	
	# Check if parent_row_no already exists
	parent_row_no_exists = frappe.db.exists(
		"Custom Field",
		{"dt": "Quotation Item", "fieldname": "parent_row_no"}
	)
	
	# Delete old fields if they exist
	if parent_item_field:
		frappe.delete_doc("Custom Field", parent_item_field.name, force=1)
		frappe.db.commit()
	
	if parent_idx_field:
		frappe.delete_doc("Custom Field", parent_idx_field.name, force=1)
		frappe.db.commit()
	
	# Create parent_activity (Link field) - similar to fg_item in BOM Creator
	if not parent_activity_exists:
		create_custom_field(
			"Quotation Item",
			{
				"fieldname": "parent_activity",
				"fieldtype": "Link",
				"label": "Parent Activity",
				"description": "The Activity/Phase this item belongs to (similar to fg_item in BOM Creator)",
				"options": "Quotation Item",
				"insert_after": "item_level",
			},
			ignore_validate=True,
			is_system_generated=True
		)
	
	# Create parent_row_no (Data field) - similar to parent_row_no in BOM Creator
	if not parent_row_no_exists:
		create_custom_field(
			"Quotation Item",
			{
				"fieldname": "parent_row_no",
				"fieldtype": "Data",
				"label": "Parent Row No",
				"description": "Row number (idx) of parent item",
				"print_hide": 1,
				"insert_after": "parent_activity",
			},
			ignore_validate=True,
			is_system_generated=True
		)
	
	frappe.clear_cache(doctype="Quotation Item")
	frappe.msgprint("Updated to use parent_activity (Link) and parent_row_no (Data) fields - following BOM Creator pattern")
