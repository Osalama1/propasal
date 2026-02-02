# Copyright (c) 2024, Propasal and contributors
# For license information, please see license.txt

"""
Service Layer for Quotation Hierarchy Business Logic

This module provides a service layer abstraction to separate business logic
from controller/view logic, reducing tight coupling and improving testability.
"""

import frappe
from frappe import _
from typing import Dict, List, Optional, Any
from propasal.propasal.quotation_hierarchy import (
	calculate_hierarchical_percentages,
	set_reference_ids,
	set_is_expandable,
)
from propasal.propasal.quotation_item_utils import (
	build_items_by_name,
	find_item_by_name,
	find_items_by_parent,
	get_root_items,
)


class QuotationHierarchyService:
	"""
	Service class for quotation hierarchy operations.
	Encapsulates business logic separate from document lifecycle and API controllers.
	"""
	
	@staticmethod
	def validate_hierarchy_structure(doc: "frappe.Document") -> None:
		"""
		Validate the hierarchical structure of quotation items.
		
		Args:
			doc: Quotation document to validate
			
		Raises:
			frappe.ValidationError: If validation fails
		"""
		from propasal.propasal.overrides.quotation import Quotation
		
		if not hasattr(doc, 'items') or not doc.items:
			return
		
		# Use the Quotation class validation method
		if isinstance(doc, Quotation):
			doc.validate_hierarchy()
		else:
			# Fallback: create temporary Quotation instance for validation
			quotation_instance = Quotation(doc.as_dict())
			quotation_instance.validate_hierarchy()
	
	@staticmethod
	def calculate_totals(doc: "frappe.Document") -> None:
		"""
		Calculate totals from hierarchy (leaf items only).
		
		Args:
			doc: Quotation document
		"""
		from propasal.propasal.overrides.quotation import Quotation
		
		if not hasattr(doc, 'items') or not doc.items:
			return
		
		if isinstance(doc, Quotation):
			doc.calculate_totals_from_hierarchy()
		else:
			quotation_instance = Quotation(doc.as_dict())
			quotation_instance.calculate_totals_from_hierarchy()
	
	@staticmethod
	def setup_hierarchy_references(doc: "frappe.Document") -> None:
		"""
		Set up hierarchy references (parent_row_no, activity_reference_id, is_expandable).
		
		Args:
			doc: Quotation document
		"""
		if not hasattr(doc, 'items') or not doc.items:
			return
		
		# Check if hierarchy fields exist
		first_item = doc.items[0] if doc.items else None
		if not first_item or not hasattr(first_item, 'parent_activity'):
			return
		
		set_reference_ids(doc)
		set_is_expandable(doc)
	
	@staticmethod
	def calculate_percentages(doc: "frappe.Document") -> None:
		"""
		Calculate hierarchical percentages and amounts.
		
		Args:
			doc: Quotation document
		"""
		if not hasattr(doc, 'items') or not doc.items:
			return
		
		# Check if hierarchy fields exist
		first_item = doc.items[0] if doc.items else None
		if not first_item or not hasattr(first_item, 'parent_activity'):
			return
		
		calculate_hierarchical_percentages(doc)
	
	@staticmethod
	def has_hierarchy_changes(doc: "frappe.Document") -> bool:
		"""
		Check if hierarchy-related fields were modified.
		
		Args:
			doc: Quotation document
			
		Returns:
			bool: True if hierarchy fields were modified, False otherwise
		"""
		from propasal.propasal.overrides.quotation import Quotation
		
		if not isinstance(doc, Quotation):
			return False
		
		return doc._has_hierarchy_changes()
	
	@staticmethod
	def get_item_hierarchy_info(quotation_name: str) -> Dict[str, Any]:
		"""
		Get hierarchy information for a quotation.
		
		Args:
			quotation_name: Name of the quotation
			
		Returns:
			dict: Hierarchy information including root items, item counts, etc.
		"""
		doc = frappe.get_cached_doc("Quotation", quotation_name)
		
		if not doc.items:
			return {
				"total_items": 0,
				"root_items": [],
				"max_depth": 0,
			}
		
		items_by_name = build_items_by_name(doc.items)
		root_items = get_root_items(doc.items)
		
		# Calculate max depth
		def get_depth(item_name: str, visited: Optional[set] = None) -> int:
			if visited is None:
				visited = set()
			
			if item_name in visited:
				return 0  # Circular reference
			
			visited.add(item_name)
			item = items_by_name.get(item_name)
			if not item:
				return 0
			
			children = find_items_by_parent(doc.items, item_name)
			if not children:
				return 1
			
			max_child_depth = max([get_depth(child.name, visited.copy()) for child in children], default=0)
			return max_child_depth + 1
		
		max_depth = max([get_depth(item.name) for item in root_items], default=0)
		
		return {
			"total_items": len(doc.items),
			"root_items": [item.item_code or item.item_name for item in root_items],
			"root_items_count": len(root_items),
			"max_depth": max_depth,
		}


# Hook functions for document events
def on_quotation_update_after_submit(doc, method=None):
	"""
	Handle quotation update after submit.
	Validate that hierarchy structure hasn't been modified.
	"""
	try:
		service = QuotationHierarchyService()
		if service.has_hierarchy_changes(doc):
			frappe.throw(
				_("Cannot modify hierarchy structure on a submitted quotation. Please cancel the quotation first to make changes.")
			)
	except Exception as e:
		frappe.log_error(
			message=f"Error in on_quotation_update_after_submit: {str(e)}",
			title="Quotation Update After Submit Error"
		)


def on_quotation_cancel(doc, method=None):
	"""
	Handle quotation cancellation.
	Perform any necessary cleanup or validation.
	"""
	try:
		# Invalidate cache when quotation is cancelled
		cache_key = f"quotation_children_{doc.name}"
		frappe.cache().delete_value(cache_key)
		frappe.logger().debug(f"Cache invalidated for cancelled quotation: {doc.name}")
	except Exception as e:
		frappe.log_error(
			message=f"Error in on_quotation_cancel: {str(e)}",
			title="Quotation Cancel Error"
		)


def on_quotation_trash(doc, method=None):
	"""
	Handle quotation deletion.
	Perform cleanup and invalidate related caches.
	"""
	try:
		# Invalidate all caches related to this quotation
		cache_key = f"quotation_children_{doc.name}"
		frappe.cache().delete_value(cache_key)
		frappe.logger().debug(f"Cache invalidated for deleted quotation: {doc.name}")
	except Exception as e:
		frappe.log_error(
			message=f"Error in on_quotation_trash: {str(e)}",
			title="Quotation Trash Error"
		)


# Singleton instance for dependency injection
quotation_hierarchy_service = QuotationHierarchyService()
