# Copyright (c) 2024, Propasal and contributors
# License: MIT

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""Ensure hierarchy fields are visible and properly configured"""
	
	# Create hierarchy_tree_tab if it doesn't exist
	hierarchy_tab_field = frappe.db.get_value(
		"Custom Field",
		{"dt": "Quotation", "fieldname": "hierarchy_tree_tab"},
		"name"
	)
	
	if not hierarchy_tab_field:
		# Create the tab break field
		quotation_fields = {
			"Quotation": [
				{
					"fieldname": "hierarchy_tree_tab",
					"fieldtype": "Tab Break",
					"label": "Hierarchy Tree",
					"insert_after": "items",
				},
			]
		}
		create_custom_fields(quotation_fields, ignore_validate=True, update=True)
		frappe.db.commit()
	else:
		# Update existing field to ensure it's visible
		field_doc = frappe.get_doc("Custom Field", hierarchy_tab_field)
		field_doc.hidden = 0
		field_doc.save(ignore_permissions=True)
		frappe.db.commit()
	
	# Create quotation_tree HTML field if it doesn't exist
	quotation_tree_field = frappe.db.get_value(
		"Custom Field",
		{"dt": "Quotation", "fieldname": "quotation_tree"},
		"name"
	)
	
	if not quotation_tree_field:
		# Create the HTML field
		quotation_fields = {
			"Quotation": [
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
		create_custom_fields(quotation_fields, ignore_validate=True, update=True)
		frappe.db.commit()
	else:
		# Update existing field to ensure it's visible
		field_doc = frappe.get_doc("Custom Field", quotation_tree_field)
		field_doc.hidden = 0
		field_doc.read_only = 1
		field_doc.save(ignore_permissions=True)
		frappe.db.commit()
	
	# Ensure Quotation Item fields are visible
	item_fields = [
		"item_level",
		"parent_activity",
		"parent_row_no",
		"contract_percentage",
		"total_percentage",
		"calculated_amount",
		"is_expandable",
	]
	
	for fieldname in item_fields:
		field = frappe.db.get_value(
			"Custom Field",
			{"dt": "Quotation Item", "fieldname": fieldname},
			"name"
		)
		
		if field:
			field_doc = frappe.get_doc("Custom Field", field)
			# Don't hide these fields (except hidden ones like activity_reference_id)
			if fieldname not in ["activity_reference_id", "parent_reference_id"]:
				field_doc.hidden = 0
			field_doc.save(ignore_permissions=True)
			frappe.db.commit()
	
	frappe.clear_cache(doctype="Quotation")
	frappe.clear_cache(doctype="Quotation Item")
	frappe.msgprint("Ensured hierarchy fields are visible")
