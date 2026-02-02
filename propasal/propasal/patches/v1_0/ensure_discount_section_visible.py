# Copyright (c) 2024, Propasal and contributors
# License: MIT

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
	"""Ensure discount section is always visible in Quotation Item"""
	
	# Check if custom field already exists
	discount_section_field = frappe.db.get_value(
		"Custom Field",
		{"dt": "Quotation Item", "fieldname": "discount_and_margin"},
		"name"
	)
	
	if not discount_section_field:
		# Create custom field to override discount_and_margin section visibility
		quotation_item_fields = {
			"Quotation Item": [
				{
					"fieldname": "discount_and_margin",
					"fieldtype": "Section Break",
					"label": "Discount and Margin",
					"collapsible": 1,
					# Change collapsible_depends_on to check net_amount or amount instead of margin_type || discount_amount
					"collapsible_depends_on": "eval:doc.net_amount || doc.amount",
					"insert_after": "base_price_list_rate",
				},
			]
		}
		create_custom_fields(quotation_item_fields, ignore_validate=True, update=True)
		frappe.db.commit()
	else:
		# Update existing custom field to ensure it's visible
		field_doc = frappe.get_doc("Custom Field", discount_section_field)
		field_doc.hidden = 0
		# Update collapsible_depends_on to check net_amount or amount
		field_doc.collapsible_depends_on = "eval:doc.net_amount || doc.amount"
		field_doc.save(ignore_permissions=True)
		frappe.db.commit()
	
	# Also ensure discount fields are visible when net_amount or amount is set (not just rate/price_list_rate)
	# Check if discount_percentage custom field exists
	discount_percentage_field = frappe.db.get_value(
		"Custom Field",
		{"dt": "Quotation Item", "fieldname": "discount_percentage"},
		"name"
	)
	
	if not discount_percentage_field:
		# Create custom field to make discount_percentage visible when net_amount or amount is set
		quotation_item_fields = {
			"Quotation Item": [
				{
					"fieldname": "discount_percentage",
					"fieldtype": "Percent",
					"label": "Discount (%) on Price List Rate with Margin",
					"depends_on": "eval:doc.net_amount || doc.amount",
					"print_hide": 1,
					"insert_after": "column_break_18",
				},
				{
					"fieldname": "discount_amount",
					"fieldtype": "Currency",
					"label": "Discount Amount",
					"depends_on": "eval:doc.net_amount || doc.amount",
					"options": "currency",
					"insert_after": "discount_percentage",
				},
			]
		}
		create_custom_fields(quotation_item_fields, ignore_validate=True, update=True)
		frappe.db.commit()
	else:
		# Update existing discount_percentage field
		field_doc = frappe.get_doc("Custom Field", discount_percentage_field)
		field_doc.hidden = 0
		# Change depends_on to check net_amount or amount (not just price_list_rate or rate)
		if field_doc.depends_on in ["price_list_rate", "eval:doc.rate || doc.price_list_rate"]:
			field_doc.depends_on = "eval:doc.net_amount || doc.amount"
		field_doc.save(ignore_permissions=True)
		frappe.db.commit()
	
	# Update discount_amount field if it exists as custom field
	discount_amount_field = frappe.db.get_value(
		"Custom Field",
		{"dt": "Quotation Item", "fieldname": "discount_amount"},
		"name"
	)
	
	if discount_amount_field:
		field_doc = frappe.get_doc("Custom Field", discount_amount_field)
		field_doc.hidden = 0
		# Change depends_on to check net_amount or amount (not just price_list_rate or rate)
		if field_doc.depends_on in ["price_list_rate", "eval:doc.rate || doc.price_list_rate"]:
			field_doc.depends_on = "eval:doc.net_amount || doc.amount"
		field_doc.save(ignore_permissions=True)
		frappe.db.commit()
	
	frappe.clear_cache(doctype="Quotation Item")
	frappe.msgprint("Ensured discount section visibility depends on net_amount/amount in Quotation Item")
