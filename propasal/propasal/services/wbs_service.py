# Copyright (c) 2026, PCO and contributors
# For license information, please see license.txt

"""
WBS Service - Document event handlers for Proposal WBS Item integration
"""

import frappe
from frappe import _


def on_quotation_trash(doc, method):
	"""
	Clean up WBS items when a Quotation is deleted.
	
	Args:
		doc: Quotation document
		method: Event method name
	"""
	try:
		# Delete all WBS items linked to this quotation
		wbs_items = frappe.get_all(
			"Proposal WBS Item",
			filters={"quotation": doc.name},
			fields=["name"],
			order_by="rgt desc"  # Delete from leaves first to maintain tree integrity
		)
		
		for item in wbs_items:
			try:
				frappe.delete_doc("Proposal WBS Item", item.name, force=True, ignore_permissions=True)
			except Exception as e:
				frappe.log_error(
					f"Error deleting WBS item {item.name}: {str(e)}",
					"WBS Cleanup Error"
				)
		
		if wbs_items:
			frappe.logger().info(
				f"Deleted {len(wbs_items)} WBS items for quotation {doc.name}"
			)
	
	except Exception as e:
		# Don't block quotation deletion if WBS cleanup fails
		frappe.log_error(
			f"Error cleaning up WBS items for quotation {doc.name}: {str(e)}",
			"WBS Cleanup Error"
		)


def on_quotation_cancel(doc, method):
	"""
	Handle WBS items when a Quotation is cancelled.
	WBS items are kept but marked as from a cancelled quotation.
	
	Args:
		doc: Quotation document
		method: Event method name
	"""
	# Currently we don't need to do anything special on cancel
	# The WBS items remain linked to the cancelled quotation
	pass


def on_quotation_submit(doc, method):
	"""
	Handle WBS items when a Quotation is submitted.
	Recalculate totals and ensure everything is synced.
	
	Args:
		doc: Quotation document
		method: Event method name
	"""
	from propasal.propasal.proposal_wbs_api import (
		get_root_wbs_item,
		recalculate_wbs_tree
	)
	
	try:
		root = get_root_wbs_item(doc.name)
		if root:
			# Final recalculation before submit
			recalculate_wbs_tree(doc.name)
	except Exception as e:
		frappe.log_error(
			f"Error syncing WBS on submit for {doc.name}: {str(e)}",
			"WBS Submit Sync Error"
		)
