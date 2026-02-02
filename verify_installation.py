#!/usr/bin/env python3
"""
Verification script for Propasal app installation
Run this after installing the app to verify all fields are created correctly
"""

import frappe
from frappe import _


def verify_installation():
	"""Verify that all required custom fields are installed"""
	
	print("\n" + "="*60)
	print("PROPASAL APP - Installation Verification")
	print("="*60 + "\n")
	
	errors = []
	warnings = []
	
	# ========================================================================
	# 1. Verify Quotation Item Fields
	# ========================================================================
	print("1. Checking Quotation Item custom fields...")
	
	required_quotation_item_fields = [
		"hierarchy_section",
		"item_level",
		"parent_activity",
		"parent_row_no",
		"activity_reference_id",
		"is_expandable",
		"percentage_section",
		"custom_is_fixed",
		"contract_percentage",
		"total_percentage",
		"calculated_amount",
	]
	
	for fieldname in required_quotation_item_fields:
		field = frappe.db.get_value(
			"Custom Field",
			{"dt": "Quotation Item", "fieldname": fieldname},
			["name", "label", "fieldtype", "hidden"],
			as_dict=True
		)
		
		if not field:
			errors.append(f"   ✗ Missing field: {fieldname}")
		else:
			status = "✓"
			if field.hidden and fieldname not in ["activity_reference_id"]:
				warnings.append(f"   ⚠ Field {fieldname} is hidden")
				status = "⚠"
			print(f"   {status} {fieldname} ({field.fieldtype})")
	
	# ========================================================================
	# 2. Verify Quotation Fields
	# ========================================================================
	print("\n2. Checking Quotation custom fields...")
	
	required_quotation_fields = [
		("hierarchy_tree_tab", "Tab Break"),
		("quotation_tree", "HTML"),
	]
	
	for fieldname, expected_type in required_quotation_fields:
		field = frappe.db.get_value(
			"Custom Field",
			{"dt": "Quotation", "fieldname": fieldname},
			["name", "label", "fieldtype", "hidden"],
			as_dict=True
		)
		
		if not field:
			errors.append(f"   ✗ Missing field: {fieldname}")
		else:
			status = "✓"
			if field.fieldtype != expected_type:
				errors.append(f"   ✗ Wrong type for {fieldname}: {field.fieldtype} (expected {expected_type})")
				status = "✗"
			elif field.hidden:
				warnings.append(f"   ⚠ Field {fieldname} is hidden")
				status = "⚠"
			print(f"   {status} {fieldname} ({field.fieldtype})")
	
	# ========================================================================
	# 3. Verify Hooks Configuration
	# ========================================================================
	print("\n3. Checking hooks configuration...")
	
	try:
		from propasal.hooks import doctype_js, override_doctype_class, doc_events
		
		if "Quotation" in doctype_js:
			print("   ✓ Quotation JS override configured")
		else:
			warnings.append("   ⚠ Quotation JS override not found in hooks")
		
		if "Quotation" in override_doctype_class:
			print("   ✓ Quotation class override configured")
		else:
			errors.append("   ✗ Quotation class override not configured")
		
		if "Quotation" in doc_events:
			print("   ✓ Quotation document events configured")
		else:
			warnings.append("   ⚠ Quotation document events not configured")
			
	except Exception as e:
		errors.append(f"   ✗ Error checking hooks: {str(e)}")
	
	# ========================================================================
	# 4. Verify Functions
	# ========================================================================
	print("\n4. Checking core functions...")
	
	try:
		from propasal.propasal.quotation_hierarchy import (
			add_quotation_hierarchy_fields,
			get_quotation_children,
			add_multiple_items,
			duplicate_item,
			set_reference_ids,
			calculate_hierarchical_percentages
		)
		print("   ✓ All core functions imported successfully")
	except ImportError as e:
		errors.append(f"   ✗ Import error: {str(e)}")
	
	# ========================================================================
	# 5. Summary
	# ========================================================================
	print("\n" + "="*60)
	print("VERIFICATION SUMMARY")
	print("="*60)
	
	if not errors and not warnings:
		print("\n✓ ALL CHECKS PASSED!")
		print("  The Propasal app is correctly installed and configured.")
		print("\n  Next steps:")
		print("  1. Restart bench: bench restart")
		print("  2. Clear browser cache: Ctrl+Shift+R")
		print("  3. Open a Quotation and check the 'Hierarchy Tree' tab")
		return True
	
	if warnings:
		print(f"\n⚠ {len(warnings)} Warning(s):")
		for warning in warnings:
			print(warning)
	
	if errors:
		print(f"\n✗ {len(errors)} Error(s) Found:")
		for error in errors:
			print(error)
		print("\nTo fix errors, run:")
		print("  bench --site your-site-name console")
		print("  >>> from propasal.install import create_quotation_hierarchy_fields")
		print("  >>> create_quotation_hierarchy_fields()")
		print("  >>> frappe.db.commit()")
		return False
	
	return True


if __name__ == "__main__":
	# This script should be run from bench console or as a frappe command
	print("Please run this script from bench console:")
	print("  bench --site your-site-name console")
	print("  >>> exec(open('apps/propasal/verify_installation.py').read())")
	print("  >>> verify_installation()")
