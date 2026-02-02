# Copyright (c) 2024, Propasal and contributors
# License: MIT

import frappe
from propasal.propasal.quotation_hierarchy import add_quotation_hierarchy_fields


def execute():
	"""Add custom fields to Quotation Item for hierarchical structure"""
	add_quotation_hierarchy_fields()



