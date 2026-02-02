# Copyright (c) 2024, Propasal and contributors
# License: MIT

import frappe
from propasal.propasal.quotation_hierarchy import add_quotation_hierarchy_fields


def execute():
	"""Ensure hierarchy fields exist - run this if fields are missing"""
	try:
		add_quotation_hierarchy_fields()
		frappe.msgprint("Hierarchy fields added successfully")
	except Exception as e:
		frappe.log_error(f"Error adding hierarchy fields: {str(e)}")
		frappe.msgprint(f"Error: {str(e)}", indicator="red")



