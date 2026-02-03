// ============================================================================
// PROPOSAL WBS TREE - Tree UI for Proposal WBS Item DocType
// ERPNext v15 Compatible | Integrates with Quotation Form
// Copyright (c) 2026, PCO and contributors
// ============================================================================

frappe.provide("propasal.wbs");

/**
 * WBS Tree Module - Manages Proposal WBS Item tree from Quotation form
 * 
 * This module provides a tree UI for managing Proposal WBS Items
 * directly from the Quotation form. It supports:
 * - Creating/editing/deleting WBS items via API
 * - Bi-directional calculations (Up-Down and Down-Up)
 * - Syncing grand total to single Quotation Item
 */

// ============================================================================
// WBS API WRAPPER
// ============================================================================

propasal.wbs.api = {
	/**
	 * Get full WBS tree for a quotation
	 */
	getTree: async function(quotation_name) {
		if (!quotation_name) return [];
		
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.get_full_wbs_tree",
				args: { quotation_name },
				freeze: false
			});
			return response.message || [];
		} catch (error) {
			console.error("Error fetching WBS tree:", error);
			return [];
		}
	},
	
	/**
	 * Get flat list of WBS items
	 */
	getItems: async function(quotation_name, parent = null) {
		if (!quotation_name) return [];
		
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.get_wbs_tree",
				args: { quotation_name, parent },
				freeze: false
			});
			return response.message || [];
		} catch (error) {
			console.error("Error fetching WBS items:", error);
			return [];
		}
	},
	
	/**
	 * Create root WBS item for quotation
	 */
	createRoot: async function(quotation_name, item_name) {
		if (!quotation_name) {
			frappe.throw(__("Quotation name is required"));
			return null;
		}
		
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.create_root_wbs_item",
				args: { quotation_name, item_name },
				freeze: true,
				freeze_message: __("Creating WBS structure...")
			});
			return response.message;
		} catch (error) {
			frappe.msgprint({
				title: __("Error"),
				indicator: "red",
				message: error.message || __("Failed to create root WBS item")
			});
			return null;
		}
	},
	
	/**
	 * Add WBS item to tree
	 */
	addItem: async function(params) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.add_wbs_item",
				args: params,
				freeze: true,
				freeze_message: __("Adding item...")
			});
			return response.message;
		} catch (error) {
			frappe.msgprint({
				title: __("Error"),
				indicator: "red",
				message: error.message || __("Failed to add WBS item")
			});
			return null;
		}
	},
	
	/**
	 * Update WBS item
	 */
	updateItem: async function(name, updates) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.update_wbs_item",
				args: { name, ...updates },
				freeze: true,
				freeze_message: __("Updating...")
			});
			return response.message;
		} catch (error) {
			frappe.msgprint({
				title: __("Error"),
				indicator: "red",
				message: error.message || __("Failed to update WBS item")
			});
			return null;
		}
	},
	
	/**
	 * Delete WBS item
	 */
	deleteItem: async function(name, delete_children = true) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.delete_wbs_item",
				args: { name, delete_children },
				freeze: true,
				freeze_message: __("Deleting...")
			});
			return response.message;
		} catch (error) {
			frappe.msgprint({
				title: __("Error"),
				indicator: "red",
				message: error.message || __("Failed to delete WBS item")
			});
			return null;
		}
	},
	
	/**
	 * Move WBS item to new parent
	 */
	moveItem: async function(name, new_parent) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.move_wbs_item",
				args: { name, new_parent },
				freeze: true,
				freeze_message: __("Moving item...")
			});
			return response.message;
		} catch (error) {
			frappe.msgprint({
				title: __("Error"),
				indicator: "red",
				message: error.message || __("Failed to move WBS item")
			});
			return null;
		}
	},
	
	/**
	 * Duplicate WBS item
	 */
	duplicateItem: async function(name, new_name, include_children = true, target_parent = null) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.duplicate_wbs_item",
				args: { name, new_name, include_children, target_parent },
				freeze: true,
				freeze_message: __("Duplicating...")
			});
			return response.message;
		} catch (error) {
			frappe.msgprint({
				title: __("Error"),
				indicator: "red",
				message: error.message || __("Failed to duplicate WBS item")
			});
			return null;
		}
	},
	
	/**
	 * Distribute amount to children (Up-Down calculation)
	 */
	distributeAmount: async function(name, new_amount) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.distribute_amount",
				args: { name, new_amount },
				freeze: true,
				freeze_message: __("Distributing amount...")
			});
			return response.message;
		} catch (error) {
			frappe.msgprint({
				title: __("Error"),
				indicator: "red",
				message: error.message || __("Failed to distribute amount")
			});
			return null;
		}
	},
	
	/**
	 * Get WBS summary statistics
	 */
	getSummary: async function(quotation_name) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.get_wbs_summary",
				args: { quotation_name },
				freeze: false
			});
			return response.message || {};
		} catch (error) {
			console.error("Error fetching WBS summary:", error);
			return {};
		}
	},
	
	/**
	 * Sync quotation total with WBS grand total
	 */
	syncTotal: async function(quotation_name) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.sync_quotation_total",
				args: { quotation_name },
				freeze: true,
				freeze_message: __("Syncing totals...")
			});
			return response.message;
		} catch (error) {
			console.error("Error syncing total:", error);
			return null;
		}
	},
	
	/**
	 * Bulk add WBS items
	 */
	bulkAddItems: async function(quotation, parent_item, items) {
		try {
			const response = await frappe.call({
				method: "propasal.propasal.proposal_wbs_api.bulk_add_wbs_items",
				args: { quotation, parent_item, items: JSON.stringify(items) },
				freeze: true,
				freeze_message: __("Adding items...")
			});
			return response.message;
		} catch (error) {
			frappe.msgprint({
				title: __("Error"),
				indicator: "red",
				message: error.message || __("Failed to add items")
			});
			return null;
		}
	}
};


// ============================================================================
// WBS TREE CLASS
// ============================================================================

propasal.wbs.WBSTree = class WBSTree {
	constructor(options) {
		this.$wrapper = options.wrapper;
		this.frm = options.frm;
		this.quotation_name = options.quotation_name || (this.frm && this.frm.doc.name);
		this.currency = options.currency || (this.frm && this.frm.doc.currency) || "EGP";
		this.readonly = options.readonly || false;
		
		this.nodes = new Map();
		this.expandedNodes = new Set();
		this.selectedNode = null;
		this.defaultExpandAll = true;
		
		this.init();
	}
	
	async init() {
		this.render();
		await this.loadTree();
		this.bindEvents();
	}
	
	// ========================================================================
	// LOAD DATA
	// ========================================================================
	
	async loadTree() {
		if (!this.quotation_name || this.quotation_name === "new" || 
		    String(this.quotation_name).startsWith("new-")) {
			this.renderSaveFirstMessage();
			return;
		}
		
		this.$content.html(`
			<div class="wbs-loading">
				<div class="spinner-border spinner-border-sm" role="status"></div>
				<span class="ml-2">${__("Loading WBS structure...")}</span>
			</div>
		`);
		
		const tree = await propasal.wbs.api.getTree(this.quotation_name);
		
		this.nodes.clear();
		this.processTreeData(tree);
		
		if (this.nodes.size === 0) {
			this.renderEmptyState();
		} else {
			this.renderTree();
		}
		
		this.updateStats();
	}
	
	processTreeData(items, depth = 0) {
		items.forEach(item => {
			this.nodes.set(item.name, {
				...item,
				depth: depth
			});
			
			// Auto-expand groups
			if (item.expandable || item.is_group) {
				this.expandedNodes.add(item.name);
			}
			
			// Process children recursively
			if (item.children && item.children.length > 0) {
				this.processTreeData(item.children, depth + 1);
			}
		});
	}
	
	// ========================================================================
	// RENDERING
	// ========================================================================
	
	render() {
		const readonlyClass = this.readonly ? "is-readonly" : "";
		
		this.$wrapper.html(`
			<div class="wbs-tree-modern ${readonlyClass}">
				${this.readonly ? this.renderReadonlyBanner() : ""}
				<div class="wbs-header">
					<div class="wbs-title">
						<svg class="wbs-title-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
						</svg>
						<span>${__("WBS Structure")}</span>
						<span class="wbs-item-count" id="wbs-item-count"></span>
					</div>
					${!this.readonly ? `
					<div class="wbs-actions-header">
						<button class="wbs-btn" data-action="collapse-all" title="${__("Collapse All")}">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 15l-6-6-6 6"/>
							</svg>
						</button>
						<button class="wbs-btn" data-action="expand-all" title="${__("Expand All")}">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M6 9l6 6 6-6"/>
							</svg>
						</button>
						<button class="wbs-btn" data-action="refresh" title="${__("Refresh")}">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
							</svg>
						</button>
						<button class="wbs-btn wbs-btn-primary" data-action="add-activity" title="${__("Add Activity")}">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 5v14M5 12h14"/>
							</svg>
							${__("Add Activity")}
						</button>
					</div>
					` : ""}
				</div>
				<div class="wbs-content" id="wbs-content"></div>
				<div class="wbs-footer">
					<div class="wbs-stats">
						<span class="wbs-stat" id="wbs-stat-activities">${__("Activities")}: 0</span>
						<span class="wbs-stat" id="wbs-stat-phases">${__("Phases")}: 0</span>
						<span class="wbs-stat" id="wbs-stat-tasks">${__("Tasks")}: 0</span>
					</div>
					<div class="wbs-grand-total">
						<span>${__("Grand Total")}:</span>
						<span class="wbs-total-amount" id="wbs-grand-total">0</span>
					</div>
				</div>
			</div>
		`);
		
		this.$content = this.$wrapper.find("#wbs-content");
		this.injectStyles();
	}
	
	renderReadonlyBanner() {
		return `
			<div class="wbs-readonly-banner">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
					<path d="M7 11V7a5 5 0 0110 0v4"/>
				</svg>
				<span>${__("View only - document is submitted/cancelled")}</span>
			</div>
		`;
	}
	
	renderSaveFirstMessage() {
		this.$content.html(`
			<div class="wbs-empty">
				<svg class="wbs-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
					<polyline points="17,21 17,13 7,13 7,21"/>
					<polyline points="7,3 7,8 15,8"/>
				</svg>
				<div class="wbs-empty-title">${__("Save Quotation First")}</div>
				<div class="wbs-empty-text">${__("Please save the quotation before adding WBS items")}</div>
			</div>
		`);
	}
	
	renderEmptyState() {
		this.$content.html(`
			<div class="wbs-empty">
				<svg class="wbs-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
				</svg>
				<div class="wbs-empty-title">${__("No WBS structure yet")}</div>
				<div class="wbs-empty-text">${__("Click 'Add Activity' to create your first WBS item")}</div>
			</div>
		`);
	}
	
	renderTree() {
		this.$content.empty();
		
		// Get root items (no parent)
		const rootItems = Array.from(this.nodes.values())
			.filter(node => !node.parent_proposal_wbs_item)
			.sort((a, b) => a.lft - b.lft);
		
		rootItems.forEach(node => {
			this.$content.append(this.renderNode(node, 0));
		});
	}
	
	renderNode(node, depth) {
		const level = (node.item_level || "task").toLowerCase();
		const isExpanded = this.expandedNodes.has(node.name);
		const hasChildren = node.expandable || node.is_group;
		
		const amount = this.formatCurrency(flt(node.amount) || 0);
		const weightPercent = flt(node.weight_in_parent_percent || 0).toFixed(1);
		const totalPercent = flt(node.total_project_percent || 0).toFixed(1);
		
		const paddingLeft = depth * 24;
		const budgetBadge = node.custom_is_fixed 
			? '<span class="wbs-budget-badge wbs-fixed">Fixed</span>' 
			: (node.is_group ? '<span class="wbs-budget-badge wbs-sum">Sum</span>' : '');
		
		const html = `
			<div class="wbs-node ${isExpanded ? "is-expanded" : ""}" 
				 data-name="${node.name}" 
				 data-level="${level}"
				 style="--depth: ${depth};">
				<div class="wbs-node-wrapper" style="padding-left: ${paddingLeft}px;">
					<div class="wbs-node-card" tabindex="0">
						<button class="wbs-expand-btn ${!hasChildren ? "is-hidden" : ""}" 
								data-action="toggle" 
								title="${isExpanded ? __("Collapse") : __("Expand")}">
							<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M9 18l6-6-6-6"/>
							</svg>
						</button>
						<div class="wbs-node-icon wbs-node-icon-${level}">
							${this.getLevelIcon(level)}
						</div>
						<div class="wbs-node-info">
							<span class="wbs-node-title">
								${frappe.utils.escape_html(node.item_name || node.item_code || "Unnamed")}
								<span class="wbs-node-level-badge">${level.charAt(0).toUpperCase()}</span>
								${budgetBadge}
							</span>
						</div>
						<div class="wbs-node-values">
							<div class="wbs-value wbs-value-percent">
								<span title="${__("Weight in parent")}">${weightPercent}%</span>
							</div>
							<div class="wbs-value wbs-value-total-percent">
								<span title="${__("Total project %")}">${totalPercent}%</span>
							</div>
							<div class="wbs-value wbs-value-amount">
								<span class="wbs-value-money">${amount}</span>
							</div>
						</div>
						${!this.readonly ? `
						<div class="wbs-node-actions">
							${hasChildren ? `
							<button class="wbs-action-btn" data-action="add-child" title="${__("Add Child")}">
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M12 5v14M5 12h14"/>
								</svg>
							</button>
							` : ""}
							${node.is_group ? `
							<button class="wbs-action-btn" data-action="bulk-add" title="${__("Bulk Add Tasks")}">
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
								</svg>
							</button>
							` : ""}
							<button class="wbs-action-btn" data-action="edit" title="${__("Edit")}">
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
									<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
								</svg>
							</button>
							<button class="wbs-action-btn" data-action="duplicate" title="${__("Duplicate")}">
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
									<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
								</svg>
							</button>
							<button class="wbs-action-btn action-delete" data-action="delete" title="${__("Delete")}">
								<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3,6 5,6 21,6"/>
									<path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
								</svg>
							</button>
						</div>
						` : ""}
					</div>
				</div>
				<div class="wbs-children" id="wbs-children-${node.name}"></div>
			</div>
		`;
		
		const $node = $(html);
		
		// Render children if expanded
		if (isExpanded && hasChildren) {
			const $children = $node.find(`#wbs-children-${node.name}`);
			this.renderChildren(node.name, depth + 1, $children);
		}
		
		return $node;
	}
	
	renderChildren(parentName, depth, $container) {
		const children = Array.from(this.nodes.values())
			.filter(n => n.parent_proposal_wbs_item === parentName)
			.sort((a, b) => a.lft - b.lft);
		
		children.forEach(child => {
			$container.append(this.renderNode(child, depth));
		});
	}
	
	getLevelIcon(level) {
		switch (level) {
			case "activity":
				return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
				</svg>`;
			case "phase":
				return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
					<rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
				</svg>`;
			default:
				return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
					<polyline points="14,2 14,8 20,8"/>
				</svg>`;
		}
	}
	
	formatCurrency(amount) {
		const formatted = format_currency(flt(amount), this.currency);
		return formatted || `${this.currency} 0`;
	}
	
	async updateStats() {
		if (!this.quotation_name || this.quotation_name === "new" ||
		    String(this.quotation_name).startsWith("new-")) return;
		
		const summary = await propasal.wbs.api.getSummary(this.quotation_name);
		
		this.$wrapper.find("#wbs-stat-activities").text(`${__("Activities")}: ${summary.activities || 0}`);
		this.$wrapper.find("#wbs-stat-phases").text(`${__("Phases")}: ${summary.phases || 0}`);
		this.$wrapper.find("#wbs-stat-tasks").text(`${__("Tasks")}: ${summary.tasks || 0}`);
		this.$wrapper.find("#wbs-item-count").text(`(${summary.total_items || 0})`);
		this.$wrapper.find("#wbs-grand-total").text(this.formatCurrency(summary.grand_total || 0));
	}
	
	// ========================================================================
	// EVENT HANDLERS
	// ========================================================================
	
	bindEvents() {
		const self = this;
		
		// Remove existing handlers to prevent duplicates
		this.$wrapper.off("click", "[data-action]");
		
		// Header and node actions
		this.$wrapper.on("click", "[data-action]", function(e) {
			e.stopPropagation();
			const action = $(this).data("action");
			const $node = $(this).closest(".wbs-node");
			const nodeName = $node.data("name");
			
			switch (action) {
				case "add-activity":
					self.showAddDialog(null, true);
					break;
				case "add-child":
					self.showAddChildDialog(nodeName);
					break;
				case "bulk-add":
					self.showBulkAddDialog(nodeName);
					break;
				case "toggle":
					self.toggleNode(nodeName);
					break;
				case "expand-all":
					self.expandAll();
					break;
				case "collapse-all":
					self.collapseAll();
					break;
				case "refresh":
					self.loadTree();
					break;
				case "edit":
					self.showEditDialog(nodeName);
					break;
				case "duplicate":
					self.showDuplicateDialog(nodeName);
					break;
				case "delete":
					self.confirmDelete(nodeName);
					break;
			}
		});
	}
	
	toggleNode(name) {
		if (this.expandedNodes.has(name)) {
			this.expandedNodes.delete(name);
		} else {
			this.expandedNodes.add(name);
		}
		this.renderTree();
	}
	
	expandAll() {
		this.nodes.forEach((node, name) => {
			if (node.is_group || node.expandable) {
				this.expandedNodes.add(name);
			}
		});
		this.renderTree();
	}
	
	collapseAll() {
		this.expandedNodes.clear();
		this.renderTree();
	}
	
	// ========================================================================
	// DIALOGS
	// ========================================================================
	
	showAddDialog(parentName, isRoot = false) {
		if (this.readonly) {
			frappe.msgprint(__("Cannot modify a submitted/cancelled document"));
			return;
		}
		
		const self = this;
		const parentNode = parentName ? this.nodes.get(parentName) : null;
		const parentAmount = parentNode ? flt(parentNode.amount) : 0;
		const parentIsFixed = parentNode ? parentNode.custom_is_fixed : false;
		
		// UNLIMITED NESTING: Allow any level under any parent
		let levelOptions = ["Activity", "Phase", "Task"];
		if (isRoot) {
			levelOptions = ["Activity"];  // Root must be Activity
		}
		
		const fields = [
			{
				label: __("Item Name"),
				fieldname: "item_name",
				fieldtype: "Data",
				reqd: 1
			},
			{
				label: __("Item Code"),
				fieldname: "item_code",
				fieldtype: "Link",
				options: "Item",
				get_query: () => ({
					filters: { "is_stock_item": 0, "is_sales_item": 1 }
				}),
				onchange: function() {
					const item_code = this.get_value();
					if (item_code) {
						frappe.db.get_value("Item", item_code, ["item_name", "description"])
							.then(r => {
								if (r.message) {
									this.layout.set_value("item_name", r.message.item_name || "");
									this.layout.set_value("description", r.message.description || "");
								}
							});
					}
				}
			},
			{ fieldtype: "Column Break" },
			{
				label: __("Level"),
				fieldname: "item_level",
				fieldtype: "Select",
				options: levelOptions,
				default: levelOptions[0],
				reqd: 1,
				read_only: isRoot ? 1 : 0
			},
			{ fieldtype: "Section Break", label: __("Financials") }
		];
		
		// Show parent info and percentage field for non-root items
		if (!isRoot && parentNode) {
			fields.push({
				fieldtype: "HTML",
				fieldname: "parent_info",
				options: `<div class="alert alert-info" style="margin-bottom: 10px;">
					<strong>${__("Parent")}:</strong> ${frappe.utils.escape_html(parentNode.item_name || "Root")}<br>
					<strong>${__("Parent Amount")}:</strong> ${self.formatCurrency(parentAmount)}
					${parentIsFixed ? `<br><span class="text-warning"><strong>${__("Fixed Budget")}</strong> - ${__("Children cannot exceed this amount")}</span>` : ""}
				</div>`
			});
			
			fields.push({
				label: __("Weight in Parent (%)"),
				fieldname: "weight_in_parent_percent",
				fieldtype: "Percent",
				default: 0,
				description: __("Enter percentage to auto-calculate amount, or enter amount directly below")
			});
		}
		
		fields.push({
			label: __("Amount"),
			fieldname: "amount",
			fieldtype: "Currency",
			default: 0
		});
		
		fields.push({ fieldtype: "Column Break" });
		
		fields.push({
			label: __("Is Fixed Amount"),
			fieldname: "custom_is_fixed",
			fieldtype: "Check",
			default: 0,
			description: __("If checked, children cannot exceed this amount")
		});
		
		fields.push({ fieldtype: "Section Break" });
		
		fields.push({
			label: __("Description"),
			fieldname: "description",
			fieldtype: "Small Text"
		});
		
		const dialog = new frappe.ui.Dialog({
			title: isRoot ? __("Add Activity") : __("Add WBS Item"),
			fields: fields,
			primary_action_label: __("Add"),
			primary_action: async function(values) {
				dialog.hide();
				
				const result = await propasal.wbs.api.addItem({
					quotation: self.quotation_name,
					parent_item: parentName,
					item_name: values.item_name,
					item_code: values.item_code,
					item_level: values.item_level,
					amount: flt(values.amount) || 0,
					weight_in_parent_percent: flt(values.weight_in_parent_percent) || 0,
					custom_is_fixed: values.custom_is_fixed ? 1 : 0,
					description: values.description
				});
				
				if (result && result.success) {
					frappe.show_alert({
						message: __("WBS item added successfully"),
						indicator: "green"
					});
					await self.loadTree();
					
					// Refresh quotation form to update totals
					if (self.frm) {
						self.frm.reload_doc();
					}
				}
			}
		});
		
		// Real-time sync between percentage and amount
		if (!isRoot && parentNode && parentAmount > 0) {
			dialog.fields_dict.weight_in_parent_percent.$input.on("change", function() {
				const percent = flt(dialog.get_value("weight_in_parent_percent"));
				if (percent > 0) {
					const calculated = (percent / 100) * parentAmount;
					dialog.set_value("amount", flt(calculated, 2));
				}
			});
			
			dialog.fields_dict.amount.$input.on("change", function() {
				const amount = flt(dialog.get_value("amount"));
				if (amount > 0) {
					const calculated = (amount / parentAmount) * 100;
					dialog.set_value("weight_in_parent_percent", flt(calculated, 2));
				}
			});
		}
		
		dialog.show();
	}
	
	showAddChildDialog(parentName) {
		this.showAddDialog(parentName, false);
	}
	
	async showBulkAddDialog(parentName) {
		if (this.readonly) {
			frappe.msgprint(__("Cannot modify a submitted/cancelled document"));
			return;
		}
		const parentNode = this.nodes.get(parentName);
		if (!parentNode) return;
		
		const self = this;
		const parentAmount = flt(parentNode.amount) || 0;
		const parentIsFixed = parentNode.custom_is_fixed || false;
		const parentLabel = parentNode.item_name || __("Parent");
		
		// Track existing items for update/delete
		let existingItems = [];
		let deletedItems = [];
		let rowCounter = 0;
		
		// Fetch existing children of this parent
		const children = Array.from(this.nodes.values())
			.filter(n => n.parent_proposal_wbs_item === parentName)
			.sort((a, b) => (a.lft || 0) - (b.lft || 0));
		
		existingItems = children.map(c => c.name);
		
		// Create row - can be empty or pre-populated with existing data
		function makeRow(data = null) {
			rowCounter++;
			const idx = rowCounter;
			const wbsName = data ? data.name : "";
			const itemCode = data ? (data.item_code || "") : "";
			const itemName = data ? (data.item_name || "") : "";
			const desc = data ? (data.description || "") : "";
			const pct = data ? flt(data.weight_in_parent_percent || 0).toFixed(2) : "";
			const amount = data ? flt(data.amount || 0).toFixed(2) : "";
			const isExisting = !!wbsName;
			
			return `
				<tr data-idx="${idx}" data-wbs-name="${wbsName}" class="${isExisting ? 'existing-row' : 'new-row'}">
					<td class="col-idx text-center text-muted">${idx}</td>
					<td>
						<div class="link-field" style="position:relative;">
							<input type="text" class="form-control input-sm bulk-item-code" value="${frappe.utils.escape_html(itemCode)}" placeholder="${__("Search Item...")}" data-idx="${idx}" autocomplete="off"/>
							<span class="link-btn" style="position:absolute; right:5px; top:50%; transform:translateY(-50%); color:#8d99a6;">
								<i class="fa fa-link fa-sm"></i>
							</span>
						</div>
					</td>
					<td><input type="text" class="form-control input-sm bulk-item-name" value="${frappe.utils.escape_html(itemName)}" placeholder="" data-idx="${idx}"/></td>
					<td><input type="text" class="form-control input-sm bulk-desc" value="${frappe.utils.escape_html(desc)}" placeholder="" data-idx="${idx}"/></td>
					<td><input type="number" class="form-control input-sm bulk-pct text-right" value="${pct}" step="0.01" min="0" placeholder="0" data-idx="${idx}"/></td>
					<td><input type="number" class="form-control input-sm bulk-amount text-right" value="${amount}" step="0.01" min="0" placeholder="0" data-idx="${idx}"/></td>
					<td class="text-center">
						<button type="button" class="btn btn-xs btn-danger bulk-delete-row" data-idx="${idx}" data-wbs-name="${wbsName}">
							<i class="fa fa-times"></i>
						</button>
					</td>
				</tr>
			`;
		}
		
		function updateTotals($dialog) {
			let totalPct = 0;
			let totalAmount = 0;
			$dialog.find(".bulk-grid tbody tr").each(function() {
				totalPct += flt($(this).find(".bulk-pct").val());
				totalAmount += flt($(this).find(".bulk-amount").val());
			});
			$dialog.find(".bulk-total-pct").text(totalPct.toFixed(2));
			$dialog.find(".bulk-total-amount").text(self.formatCurrency(totalAmount));
			
			const $warn = $dialog.find(".bulk-warnings");
			$warn.html("");
			if (totalPct > 100) {
				$warn.html(`<span class="text-warning">${__("Total % exceeds 100%")}</span>`);
			}
			if (parentIsFixed && parentAmount > 0 && totalAmount > parentAmount) {
				$warn.html(`<span class="text-danger">${__("Total exceeds budget!")}</span>`);
			}
		}
		
		// Setup awesomplete for Link field
		function setupLinkField($input) {
			if ($input.data("awesomplete-setup")) return;
			$input.data("awesomplete-setup", true);
			
			const awesomplete = new Awesomplete($input.get(0), {
				minChars: 0,
				maxItems: 10,
				autoFirst: true,
				list: []
			});
			
			$input.on("input", frappe.utils.debounce(function() {
				const txt = $input.val();
				frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Item",
						filters: [
							["is_stock_item", "=", 0],
							["is_sales_item", "=", 1],
							["name", "like", `%${txt}%`]
						],
						fields: ["name", "item_name"],
						limit_page_length: 10
					},
					async: true,
					callback: function(r) {
						if (r.message) {
							awesomplete.list = r.message.map(d => ({
								label: `${d.name} : ${d.item_name}`,
								value: d.name
							}));
							if (r.message.length && txt) awesomplete.evaluate();
						}
					}
				});
			}, 300));
			
			$input.on("awesomplete-select", function(e) {
				const selected = e.originalEvent.text;
				$input.val(selected.value);
				const $row = $input.closest("tr");
				frappe.db.get_value("Item", selected.value, ["item_name", "description"]).then(r => {
					if (r.message) {
						$row.find(".bulk-item-name").val(r.message.item_name || "");
						$row.find(".bulk-desc").val(r.message.description || "");
					}
				});
				e.preventDefault();
				return false;
			});
			
			$input.on("focus", function() {
				if (!$input.val()) $input.trigger("input");
			});
		}
		
		function bindEvents($dialog) {
			$dialog.find(".bulk-item-code").each(function() {
				setupLinkField($(this));
			});
			
			$dialog.find(".bulk-pct").off("change").on("change", function() {
				const pct = flt($(this).val());
				if (parentAmount > 0) {
					$(this).closest("tr").find(".bulk-amount").val((pct / 100 * parentAmount).toFixed(2));
				}
				updateTotals($dialog);
			});
			$dialog.find(".bulk-amount").off("change").on("change", function() {
				const amt = flt($(this).val());
				if (parentAmount > 0) {
					$(this).closest("tr").find(".bulk-pct").val((amt / parentAmount * 100).toFixed(2));
				}
				updateTotals($dialog);
			});
		}
		
		function reindexRows($dialog) {
			let idx = 0;
			$dialog.find(".bulk-grid tbody tr").each(function() {
				idx++;
				$(this).attr("data-idx", idx);
				$(this).find(".col-idx").text(idx);
			});
			rowCounter = idx;
		}
		
		// Generate initial rows - existing children first, then empty rows if none
		let initialRows = "";
		if (children.length > 0) {
			children.forEach(child => {
				initialRows += makeRow(child);
			});
		}
		// Always add a few empty rows for new entries
		for (let i = 0; i < 3; i++) {
			initialRows += makeRow();
		}
		
		const hasExisting = children.length > 0;
		const dialogTitle = hasExisting ? __("Edit / Add Tasks") : __("Bulk Add Tasks");
		const actionLabel = hasExisting ? __("Save Changes") : __("Add All Items");
		
		const dialog = new frappe.ui.Dialog({
			title: dialogTitle,
			size: "extra-large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "bulk_content",
					options: `
						<div class="bulk-add-container">
							<div class="bulk-parent-info" style="margin-bottom:15px; padding:10px 15px; background:#f0f4f7; border-radius:4px;">
								<strong>${__("Parent")}:</strong> ${frappe.utils.escape_html(parentLabel)} &nbsp;&nbsp;|&nbsp;&nbsp;
								<strong>${__("Budget")}:</strong> ${self.formatCurrency(parentAmount)} &nbsp;&nbsp;
								${parentIsFixed ? `<span class="indicator-pill yellow">${__("Fixed")}</span>` : `<span class="indicator-pill blue">${__("Cumulative")}</span>`}
								${hasExisting ? `&nbsp;&nbsp;<span class="indicator-pill green">${children.length} ${__("existing items")}</span>` : ""}
							</div>
							
							<div class="frappe-list">
								<table class="table table-bordered bulk-grid" style="margin-bottom:0;">
									<thead>
										<tr style="background:#f7f7f7;">
											<th style="width:40px;" class="text-center">#</th>
											<th style="width:150px;">${__("Phase Code")}</th>
											<th style="width:200px;">${__("Phase Name")} <span class="text-danger">*</span></th>
											<th>${__("Description")}</th>
											<th style="width:100px;" class="text-right">${__("Weight %")}</th>
											<th style="width:130px;" class="text-right">${__("Amount")}</th>
											<th style="width:40px;"></th>
										</tr>
									</thead>
									<tbody>
										${initialRows}
									</tbody>
								</table>
							</div>
							
							<div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
								<button type="button" class="btn btn-default btn-sm bulk-add-row-btn">
									<i class="fa fa-plus"></i> ${__("Add Row")}
								</button>
								<div>
									<strong>${__("Total")}:</strong> 
									<span class="bulk-total-pct">0</span>% &nbsp;|&nbsp; 
									<span class="bulk-total-amount">${self.formatCurrency(0)}</span>
									<span class="bulk-warnings" style="margin-left:10px;"></span>
								</div>
							</div>
						</div>
						<style>
							.bulk-grid .existing-row { background-color: #f8fff8; }
							.bulk-grid .new-row { background-color: #fffff8; }
						</style>
					`
				}
			],
			primary_action_label: actionLabel,
			primary_action: async function() {
				const toUpdate = [];
				const toCreate = [];
				
				dialog.$wrapper.find(".bulk-grid tbody tr").each(function() {
					const item_name = $(this).find(".bulk-item-name").val();
					if (!item_name || !String(item_name).trim()) return;
					
					const wbsName = $(this).attr("data-wbs-name");
					const rowData = {
						item_code: $(this).find(".bulk-item-code").val() || null,
						item_name: String(item_name).trim(),
						description: $(this).find(".bulk-desc").val() || "",
						weight_in_parent_percent: flt($(this).find(".bulk-pct").val()) || 0,
						amount: flt($(this).find(".bulk-amount").val()) || 0
					};
					
					if (wbsName) {
						// Existing item - update
						toUpdate.push({ name: wbsName, ...rowData });
					} else {
						// New item - create
						toCreate.push(rowData);
					}
				});
				
				if (toUpdate.length === 0 && toCreate.length === 0) {
					frappe.msgprint(__("No items to save"));
					return;
				}
				
				const totalAmount = [...toUpdate, ...toCreate].reduce((s, r) => s + flt(r.amount), 0);
				if (parentIsFixed && parentAmount > 0 && totalAmount > parentAmount + 0.01) {
					frappe.msgprint(__("Total exceeds fixed budget"));
					return;
				}
				
				dialog.hide();
				frappe.show_progress(__("Saving..."), 0, 100);
				
				try {
					// Delete removed items
					for (const name of deletedItems) {
						await propasal.wbs.api.deleteItem(name, true);
					}
					
					// Update existing items
					for (const item of toUpdate) {
						await propasal.wbs.api.updateItem(item.name, item);
					}
					
					// Create new items
					if (toCreate.length > 0) {
						await propasal.wbs.api.bulkAddItems(self.quotation_name, parentName, toCreate);
					}
					
					frappe.show_progress(__("Saving..."), 100, 100);
					frappe.show_alert({ message: __("Changes saved successfully"), indicator: "green" });
					await self.loadTree();
					if (self.frm) self.frm.reload_doc();
				} catch (e) {
					frappe.msgprint(__("Error saving: ") + (e.message || e));
				}
				frappe.hide_progress();
			}
		});
		
		dialog.show();
		
		const $dialog = dialog.$wrapper;
		
		// Add new row
		$dialog.find(".bulk-add-row-btn").on("click", function() {
			$dialog.find(".bulk-grid tbody").append(makeRow());
			reindexRows($dialog);
			bindEvents($dialog);
		});
		
		// Delete row - track if it's an existing item
		$dialog.on("click", ".bulk-delete-row", function() {
			const wbsName = $(this).attr("data-wbs-name");
			if (wbsName) {
				deletedItems.push(wbsName);
			}
			$(this).closest("tr").remove();
			reindexRows($dialog);
			updateTotals($dialog);
		});
		
		bindEvents($dialog);
		updateTotals($dialog);
	}
	
	showEditDialog(nodeName) {
		const self = this;
		const node = this.nodes.get(nodeName);
		if (!node) return;
		
		const parentNode = node.parent_proposal_wbs_item ? this.nodes.get(node.parent_proposal_wbs_item) : null;
		const parentAmount = parentNode ? flt(parentNode.amount) : 0;
		const isCumulativeGroup = node.is_group && !node.custom_is_fixed;
		
		const fields = [
			{
				label: __("Item Name"),
				fieldname: "item_name",
				fieldtype: "Data",
				reqd: 1,
				default: node.item_name
			},
			{
				label: __("Item Code"),
				fieldname: "item_code",
				fieldtype: "Link",
				options: "Item",
				default: node.item_code,
				get_query: () => ({
					filters: { "is_stock_item": 0, "is_sales_item": 1 }
				}),
				onchange: function() {
					const item_code = this.get_value();
					if (item_code) {
						frappe.db.get_value("Item", item_code, ["item_name", "description"])
							.then(r => {
								if (r.message) {
									this.layout.set_value("item_name", r.message.item_name || "");
									this.layout.set_value("description", r.message.description || "");
								}
							});
					}
				}
			},
			{ fieldtype: "Column Break" },
			{
				label: __("Level"),
				fieldname: "item_level",
				fieldtype: "Select",
				options: ["Activity", "Phase", "Task"],
				default: node.item_level,
				reqd: 1
			},
			{ fieldtype: "Section Break", label: __("Financials") }
		];
		
		// Show parent info for non-root items
		if (parentNode) {
			fields.push({
				fieldtype: "HTML",
				fieldname: "parent_info",
				options: `<div class="alert alert-info" style="margin-bottom: 10px;">
					<strong>${__("Parent")}:</strong> ${frappe.utils.escape_html(parentNode.item_name || "Root")}<br>
					<strong>${__("Parent Amount")}:</strong> ${self.formatCurrency(parentAmount)}
				</div>`
			});
			
			fields.push({
				label: __("Weight in Parent (%)"),
				fieldname: "weight_in_parent_percent",
				fieldtype: "Percent",
				default: node.weight_in_parent_percent || 0,
				description: __("Change percentage to recalculate amount")
			});
		}
		
		fields.push({
			label: __("Amount"),
			fieldname: "amount",
			fieldtype: "Currency",
			default: node.amount || 0,
			read_only: isCumulativeGroup ? 1 : 0,
			description: isCumulativeGroup ? __("Amount is auto-calculated from children for cumulative groups") : ""
		});
		
		fields.push({ fieldtype: "Column Break" });
		
		fields.push({
			label: __("Is Fixed Amount"),
			fieldname: "custom_is_fixed",
			fieldtype: "Check",
			default: node.custom_is_fixed || 0,
			description: __("If checked, children cannot exceed this amount")
		});
		
		fields.push({ fieldtype: "Section Break" });
		
		fields.push({
			label: __("Description"),
			fieldname: "description",
			fieldtype: "Small Text",
			default: node.description
		});
		
		const dialog = new frappe.ui.Dialog({
			title: __("Edit WBS Item"),
			fields: fields,
			primary_action_label: __("Save"),
			primary_action: async function(values) {
				dialog.hide();
				
				const result = await propasal.wbs.api.updateItem(nodeName, {
					item_name: values.item_name,
					item_code: values.item_code,
					item_level: values.item_level,
					amount: flt(values.amount) || 0,
					weight_in_parent_percent: flt(values.weight_in_parent_percent) || 0,
					custom_is_fixed: values.custom_is_fixed ? 1 : 0,
					description: values.description
				});
				
				if (result && result.success) {
					frappe.show_alert({
						message: __("WBS item updated successfully"),
						indicator: "green"
					});
					await self.loadTree();
					
					if (self.frm) {
						self.frm.reload_doc();
					}
				}
			}
		});
		
		// Real-time sync
		if (parentNode && parentAmount > 0 && !isCumulativeGroup) {
			dialog.fields_dict.weight_in_parent_percent.$input.on("change", function() {
				const percent = flt(dialog.get_value("weight_in_parent_percent"));
				if (percent > 0) {
					const calculated = (percent / 100) * parentAmount;
					dialog.set_value("amount", flt(calculated, 2));
				}
			});
			
			dialog.fields_dict.amount.$input.on("change", function() {
				const amount = flt(dialog.get_value("amount"));
				if (amount > 0) {
					const calculated = (amount / parentAmount) * 100;
					dialog.set_value("weight_in_parent_percent", flt(calculated, 2));
				}
			});
		}
		
		dialog.show();
	}
	
	showDuplicateDialog(nodeName) {
		const self = this;
		const node = this.nodes.get(nodeName);
		if (!node) return;
		
		// Get list of group nodes for target parent selection
		const groupNodes = Array.from(this.nodes.values())
			.filter(n => n.is_group && n.name !== nodeName)
			.map(n => n.name);
		
		const dialog = new frappe.ui.Dialog({
			title: __("Duplicate WBS Item"),
			fields: [
				{
					label: __("New Name"),
					fieldname: "new_name",
					fieldtype: "Data",
					default: `${node.item_name} (Copy)`,
					reqd: 1
				},
				{
					label: __("Include Children"),
					fieldname: "include_children",
					fieldtype: "Check",
					default: 1,
					description: __("If checked, all children will be duplicated as well")
				},
				{
					label: __("Copy To Different Parent"),
					fieldname: "target_parent",
					fieldtype: "Link",
					options: "Proposal WBS Item",
					get_query: () => ({
						filters: {
							"quotation": self.quotation_name,
							"is_group": 1,
							"name": ["!=", nodeName]
						}
					}),
					description: __("Leave empty to duplicate under same parent")
				}
			],
			primary_action_label: __("Duplicate"),
			primary_action: async function(values) {
				dialog.hide();
				
				const result = await propasal.wbs.api.duplicateItem(
					nodeName,
					values.new_name,
					values.include_children,
					values.target_parent || null
				);
				
				if (result && result.success) {
					frappe.show_alert({
						message: __("WBS item duplicated successfully"),
						indicator: "green"
					});
					await self.loadTree();
					
					if (self.frm) {
						self.frm.reload_doc();
					}
				}
			}
		});
		
		dialog.show();
	}
	
	confirmDelete(nodeName) {
		const self = this;
		const node = this.nodes.get(nodeName);
		if (!node) return;
		
		const hasChildren = node.is_group || node.expandable;
		
		frappe.confirm(
			hasChildren 
				? __("This will delete '{0}' and all its children. Continue?", [node.item_name])
				: __("Delete '{0}'?", [node.item_name]),
			async function() {
				const result = await propasal.wbs.api.deleteItem(nodeName, true);
				
				if (result && result.success) {
					frappe.show_alert({
						message: __("WBS item deleted"),
						indicator: "green"
					});
					await self.loadTree();
					
					if (self.frm) {
						self.frm.reload_doc();
					}
				}
			}
		);
	}
	
	// ========================================================================
	// STYLES
	// ========================================================================
	
	injectStyles() {
		if (document.getElementById("wbs-tree-styles")) return;
		
		const style = document.createElement("style");
		style.id = "wbs-tree-styles";
		style.textContent = `
			.wbs-tree-modern {
				background: #fff;
				border: 1px solid #e2e8f0;
				border-radius: 8px;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
				font-size: 13px;
				min-height: 300px;
			}
			.wbs-tree-modern .wbs-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 12px 16px;
				border-bottom: 1px solid #e2e8f0;
				background: #f8fafc;
				border-radius: 8px 8px 0 0;
			}
			.wbs-tree-modern .wbs-title {
				display: flex;
				align-items: center;
				gap: 8px;
				font-weight: 600;
				color: #1e293b;
			}
			.wbs-tree-modern .wbs-item-count { color: #64748b; font-weight: normal; }
			.wbs-tree-modern .wbs-actions-header { display: flex; gap: 8px; }
			.wbs-tree-modern .wbs-btn {
				display: flex;
				align-items: center;
				gap: 4px;
				padding: 6px 12px;
				border: 1px solid #e2e8f0;
				border-radius: 6px;
				background: #fff;
				cursor: pointer;
				font-size: 12px;
				transition: all 0.15s ease;
			}
			.wbs-tree-modern .wbs-btn:hover { background: #f1f5f9; }
			.wbs-tree-modern .wbs-btn-primary { background: #e94560; color: white; border: none; }
			.wbs-tree-modern .wbs-btn-primary:hover { background: #d63d56; }
			.wbs-tree-modern .wbs-content { padding: 8px; max-height: 70vh; overflow-y: auto; }
			.wbs-tree-modern .wbs-node { margin-bottom: 2px; }
			.wbs-tree-modern .wbs-node-wrapper { display: flex; }
			.wbs-tree-modern .wbs-node-card {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 8px 12px;
				background: #fff;
				border: 1px solid #e2e8f0;
				border-radius: 6px;
				flex: 1;
				transition: all 0.15s ease;
				cursor: pointer;
			}
			.wbs-tree-modern .wbs-node-card:hover {
				background: #f8fafc;
				border-color: #cbd5e1;
			}
			.wbs-tree-modern .wbs-expand-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 20px;
				height: 20px;
				border: none;
				background: transparent;
				cursor: pointer;
				padding: 0;
				border-radius: 4px;
				transition: all 0.15s ease;
			}
			.wbs-tree-modern .wbs-expand-btn:hover { background: #e2e8f0; }
			.wbs-tree-modern .wbs-expand-btn svg { transition: transform 0.15s ease; }
			.wbs-tree-modern .wbs-expand-btn.is-hidden { visibility: hidden; }
			.wbs-tree-modern .wbs-node.is-expanded > .wbs-node-wrapper .wbs-expand-btn svg { transform: rotate(90deg); }
			.wbs-tree-modern .wbs-node-icon {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 28px;
				height: 28px;
				border-radius: 6px;
				flex-shrink: 0;
			}
			.wbs-tree-modern .wbs-node-icon-activity { background: #dbeafe; color: #1d4ed8; }
			.wbs-tree-modern .wbs-node-icon-phase { background: #dcfce7; color: #15803d; }
			.wbs-tree-modern .wbs-node-icon-task { background: #fef3c7; color: #b45309; }
			.wbs-tree-modern .wbs-node-info { flex: 1; min-width: 0; }
			.wbs-tree-modern .wbs-node-title {
				display: flex;
				align-items: center;
				gap: 6px;
				font-weight: 500;
				color: #1e293b;
			}
			.wbs-tree-modern .wbs-node-level-badge {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				width: 18px;
				height: 18px;
				font-size: 10px;
				font-weight: 600;
				border-radius: 4px;
				background: #f1f5f9;
				color: #64748b;
			}
			.wbs-tree-modern .wbs-budget-badge {
				font-size: 9px;
				padding: 2px 6px;
				border-radius: 4px;
				font-weight: 600;
			}
			.wbs-tree-modern .wbs-budget-badge.wbs-fixed { background: #fee2e2; color: #dc2626; }
			.wbs-tree-modern .wbs-budget-badge.wbs-sum { background: #e0f2fe; color: #0369a1; }
			.wbs-tree-modern .wbs-node-values {
				display: flex;
				gap: 16px;
				align-items: center;
				flex-shrink: 0;
			}
			.wbs-tree-modern .wbs-value {
				text-align: right;
				font-size: 12px;
			}
			.wbs-tree-modern .wbs-value-percent { color: #64748b; min-width: 50px; }
			.wbs-tree-modern .wbs-value-total-percent { color: #94a3b8; min-width: 50px; }
			.wbs-tree-modern .wbs-value-amount { font-weight: 600; color: #0f172a; min-width: 100px; }
			.wbs-tree-modern .wbs-node-actions {
				display: flex;
				gap: 4px;
				opacity: 0;
				transition: opacity 0.15s ease;
			}
			.wbs-tree-modern .wbs-node-card:hover .wbs-node-actions { opacity: 1; }
			.wbs-tree-modern .wbs-action-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 26px;
				height: 26px;
				border: none;
				background: #f1f5f9;
				border-radius: 4px;
				cursor: pointer;
				color: #64748b;
				transition: all 0.15s ease;
			}
			.wbs-tree-modern .wbs-action-btn:hover { background: #e2e8f0; color: #1e293b; }
			.wbs-tree-modern .wbs-action-btn.action-delete:hover { background: #fee2e2; color: #dc2626; }
			.wbs-tree-modern .wbs-children { margin-left: 12px; border-left: 1px dashed #e2e8f0; }
			.wbs-tree-modern .wbs-footer {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 12px 16px;
				border-top: 1px solid #e2e8f0;
				background: #f8fafc;
				border-radius: 0 0 8px 8px;
			}
			.wbs-tree-modern .wbs-stats { display: flex; gap: 16px; }
			.wbs-tree-modern .wbs-stat { color: #64748b; font-size: 12px; }
			.wbs-tree-modern .wbs-grand-total { font-weight: 600; color: #0f172a; }
			.wbs-tree-modern .wbs-total-amount { font-size: 16px; color: #e94560; }
			.wbs-tree-modern .wbs-empty {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				padding: 48px;
				text-align: center;
			}
			.wbs-tree-modern .wbs-empty-icon { color: #94a3b8; margin-bottom: 16px; }
			.wbs-tree-modern .wbs-empty-title { font-weight: 600; color: #475569; margin-bottom: 4px; }
			.wbs-tree-modern .wbs-empty-text { color: #94a3b8; }
			.wbs-tree-modern .wbs-loading {
				display: flex;
				align-items: center;
				justify-content: center;
				padding: 48px;
				color: #64748b;
			}
			.wbs-tree-modern .wbs-readonly-banner {
				display: flex;
				align-items: center;
				gap: 8px;
				padding: 8px 16px;
				background: #fef3c7;
				color: #92400e;
				font-size: 12px;
				border-radius: 8px 8px 0 0;
			}
		`;
		document.head.appendChild(style);
	}
};


// ============================================================================
// INTEGRATION WITH QUOTATION FORM
// ============================================================================

/**
 * Check if WBS tree mode is enabled for a quotation
 */
propasal.wbs.isEnabled = function(frm) {
	return frm.doc.use_wbs_tree || frm.doc.root_wbs_item;
};

/**
 * Initialize WBS tree for quotation form
 */
propasal.wbs.initForQuotation = function(frm) {
	// Check for unsaved quotation
	if (frm.is_new()) {
		const $wrapper = $(frm.fields_dict.quotation_tree?.wrapper);
		if ($wrapper.length) {
			$wrapper.html(`
				<div class="wbs-tree-modern">
					<div class="wbs-empty">
						<svg class="wbs-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
							<polyline points="17,21 17,13 7,13 7,21"/>
							<polyline points="7,3 7,8 15,8"/>
						</svg>
						<div class="wbs-empty-title">${__("Save Quotation First")}</div>
						<div class="wbs-empty-text">${__("Please save the quotation before adding WBS items")}</div>
					</div>
				</div>
			`);
		}
		return null;
	}
	
	// Only initialize if WBS mode is enabled
	if (!propasal.wbs.isEnabled(frm)) {
		return null;
	}
	
	const $wrapper = $(frm.fields_dict.quotation_tree?.wrapper);
	if (!$wrapper.length) {
		console.warn("WBS Tree: quotation_tree HTML field not found");
		return null;
	}
	
	// Check for existing instance and cleanup
	if (propasal.wbs.currentTree && propasal.wbs.currentTree.quotation_name === frm.doc.name) {
		// Reuse existing instance, just reload
		propasal.wbs.currentTree.loadTree();
		return propasal.wbs.currentTree;
	}
	
	// Clear existing tree
	$wrapper.empty();
	
	// Create WBS tree instance
	const tree = new propasal.wbs.WBSTree({
		wrapper: $wrapper,
		frm: frm,
		quotation_name: frm.doc.name,
		currency: frm.doc.currency || "EGP",
		readonly: frm.doc.docstatus > 0
	});
	
	// Store instance for later access
	propasal.wbs.currentTree = tree;
	
	return tree;
};

/**
 * Enable WBS tree mode for a quotation
 * Shows a dialog to configure project budget type (fixed vs cumulative)
 */
propasal.wbs.enableForQuotation = async function(frm) {
	if (frm.is_new()) {
		frappe.msgprint(__("Please save the quotation first before enabling WBS tree"));
		return;
	}
	
	// Show project setup dialog
	const dialog = new frappe.ui.Dialog({
		title: __("Setup Project Budget"),
		fields: [
			{
				label: __("Project Name"),
				fieldname: "project_name",
				fieldtype: "Data",
				reqd: 1,
				default: frm.doc.custom_proposal_name || frm.doc.title || `Project - ${frm.doc.name}`
			},
			{
				fieldtype: "Section Break",
				label: __("Budget Type")
			},
			{
				label: __("Fixed Project Budget"),
				fieldname: "is_project_fixed",
				fieldtype: "Check",
				default: 0,
				description: __("If checked, you must define the total project budget. All activities must fit within this budget.")
			},
			{
				label: __("Project Total Amount"),
				fieldname: "project_total_amount",
				fieldtype: "Currency",
				depends_on: "eval:doc.is_project_fixed",
				mandatory_depends_on: "eval:doc.is_project_fixed",
				description: __("Maximum budget for the entire project")
			},
			{
				fieldtype: "Section Break"
			},
			{
				fieldtype: "HTML",
				options: `
					<div class="alert alert-info" style="margin: 0;">
						<strong>${__("Budget Types:")}</strong><br>
						<b>${__("Fixed Budget")}:</b> ${__("Set a maximum project amount. Activities are entered as percentages of this budget.")}<br>
						<b>${__("Cumulative Budget")}:</b> ${__("Project total is automatically calculated as the sum of all activities.")}
					</div>
				`
			}
		],
		primary_action_label: __("Create Project"),
		primary_action: async function(values) {
			dialog.hide();
			
			// Create root WBS item with project settings
			const result = await propasal.wbs.api.createRoot(
				frm.doc.name,
				values.project_name
			);
			
			if (result && result.success) {
				// If project is fixed, update the root item
				if (values.is_project_fixed && values.project_total_amount > 0) {
					await propasal.wbs.api.updateItem(result.name, {
						custom_is_fixed: 1,
						amount: flt(values.project_total_amount)
					});
				}
				
				// Update quotation to use WBS tree
				await frm.set_value("use_wbs_tree", 1);
				await frm.set_value("root_wbs_item", result.name);
				await frm.save();
				
				frappe.show_alert({
					message: __("WBS tree enabled for this quotation"),
					indicator: "green"
				});
				
				// Initialize WBS tree
				propasal.wbs.initForQuotation(frm);
			}
		}
	});
	
	dialog.show();
};
