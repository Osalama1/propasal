# Copyright (c) 2026, omar and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, cint
from frappe.utils.nestedset import NestedSet


class ProposalWBSItem(NestedSet):
	"""
	Proposal WBS Item - Work Breakdown Structure item for Quotation hierarchy.
	
	Implements a tree structure with bi-directional calculations:
	- Down-Up (Aggregation): Sum children amounts to calculate parent amount
	- Up-Down (Distribution): Distribute parent amount proportionally to children
	"""
	
	nsm_parent_field = "parent_proposal_wbs_item"
	
	def validate(self):
		"""Validate WBS item before save"""
		self.sync_amount_and_percentage()  # Sync amount/percentage FIRST
		self.validate_item_level()
		self.validate_parent_quotation()
		self.set_is_group()
		self.calculate_amount_from_rate_qty()
		self.validate_cumulative_amount()
		self.validate_fixed_parent_constraint()  # Check fixed parent budget
	
	def sync_amount_and_percentage(self):
		"""
		Sync amount and percentage based on which field changed.
		
		This enables bi-directional calculation:
		- If user changes percentage → calculate amount from parent
		- If user changes amount → calculate percentage from parent
		"""
		if not self.parent_proposal_wbs_item:
			return  # Root item - no parent to calculate from
		
		try:
			parent = frappe.get_cached_doc("Proposal WBS Item", self.parent_proposal_wbs_item)
		except frappe.DoesNotExistError:
			return
		
		parent_amount = flt(parent.amount)
		
		if parent_amount <= 0:
			return  # Cannot calculate without parent amount
		
		# Get old values to detect what changed
		if self.is_new():
			old_amount = 0
			old_percent = 0
		else:
			old = frappe.db.get_value(
				"Proposal WBS Item", 
				self.name, 
				["amount", "weight_in_parent_percent"], 
				as_dict=True
			)
			old_amount = flt(old.amount) if old else 0
			old_percent = flt(old.weight_in_parent_percent) if old else 0
		
		current_amount = flt(self.amount)
		current_percent = flt(self.weight_in_parent_percent)
		
		# Detect which field changed (with small tolerance for floating point)
		amount_changed = abs(current_amount - old_amount) > 0.01
		percent_changed = abs(current_percent - old_percent) > 0.01
		
		if percent_changed and not amount_changed:
			# User changed percentage → calculate amount
			# amount = parent_amount × (percentage / 100)
			calculated_amount = (current_percent / 100) * parent_amount
			self.amount = flt(calculated_amount, 2)
			self.calculated_amount = self.amount
		elif amount_changed and not percent_changed:
			# User changed amount → calculate percentage
			# percentage = (amount / parent_amount) × 100
			calculated_percent = (current_amount / parent_amount) * 100
			self.weight_in_parent_percent = flt(calculated_percent, 2)
		elif amount_changed and percent_changed:
			# Both changed - prefer amount (more precise for financial data)
			calculated_percent = (current_amount / parent_amount) * 100
			self.weight_in_parent_percent = flt(calculated_percent, 2)
		elif self.is_new() and current_percent > 0 and current_amount == 0:
			# New item with percentage but no amount - calculate amount
			calculated_amount = (current_percent / 100) * parent_amount
			self.amount = flt(calculated_amount, 2)
			self.calculated_amount = self.amount
		elif self.is_new() and current_amount > 0 and current_percent == 0:
			# New item with amount but no percentage - calculate percentage
			calculated_percent = (current_amount / parent_amount) * 100
			self.weight_in_parent_percent = flt(calculated_percent, 2)
	
	def validate_fixed_parent_constraint(self):
		"""
		Validate that child amount doesn't cause total to exceed fixed parent's budget.
		
		When parent has custom_is_fixed = 1, the sum of all children
		must not exceed the parent's amount.
		"""
		if not self.parent_proposal_wbs_item:
			return  # Root item - no constraint
		
		try:
			parent = frappe.get_cached_doc("Proposal WBS Item", self.parent_proposal_wbs_item)
		except frappe.DoesNotExistError:
			return
		
		if not parent.custom_is_fixed:
			return  # Parent is cumulative, no constraint (parent amount is derived from children)
		
		parent_amount = flt(parent.amount)
		if parent_amount <= 0:
			return  # Cannot validate without parent amount
		
		# Get sum of all siblings (excluding self)
		siblings_sum = frappe.db.sql("""
			SELECT COALESCE(SUM(amount), 0) as total
			FROM `tabProposal WBS Item`
			WHERE parent_proposal_wbs_item = %s AND name != %s
		""", (self.parent_proposal_wbs_item, self.name or ""))[0][0]
		
		total_with_self = flt(siblings_sum) + flt(self.amount)
		
		# Small tolerance for floating point precision
		if total_with_self > parent_amount + 0.01:
			frappe.throw(
				_("Total of children ({0}) exceeds fixed parent amount ({1}). "
				  "Please reduce the amount or percentage.").format(
					frappe.format_value(total_with_self, {"fieldtype": "Currency"}),
					frappe.format_value(parent_amount, {"fieldtype": "Currency"})
				)
			)
	
	def validate_cumulative_amount(self):
		"""
		For cumulative (non-fixed) groups, prevent manual amount changes.
		The amount should come from summing children.
		"""
		if not self.is_group or self.custom_is_fixed:
			return  # Only applies to cumulative groups
		
		if self.is_new():
			return  # New items can set initial amount
		
		# Check if this is a cumulative group with children
		children_count = frappe.db.count(
			"Proposal WBS Item",
			{"parent_proposal_wbs_item": self.name}
		)
		
		if children_count == 0:
			return  # No children yet, allow setting amount
		
		# Get the sum of children
		children_sum = get_children_sum(self.name)
		
		# If user tries to set amount different from children sum, revert it
		if abs(flt(self.amount) - flt(children_sum)) > 0.01:
			frappe.msgprint(
				_("Amount for cumulative groups is automatically calculated from children. "
				  "Your manual change has been ignored."),
				indicator="orange",
				alert=True
			)
			self.amount = children_sum
			self.calculated_amount = children_sum
	
	def validate_item_level(self):
		"""Validate item level is appropriate for position in tree"""
		if not self.item_level:
			self.item_level = "Task"
		
		# UNLIMITED NESTING: Allow any valid level regardless of parent
		# The UI can enforce stricter rules, but backend allows flexibility
		valid_levels = ["Activity", "Phase", "Task"]
		if self.item_level not in valid_levels:
			frappe.throw(_("Item level must be one of: Activity, Phase, Task"))
	
	def validate_parent_quotation(self):
		"""Ensure child items inherit quotation from parent"""
		if self.parent_proposal_wbs_item and not self.quotation:
			parent = frappe.get_cached_doc("Proposal WBS Item", self.parent_proposal_wbs_item)
			self.quotation = parent.quotation
		
		# If this is a root item, quotation is required
		if not self.parent_proposal_wbs_item and not self.quotation:
			# Allow items without quotation for flexibility
			pass
	
	def set_is_group(self):
		"""Set is_group based on item_level"""
		if self.item_level in ["Activity", "Phase"]:
			self.is_group = 1
		# Don't auto-unset for Tasks as they might have children
	
	def calculate_amount_from_rate_qty(self):
		"""Calculate amount from rate and qty if not fixed"""
		if not self.custom_is_fixed and self.rate and self.qty:
			calculated = flt(self.rate) * flt(self.qty)
			if calculated > 0 and not self.amount:
				self.amount = calculated
	
	def on_update(self):
		"""After save, recalculate hierarchy"""
		super().on_update()
		
		# Recalculate parent amounts (Down-Up)
		self.calculate_parent_amounts()
		
		# Recalculate percentages for the entire tree
		self.recalculate_tree_percentages()
		
		# Sync grand total to Quotation
		self.sync_quotation_grand_total()
	
	def after_insert(self):
		"""After insert, update parent is_group flag"""
		if self.parent_proposal_wbs_item:
			frappe.db.set_value(
				"Proposal WBS Item",
				self.parent_proposal_wbs_item,
				"is_group",
				1,
				update_modified=False
			)
	
	def on_trash(self):
		"""Before delete, handle cleanup"""
		super().on_trash()
		
		# After deletion, recalculate parent
		if self.parent_proposal_wbs_item:
			frappe.enqueue(
				"propasal.propasal.doctype.proposal_wbs_item.proposal_wbs_item.recalculate_parent_after_delete",
				parent_name=self.parent_proposal_wbs_item,
				quotation=self.quotation,
				queue="short"
			)
	
	def calculate_parent_amounts(self):
		"""
		Down-Up Calculation (Aggregation):
		Traverse up the tree from this node, summing children amounts
		and updating parent amounts (if not fixed).
		"""
		if not self.parent_proposal_wbs_item:
			return
		
		# Get all ancestors from this node to root
		ancestors = self.get_ancestors()
		
		# Process from immediate parent up to root
		for ancestor_name in ancestors:
			ancestor = frappe.get_doc("Proposal WBS Item", ancestor_name)
			
			# Skip if ancestor has fixed amount
			if ancestor.custom_is_fixed:
				continue
			
			# Sum all direct children amounts
			children_sum = get_children_sum(ancestor_name)
			
			# Update ancestor amount if different
			if flt(ancestor.amount) != flt(children_sum):
				frappe.db.set_value(
					"Proposal WBS Item",
					ancestor_name,
					{
						"amount": children_sum,
						"calculated_amount": children_sum
					},
					update_modified=False
				)
	
	def get_ancestors(self):
		"""Get all ancestor names from this node to root"""
		ancestors = []
		current = self.parent_proposal_wbs_item
		
		# Prevent infinite loop - support deep nesting
		max_depth = 50
		depth = 0
		
		while current and depth < max_depth:
			ancestors.append(current)
			parent_data = frappe.db.get_value(
				"Proposal WBS Item",
				current,
				"parent_proposal_wbs_item"
			)
			current = parent_data
			depth += 1
		
		return ancestors
	
	def recalculate_tree_percentages(self):
		"""
		Recalculate weight_in_parent_percent and total_project_percent
		for all nodes in the tree.
		"""
		if not self.quotation:
			return
		
		# Get root node for this quotation
		root = get_root_wbs_item(self.quotation)
		if not root:
			return
		
		root_amount = flt(root.amount) or 1  # Avoid division by zero
		
		# Get all nodes for this quotation ordered by lft
		all_nodes = frappe.get_all(
			"Proposal WBS Item",
			filters={"quotation": self.quotation},
			fields=["name", "amount", "parent_proposal_wbs_item"],
			order_by="lft asc"
		)
		
		for node in all_nodes:
			# Calculate total_project_percent
			total_percent = (flt(node.amount) / root_amount) * 100 if root_amount else 0
			
			# Calculate weight_in_parent_percent
			weight_percent = 100  # Default for root
			if node.parent_proposal_wbs_item:
				parent_amount = frappe.db.get_value(
					"Proposal WBS Item",
					node.parent_proposal_wbs_item,
					"amount"
				)
				if parent_amount:
					weight_percent = (flt(node.amount) / flt(parent_amount)) * 100
			
			# Update if changed
			frappe.db.set_value(
				"Proposal WBS Item",
				node.name,
				{
					"total_project_percent": flt(total_percent, 2),
					"weight_in_parent_percent": flt(weight_percent, 2)
				},
				update_modified=False
			)
	
	def sync_quotation_grand_total(self):
		"""
		Sync the root WBS item amount to the Quotation as grand total.
		Creates/updates a single Quotation Item with the total amount.
		"""
		if not self.quotation:
			return
		
		# Get root node for this quotation
		root = get_root_wbs_item(self.quotation)
		if not root:
			return
		
		try:
			quotation = frappe.get_doc("Quotation", self.quotation)
			
			# Check if quotation is submitted/cancelled
			if quotation.docstatus != 0:
				return
			
			grand_total = flt(root.amount)
			
			# Update root_wbs_item link on quotation if not set
			if not quotation.get("root_wbs_item") or quotation.root_wbs_item != root.name:
				frappe.db.set_value(
					"Quotation",
					self.quotation,
					"root_wbs_item",
					root.name,
					update_modified=False
				)
			
			# Find or create a single quotation item for grand total
			existing_items = quotation.get("items", [])
			
			if existing_items:
				# Update the first item with grand total
				first_item = existing_items[0]
				if flt(first_item.amount) != grand_total:
					frappe.db.set_value(
						"Quotation Item",
						first_item.name,
						{
							"amount": grand_total,
							"rate": grand_total,
							"qty": 1
						},
						update_modified=False
					)
					# Update quotation totals
					frappe.db.set_value(
						"Quotation",
						self.quotation,
						{
							"total": grand_total,
							"grand_total": grand_total,
							"rounded_total": grand_total
						},
						update_modified=False
					)
			
		except Exception as e:
			frappe.log_error(
				f"Error syncing quotation grand total: {str(e)}",
				"WBS Quotation Sync Error"
			)
	
	@frappe.whitelist()
	def distribute_amount_to_children(self, new_amount=None):
		"""
		Up-Down Calculation (Distribution):
		Distribute the parent's amount proportionally to children
		based on their existing weight_in_parent_percent.
		
		Args:
			new_amount: Optional new amount to distribute. If not provided, uses self.amount
		"""
		if new_amount is not None:
			amount_to_distribute = flt(new_amount)
		else:
			amount_to_distribute = flt(self.amount)
		
		# Get direct children
		children = frappe.get_all(
			"Proposal WBS Item",
			filters={"parent_proposal_wbs_item": self.name},
			fields=["name", "weight_in_parent_percent", "amount", "custom_is_fixed"],
			order_by="lft asc"
		)
		
		if not children:
			return
		
		# Calculate total weight of non-fixed children
		total_weight = sum(
			flt(c.weight_in_parent_percent) 
			for c in children 
			if not c.custom_is_fixed
		)
		
		# Calculate fixed children sum
		fixed_sum = sum(
			flt(c.amount) 
			for c in children 
			if c.custom_is_fixed
		)
		
		# Amount available for distribution (excluding fixed amounts)
		distributable_amount = amount_to_distribute - fixed_sum
		
		if distributable_amount < 0:
			frappe.throw(_(
				"Fixed children amounts ({0}) exceed parent amount ({1})"
			).format(fixed_sum, amount_to_distribute))
		
		# Distribute to non-fixed children
		distributed_total = 0
		non_fixed_children = [c for c in children if not c.custom_is_fixed]
		
		for i, child in enumerate(non_fixed_children):
			if total_weight > 0:
				# Proportional distribution based on weight
				child_share = (flt(child.weight_in_parent_percent) / total_weight) * distributable_amount
			else:
				# Equal distribution if no weights defined
				child_share = distributable_amount / len(non_fixed_children)
			
			# Handle rounding - last child gets remainder
			if i == len(non_fixed_children) - 1:
				child_amount = distributable_amount - distributed_total
			else:
				child_amount = flt(child_share, 2)
				distributed_total += child_amount
			
			# Update child amount
			frappe.db.set_value(
				"Proposal WBS Item",
				child.name,
				{
					"amount": child_amount,
					"calculated_amount": child_amount
				},
				update_modified=False
			)
			
			# Recursively distribute to grandchildren
			child_doc = frappe.get_doc("Proposal WBS Item", child.name)
			child_doc.distribute_amount_to_children(child_amount)
		
		# Recalculate percentages after distribution
		self.recalculate_tree_percentages()


def get_children_sum(parent_name):
	"""Get sum of all direct children amounts"""
	children = frappe.get_all(
		"Proposal WBS Item",
		filters={"parent_proposal_wbs_item": parent_name},
		fields=["amount"]
	)
	return sum(flt(c.amount) for c in children)


def get_root_wbs_item(quotation_name):
	"""Get the root WBS item for a quotation"""
	root = frappe.get_all(
		"Proposal WBS Item",
		filters={
			"quotation": quotation_name,
			"parent_proposal_wbs_item": ["is", "not set"]
		},
		fields=["name", "amount", "item_name"],
		limit=1
	)
	
	if root:
		return frappe.get_doc("Proposal WBS Item", root[0].name)
	return None


def recalculate_parent_after_delete(parent_name, quotation):
	"""Recalculate parent amounts after a child is deleted"""
	try:
		if parent_name and frappe.db.exists("Proposal WBS Item", parent_name):
			parent = frappe.get_doc("Proposal WBS Item", parent_name)
			
			# Check if parent still has children
			children_count = frappe.db.count(
				"Proposal WBS Item",
				{"parent_proposal_wbs_item": parent_name}
			)
			
			if children_count == 0:
				# No more children, reset is_group
				frappe.db.set_value(
					"Proposal WBS Item",
					parent_name,
					"is_group",
					0,
					update_modified=False
				)
			else:
				# Recalculate parent amount from remaining children
				if not parent.custom_is_fixed:
					children_sum = get_children_sum(parent_name)
					frappe.db.set_value(
						"Proposal WBS Item",
						parent_name,
						{
							"amount": children_sum,
							"calculated_amount": children_sum
						},
						update_modified=False
					)
			
			# Recalculate all percentages
			parent.recalculate_tree_percentages()
			
			# Sync quotation grand total
			parent.sync_quotation_grand_total()
			
	except Exception as e:
		frappe.log_error(
			f"Error recalculating after delete: {str(e)}",
			"WBS Delete Recalculation Error"
		)


@frappe.whitelist()
def recalculate_wbs_tree(quotation_name):
	"""
	Force full recalculation of the entire WBS tree for a quotation.
	Called from API or manually when needed.
	"""
	if not quotation_name:
		frappe.throw(_("Quotation name is required"))
	
	root = get_root_wbs_item(quotation_name)
	if not root:
		frappe.throw(_("No WBS tree found for quotation {0}").format(quotation_name))
	
	# Recalculate from leaves up
	recalculate_bottom_up(quotation_name)
	
	# Recalculate percentages
	root.recalculate_tree_percentages()
	
	# Sync to quotation
	root.sync_quotation_grand_total()
	
	return {
		"success": True,
		"message": _("WBS tree recalculated successfully"),
		"grand_total": root.amount
	}


def recalculate_bottom_up(quotation_name):
	"""
	Recalculate amounts from leaves up to root.
	This ensures proper aggregation of all children.
	"""
	# Get all nodes ordered by rgt (leaves first)
	all_nodes = frappe.get_all(
		"Proposal WBS Item",
		filters={"quotation": quotation_name},
		fields=["name", "parent_proposal_wbs_item", "custom_is_fixed", "is_group"],
		order_by="rgt asc"
	)
	
	for node in all_nodes:
		if not node.is_group or node.custom_is_fixed:
			continue
		
		# Sum children amounts
		children_sum = get_children_sum(node.name)
		
		if children_sum > 0:
			frappe.db.set_value(
				"Proposal WBS Item",
				node.name,
				{
					"amount": children_sum,
					"calculated_amount": children_sum
				},
				update_modified=False
			)
