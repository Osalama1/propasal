# Copyright (c) 2024, Propasal and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt
from erpnext.selling.doctype.quotation.quotation import Quotation as ERPNextQuotation
from propasal.propasal.services.quotation_hierarchy_service import quotation_hierarchy_service
from propasal.propasal.quotation_item_utils import (
	build_items_by_name,
	validate_percentage,
	PERCENTAGE_MIN,
	PERCENTAGE_MAX,
)


class Quotation(ERPNextQuotation):
	def before_validate(self):
		"""Run calculations BEFORE validation so children get updated amounts"""
		if hasattr(super(), 'before_validate'):
			super().before_validate()
		
		# Only calculate for draft documents
		if self.docstatus == 0:
			frappe.logger().debug(f"Before validate: Quotation {self.name} - calculating hierarchy")
			self.set_hierarchy_references()
			self.calculate_hierarchy_percentages()
	
	def before_save(self):
		# Recalculate again in before_save to catch any last-minute changes
		frappe.logger().debug(f"Before save: Quotation {self.name} with {len(self.items)} items")
		self.set_hierarchy_references()
		self.calculate_hierarchy_percentages()
		frappe.logger().debug(f"Before save complete for Quotation {self.name}")
	
	def validate(self):
		super().validate()
		
		# Prevent hierarchy modifications on submitted/cancelled documents
		if self.docstatus > 0:
			# Check if hierarchy-related fields were modified
			if self._has_hierarchy_changes():
				frappe.throw(
					frappe._("Cannot modify hierarchy structure on a submitted or cancelled quotation. Please cancel the quotation first to make changes.")
				)
		
		self.validate_hierarchy()
		self.validate_fixed_amount_constraints()  # Validate fixed amount constraints
		# Use service layer for abstraction
		quotation_hierarchy_service.calculate_totals(self)
	
	def _has_hierarchy_changes(self):
		"""Check if any hierarchy-related fields were modified in a submitted document"""
		# If this is a new document or in draft, no restrictions
		if not self.name or self.docstatus == 0:
			return False
		
		# Use Frappe's document before save to detect changes
		if hasattr(self, '_doc_before_save') and self._doc_before_save:
			original_items = self._doc_before_save.get('items', [])
			current_items = self.items
			
			# Check if item count changed
			if len(current_items) != len(original_items):
				return True
			
			# Check if any hierarchy fields changed
			original_items_by_name = {row.name: row for row in original_items}
			
			for row in current_items:
				if row.name in original_items_by_name:
					original_row = original_items_by_name[row.name]
					# Check hierarchy-related fields
					if (
						getattr(row, 'parent_activity', None) != getattr(original_row, 'parent_activity', None) or
						getattr(row, 'item_level', None) != getattr(original_row, 'item_level', None) or
						getattr(row, 'contract_percentage', None) != getattr(original_row, 'contract_percentage', None)
					):
						return True
			
			return False
		else:
			# Fallback: get from database
			try:
				original = frappe.get_cached_doc(self.doctype, self.name)
				
				# Check if item count changed
				if len(self.items) != len(original.items):
					return True
				
				# Check if any hierarchy fields changed
				original_items_by_name = {row.name: row for row in original.items}
				
				for row in self.items:
					if row.name in original_items_by_name:
						original_row = original_items_by_name[row.name]
						# Check hierarchy-related fields
						if (
							getattr(row, 'parent_activity', None) != getattr(original_row, 'parent_activity', None) or
							getattr(row, 'item_level', None) != getattr(original_row, 'item_level', None) or
							getattr(row, 'contract_percentage', None) != getattr(original_row, 'contract_percentage', None)
						):
							return True
				
				return False
			except Exception:
				# If we can't determine changes, be conservative and allow (defensive)
				return False
	
	def calculate_totals_from_hierarchy(self):
		"""Override default total calculation to sum root item amounts
		Following updated requirement: Grand Total = sum of root item amounts
		Root items represent the actual project values (fixed or calculated from children)"""
		if not self.items:
			return
		
		# Check if hierarchy fields exist (defensive check)
		first_item = self.items[0] if self.items else None
		if not first_item or not hasattr(first_item, 'parent_activity') or not hasattr(first_item, 'item_level'):
			return  # Skip if fields don't exist yet
		
		# Import helper function to get root items
		from propasal.propasal.quotation_item_utils import get_root_items
		
		# Get all root items (items with no parent_activity)
		root_items = get_root_items(self.items)
		
		# If we have root items, calculate grand total from their amounts
		if root_items:
			# Sum all root item amounts
			# Root items use their calculated_amount or amount
			# This respects both fixed and calculated root items
			root_items_total = 0
			for root_item in root_items:
				# Use calculated_amount (from calculate_hierarchical_percentages) or amount
				root_amount = flt(root_item.calculated_amount) or flt(root_item.amount) or 0
				root_items_total += root_amount
			
			# Set grand total to sum of root item amounts
			self.net_total = root_items_total
			self.total = root_items_total
		else:
			# Fallback: If no root items found, use leaf items (for backwards compatibility)
			items_with_children = set()
			for row in self.items:
				parent_activity = getattr(row, 'parent_activity', None)
				if parent_activity:
					items_with_children.add(parent_activity)
			
			leaf_items_total = 0
			for row in self.items:
				if row.name not in items_with_children:
					leaf_items_total += flt(row.amount)
			
			self.net_total = leaf_items_total
			self.total = leaf_items_total
	
	def validate_hierarchy(self):
		"""Validate hierarchical structure - following BOM Creator pattern"""
		if not self.items:
			return
		
		# Check if hierarchy fields exist (defensive check)
		first_item = self.items[0] if self.items else None
		if not first_item or not hasattr(first_item, 'parent_activity'):
			return  # Skip validation if fields don't exist yet - need to run migration
		
		items_by_name = build_items_by_name(self.items)
		items_by_idx = {row.idx: row for row in self.items}
		
		def check_circular_reference(item_name, parent_name, visited=None):
			"""
			Recursively check for circular references in the parent chain.
			Returns True if circular reference is detected.
			"""
			if visited is None:
				visited = set()
			
			# Direct self-reference check
			if item_name == parent_name:
				return True
			
			# If we've seen this parent before in the chain, it's a cycle
			if parent_name in visited:
				return True
			
			# Get the parent item
			if parent_name not in items_by_name:
				return False  # Parent not found (will be caught by other validation)
			
			parent_item = items_by_name[parent_name]
			parent_parent = getattr(parent_item, 'parent_activity', None)
			
			# If parent has no parent, no circular reference
			if not parent_parent or not parent_parent.strip():
				return False
			
			# Add current parent to visited set and check its parent
			visited.add(parent_name)
			return check_circular_reference(item_name, parent_parent, visited)
		
		for row in self.items:
			# Skip validation if parent_activity field doesn't exist
			if not hasattr(row, 'parent_activity'):
				continue
				
			parent_activity = getattr(row, 'parent_activity', None)
			
			# Only validate parent relationships if parent_activity is set and not empty
			if parent_activity and str(parent_activity).strip():
				if parent_activity not in items_by_name:
					frappe.throw(
						frappe._("Row {0}: Parent Activity '{1}' not found").format(
							row.idx, parent_activity
						)
					)
				
				parent = items_by_name[parent_activity]
				
				# Prevent circular references (both direct and multi-level)
				if check_circular_reference(row.name, parent_activity):
					# Build the chain for error message
					chain = [row.item_code or row.item_name or row.name]
					current_parent = parent_activity
					visited = set()
					
					while current_parent and current_parent not in visited:
						visited.add(current_parent)
						if current_parent in items_by_name:
							parent_item = items_by_name[current_parent]
							chain.append(parent_item.item_code or parent_item.item_name or current_parent)
							current_parent = getattr(parent_item, 'parent_activity', None)
							if current_parent == row.name:
								chain.append(row.item_code or row.item_name or row.name)
								break
						else:
							break
					
					chain_str = " → ".join(chain)
					frappe.throw(
						frappe._("Row {0}: Circular reference detected: {1}").format(
							row.idx, chain_str
						)
					)
				
				# Validate parent_row_no only if parent_activity is set
				# parent_row_no should point to an idx that is BEFORE current row
				if hasattr(row, 'parent_row_no'):
					from frappe.utils import cint
					parent_row_no = getattr(row, 'parent_row_no', None)
					
					if parent_row_no:
						parent_idx = cint(parent_row_no)
						# Only validate if parent_idx is actually set (> 0)
						# and if it's supposed to point to the actual parent
						if parent_idx > 0 and parent_idx > row.idx:
							frappe.throw(
								frappe._("Row {0}: Parent row number ({1}) cannot be after current row").format(
									row.idx, parent_idx
								)
							)
			else:
				# Root item (no parent_activity) - clear parent_row_no
				if hasattr(row, 'parent_row_no'):
					row.parent_row_no = 0
			
			# Validate contract_percentage range (0-100%)
			if hasattr(row, 'contract_percentage') and row.contract_percentage is not None:
				try:
					validate_percentage(row.contract_percentage, f"Row {row.idx}: Contract Percentage")
				except frappe.ValidationError as e:
					frappe.throw(frappe._("Row {0}: {1}").format(row.idx, str(e)))
	
	def validate_fixed_amount_constraints(self):
		"""Validate that fixed amount constraints are not violated"""
		from propasal.propasal.quotation_item_utils import validate_fixed_amount_constraint
		
		if not self.items:
			return
		
		items_by_name = build_items_by_name(self.items)
		
		# Check all items with fixed amounts
		for item in self.items:
			if not hasattr(item, 'custom_is_fixed'):
				continue
				
			is_fixed = getattr(item, 'custom_is_fixed', False)
			
			if not is_fixed:
				continue  # Skip non-fixed items
			
			# Item is fixed - validate its children don't exceed it
			# Get all direct children
			children = [row for row in self.items if getattr(row, 'parent_activity', None) == item.name]
			
			if not children:
				continue  # No children, nothing to validate
			
			# VALIDATION 1: Fixed parent groups must have fixed child groups (Phase/Activity only, not Tasks)
			# This constraint applies to Phase and Activity levels, NOT to Task level
			item_level = getattr(item, 'item_level', '')
			if item_level in ['Activity', 'Phase']:
				for child in children:
					child_level = getattr(child, 'item_level', '')
					# Only validate Phase and Activity children, not Tasks
					if child_level in ['Activity', 'Phase']:
						child_is_fixed = getattr(child, 'custom_is_fixed', False)
						if not child_is_fixed:
							frappe.throw(
								frappe._("Row {0}: Fixed {1} '{2}' cannot have non-fixed child {3} '{4}'. "
									"Child groups (Phase/Activity) under a fixed parent must also be fixed. "
									"This constraint does not apply to Tasks.").format(
									child.idx,
									item_level,
									item.item_name or item.item_code,
									child_level,
									child.item_name or child.item_code
								)
							)
			
			# VALIDATION 2: Calculate sum of all children (recursively) and validate they don't exceed parent
			from propasal.propasal.quotation_item_utils import get_children_sum_recursive
			children_sum = get_children_sum_recursive(self.items, item.name)
			
			# Get parent fixed amount
			parent_amount = flt(item.calculated_amount) or flt(item.amount) or 0
			
			# Validate with small tolerance for floating-point precision (0.01 = 1 cent)
			# This prevents false positives from floating-point arithmetic errors
			TOLERANCE = 0.01
			if children_sum > (parent_amount + TOLERANCE):
				frappe.throw(
					frappe._("Row {0}: Total of child items ({1}) exceeds fixed amount ({2}). Please reduce child amounts or increase fixed amount.").format(
						item.idx,
						frappe.format(children_sum, {"fieldtype": "Currency", "currency": self.currency or "EGP"}),
						frappe.format(parent_amount, {"fieldtype": "Currency", "currency": self.currency or "EGP"})
					)
				)
	
	def set_hierarchy_references(self):
		"""Set reference IDs for tree structure - uses service layer"""
		frappe.logger().debug(f"Setting hierarchy references for Quotation {self.name}")
		# Log current state before changes (debug level only)
		if self.items:
			for item in self.items:
				frappe.logger().debug(
					f"Item {item.idx}: {item.item_code or item.item_name} | "
					f"parent_activity={getattr(item, 'parent_activity', 'N/A')} | "
					f"parent_row_no={getattr(item, 'parent_row_no', 'N/A')}"
				)
		
		# Use service layer for abstraction
		quotation_hierarchy_service.setup_hierarchy_references(self)
		frappe.logger().debug(f"Hierarchy references set for Quotation {self.name}")
	
	def calculate_hierarchy_percentages(self):
		"""Calculate hierarchical percentages and amounts - uses service layer"""
		# Use service layer for abstraction
		quotation_hierarchy_service.calculate_percentages(self)
