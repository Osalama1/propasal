// ============================================================================
// QUOTATION HIERARCHY TREE - Modern Design with FULL Functionality
// ERPNext v15 Compatible | Scalable for 200+ tasks, 100+ phases, 20+ activities
// Copyright (c) 2024, Propasal and contributors
// ============================================================================

frappe.provide("propasal.quotation");

// Inject critical CSS directly to ensure styles are applied
(function() {
	if (!document.getElementById('quotation-tree-inline-css')) {
		const style = document.createElement('style');
		style.id = 'quotation-tree-inline-css';
		style.textContent = `
			.quotation-tree-modern {
				--qt-activity-color: #e94560;
				--qt-phase-color: #00b4d8;
				--qt-task-color: #10b981;
				--qt-surface: #ffffff;
				--qt-surface-hover: #f8fafc;
				--qt-border: #e2e8f0;
				--qt-text: #1e293b;
				--qt-text-muted: #64748b;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
				background: #fff;
				border: 1px solid #e2e8f0;
				border-radius: 8px;
				font-size: 13px;
			}
			.quotation-tree-modern .qt-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 12px 16px;
				background: #f8fafc;
				border-bottom: 1px solid #e2e8f0;
				border-radius: 8px 8px 0 0;
			}
			.quotation-tree-modern .qt-title {
				display: flex;
				align-items: center;
				gap: 8px;
				font-size: 14px;
				font-weight: 600;
				color: #1e293b;
			}
			.quotation-tree-modern .qt-actions-header { display: flex; gap: 8px; }
			.quotation-tree-modern .tree-btn {
				padding: 6px 12px;
				font-size: 12px;
				background: #fff;
				border: 1px solid #e2e8f0;
				border-radius: 6px;
				cursor: pointer;
				display: inline-flex;
				align-items: center;
				gap: 6px;
				color: #1e293b;
			}
			.quotation-tree-modern .tree-btn:hover { background: #f1f5f9; }
			.quotation-tree-modern .tree-btn-primary { background: #e94560; color: white; border: none; }
			.quotation-tree-modern .tree-btn-primary:hover { background: #d63d56; }
			.quotation-tree-modern .qt-content { padding: 8px; max-height: 70vh; overflow-y: auto; }
			.quotation-tree-modern .qt-node { margin-bottom: 2px; }
			.quotation-tree-modern .qt-node-wrapper { display: flex; }
			.quotation-tree-modern .qt-node-card {
				display: flex;
				align-items: center;
				width: 100%;
				padding: 8px 12px;
				background: #fff;
				border: 1px solid transparent;
				border-radius: 6px;
				cursor: pointer;
				gap: 8px;
				transition: all 0.15s;
			}
			.quotation-tree-modern .qt-node-card:hover {
				background: #f8fafc;
				border-color: #e2e8f0;
			}
			.quotation-tree-modern .qt-expand-btn {
				width: 20px;
				height: 20px;
				display: flex;
				align-items: center;
				justify-content: center;
				background: transparent;
				border: none;
				cursor: pointer;
				color: #64748b;
				padding: 0;
				flex-shrink: 0;
			}
			.quotation-tree-modern .qt-expand-btn.is-hidden { visibility: hidden; }
			.quotation-tree-modern .qt-node.is-expanded > .qt-node-wrapper .qt-expand-btn svg { transform: rotate(90deg); }
			.quotation-tree-modern .qt-node-icon {
				width: 24px;
				height: 24px;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 6px;
				flex-shrink: 0;
			}
			.quotation-tree-modern .qt-node-icon-activity { background: rgba(233, 69, 96, 0.15); color: #e94560; }
			.quotation-tree-modern .qt-node-icon-phase { background: rgba(0, 180, 216, 0.15); color: #00b4d8; }
			.quotation-tree-modern .qt-node-icon-task { background: rgba(16, 185, 129, 0.15); color: #10b981; }
			.quotation-tree-modern .qt-node-info {
				flex: 1;
				min-width: 0;
				display: flex;
				align-items: center;
				gap: 8px;
			}
			.quotation-tree-modern .qt-node-title {
				font-size: 13px;
				font-weight: 500;
				color: #1e293b;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				display: flex;
				align-items: center;
				gap: 6px;
			}
			.quotation-tree-modern .qt-node-level-badge {
				font-size: 10px;
				padding: 2px 6px;
				border-radius: 4px;
				text-transform: uppercase;
				font-weight: 600;
			}
			.quotation-tree-modern .qt-node[data-level="activity"] .qt-node-level-badge { background: rgba(233, 69, 96, 0.1); color: #e94560; }
			.quotation-tree-modern .qt-node[data-level="phase"] .qt-node-level-badge { background: rgba(0, 180, 216, 0.1); color: #00b4d8; }
			.quotation-tree-modern .qt-node[data-level="task"] .qt-node-level-badge { background: rgba(16, 185, 129, 0.1); color: #10b981; }
			.quotation-tree-modern .qt-node-values {
				display: flex;
				align-items: center;
				gap: 16px;
				flex-shrink: 0;
				margin-left: auto;
			}
			.quotation-tree-modern .qt-value {
				display: flex;
				align-items: center;
				gap: 4px;
				min-width: 60px;
			}
			.quotation-tree-modern .qt-value-percent { font-size: 12px; color: #10b981; font-weight: 500; }
			.quotation-tree-modern .qt-value-amount { min-width: 100px; justify-content: flex-end; gap: 4px; }
			.quotation-tree-modern .qt-value-money { font-size: 13px; font-weight: 600; color: #1e293b; }
			.quotation-tree-modern .qt-discount-badge {
				font-size: 10px;
				font-weight: 600;
				color: #dc2626;
				background: #fef2f2;
				padding: 2px 6px;
				border-radius: 4px;
				margin-left: 4px;
			}
			.quotation-tree-modern .qt-gross-amount {
				font-size: 11px;
				color: #94a3b8;
				text-decoration: line-through;
				margin-right: 4px;
			}
			.quotation-tree-modern .qt-value-money.has-discount {
				color: #16a34a;
			}
			.quotation-tree-modern .qt-node-actions {
				display: flex;
				align-items: center;
				gap: 4px;
				opacity: 0;
				transition: opacity 0.15s;
			}
			.quotation-tree-modern .qt-node-card:hover .qt-node-actions { opacity: 1; }
			.quotation-tree-modern .qt-action-btn {
				width: 28px;
				height: 28px;
				display: flex;
				align-items: center;
				justify-content: center;
				background: transparent;
				border: none;
				border-radius: 4px;
				cursor: pointer;
				color: #64748b;
			}
			.quotation-tree-modern .qt-action-btn:hover { background: #f1f5f9; color: #3b82f6; }
			.quotation-tree-modern .qt-action-btn.action-delete:hover { color: #ef4444; }
			.quotation-tree-modern .qt-children {
				margin-left: 12px;
				padding-left: 16px;
				border-left: 2px dashed #e2e8f0;
				max-height: 0;
				opacity: 0;
				overflow: hidden;
				transition: max-height 0.2s, opacity 0.2s;
			}
			.quotation-tree-modern .qt-node.is-expanded > .qt-children {
				max-height: none;
				opacity: 1;
				padding-top: 4px;
			}
			.quotation-tree-modern .qt-totals {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 12px 16px;
				background: #f8fafc;
				border-top: 1px solid #e2e8f0;
				border-radius: 0 0 8px 8px;
			}
			.quotation-tree-modern .qt-totals-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
			.quotation-tree-modern .qt-totals-value { font-size: 16px; font-weight: 700; color: #1e293b; }
			.quotation-tree-modern .qt-totals-breakdown { font-size: 11px; color: #64748b; display: flex; gap: 8px; }
			.quotation-tree-modern .qt-totals-breakdown .badge-activity { color: #e94560; }
			.quotation-tree-modern .qt-totals-breakdown .badge-phase { color: #00b4d8; }
			.quotation-tree-modern .qt-totals-breakdown .badge-task { color: #10b981; }
			.quotation-tree-modern .qt-empty { padding: 40px; text-align: center; color: #64748b; }
			.quotation-tree-modern .qt-empty-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
			.quotation-tree-modern .qt-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 40px; color: #64748b; }
			.quotation-tree-modern .qt-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; }
			.quotation-tree-modern .qt-readonly-banner { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(245, 158, 11, 0.1); color: #f59e0b; font-size: 12px; }
			@keyframes qt-spin { to { transform: rotate(360deg); } }
			.quotation-tree-modern .qt-spinner { animation: qt-spin 0.8s linear infinite; }
		`;
		document.head.appendChild(style);
	}
})();

// ============================================================================
// FORM EVENT HANDLERS
// ============================================================================

frappe.ui.form.on("Quotation", {
	refresh(frm) {
		frm.trigger("setup_hierarchy_tree");
		frm.trigger("add_tree_buttons");
		
		if (frm.doc.docstatus === 0) {
			frm.trigger("setup_item_table_sync");
		}
	},
	
	setup_item_table_sync(frm) {
		frm.set_query("parent_activity", "items", function(doc, cdt, cdn) {
			let row = locals[cdt][cdn];
			return {
				query: "propasal.propasal.quotation_hierarchy.get_parent_items",
				filters: {
					'quotation': doc.name,
					'current_item': row.name,
					'is_expandable': 1
				}
			};
		});
		
		// Tree sync is handled by frappe.ui.form.on("Quotation Item", ...) events below
		// No need for additional grid event binding here
	},
	
	setup_hierarchy_tree(frm) {
		// Check if WBS tree mode is enabled
		if (propasal.wbs && propasal.wbs.isEnabled && propasal.wbs.isEnabled(frm)) {
			// Use WBS tree (Proposal WBS Item based)
			frm.trigger("build_wbs_tree");
			return;
		}
		
		// Use legacy mode (Quotation Item based)
		if (!propasal.quotation.TreeInstance || 
		    propasal.quotation.TreeInstance.docname !== frm.doc.name) {
			frm.trigger("build_hierarchy_tree");
		}
	},
	
	build_wbs_tree(frm) {
		// Initialize WBS tree component
		if (propasal.wbs && propasal.wbs.initForQuotation) {
			propasal.wbs.initForQuotation(frm);
		}
	},
	
	build_hierarchy_tree(frm) {
		let $wrapper = $(frm.fields_dict.quotation_tree?.wrapper);
		if (!$wrapper.length) return;
		
		$wrapper.empty();
		
		try {
			propasal.quotation.TreeInstance = new propasal.quotation.ModernTree({
				wrapper: $wrapper,
				frm: frm,
				docname: frm.doc.name || "new",
				currency: frm.doc.currency || "EGP",
				readonly: frm.doc.docstatus > 0,
				isNew: frm.is_new()
			});
		} catch (e) {
			console.error("Error creating tree:", e);
			$wrapper.html(`
				<div class="quotation-tree-modern">
					<div class="qt-empty">
						<div class="qt-empty-title">${__("Error")}</div>
						<div class="qt-empty-text">${e.message}</div>
					</div>
				</div>
			`);
		}
	},
	
	add_tree_buttons(frm) {
		if (frm.custom_buttons["Rebuild & Recalculate"]) return;
		
		// Show button directly (not under Tools dropdown)
		frm.add_custom_button(__("Rebuild & Recalculate"), () => {
			if (frm.doc.docstatus > 0) {
				// For submitted docs, just rebuild tree visually
				propasal.quotation.TreeInstance = null;
				frm.trigger("build_hierarchy_tree");
				frappe.show_alert({ message: __("Tree rebuilt"), indicator: "green" });
				return;
			}
			
			// For draft docs, recalculate on backend then rebuild tree
			frappe.call({
				method: "propasal.propasal.quotation_hierarchy.recalculate_quotation",
				args: { quotation_name: frm.doc.name },
				freeze: true,
				freeze_message: __("Recalculating..."),
				callback: (r) => {
					if (r.message && r.message.success) {
						// Reload the document to get fresh data
						frm.reload_doc().then(() => {
							// Rebuild tree with fresh data
							propasal.quotation.TreeInstance = null;
							frm.trigger("build_hierarchy_tree");
							frappe.show_alert({
								message: r.message.message || __("Recalculated successfully"),
								indicator: "green"
							});
						});
					}
				},
				error: (r) => {
					frappe.msgprint({
						title: __("Error"),
						indicator: "red",
						message: r.message || __("Failed to recalculate")
					});
				}
			});
		}).addClass("btn-primary-dark");
	},
	
	after_save(frm) {
		// Always rebuild tree after save to get latest calculated values
		if (propasal.quotation.TreeInstance) {
			// Update isNew flag since document is now saved
			propasal.quotation.TreeInstance.isNew = false;
			propasal.quotation.TreeInstance.docname = frm.doc.name;
			
			setTimeout(() => {
				// Reload tree to get server-calculated values
				propasal.quotation.TreeInstance.nodes.clear();
				propasal.quotation.TreeInstance.loadRootNodes();
			}, 300);
		}
		
		frm._needs_full_tree_rebuild = false;
	},
	
	grand_total(frm) {
		// Don't auto-save on grand_total change
	}
});

// Child table events
frappe.ui.form.on("Quotation Item", {
	// Sync tree INSTANTLY on any field change
	amount(frm, cdt, cdn) {
		console.log("💰 Amount changed");
		const row = locals[cdt][cdn];
		
		// When amount changes (either from Frappe auto-calculation or user edit),
		// recalculate percentage from amount (NOT from rate)
		// Skip if this change came from percentage handler (to avoid loop)
		if (!row._skip_percentage_recalc && row.parent_activity) {
			const parentLocal = locals["Quotation Item"]?.[row.parent_activity];
			if (parentLocal) {
				// Use net_amount if parent has discount (so percentage is of discounted amount)
				const parentAmount = flt(parentLocal.net_amount) || flt(parentLocal.calculated_amount) || flt(parentLocal.amount) || 0;
				const currentAmount = flt(row.amount) || 0;
				
				if (parentAmount > 0 && currentAmount > 0) {
					const newPercentage = (currentAmount / parentAmount) * 100;
					frappe.model.set_value(cdt, cdn, "contract_percentage", newPercentage);
				}
			}
		}
		
		// Clear the flag
		if (row._skip_percentage_recalc) {
			delete row._skip_percentage_recalc;
		}
		
		// Sync tree to reflect changes
		if (propasal.quotation.TreeInstance) {
			propasal.quotation.TreeInstance.syncFromDocument();
		}
	},
	
	rate(frm, cdt, cdn) {
		console.log("💵 Rate changed - user input");
		
		const row = locals[cdt][cdn];
		const rate = flt(row.rate) || 0;
		const qty = flt(row.qty) || 1;
		
		// Rate is USER INPUT - this is the source of truth
		// Calculate amount = rate × qty
		const newAmount = rate * qty;
		
		// When rate changes (user input), amount changes, and percentage will be recalculated
		// This is correct behavior: rate → amount → percentage (all derived correctly)
		frappe.model.set_value(cdt, cdn, "amount", newAmount);
		
		// Sync tree to reflect changes
		if (propasal.quotation.TreeInstance) {
			propasal.quotation.TreeInstance.syncFromDocument();
		}
	},
	
	contract_percentage(frm, cdt, cdn) {
		console.log("📊 Percentage changed");
		// RATE IS USER INPUT - NEVER CALCULATE IT HERE
		// The percentage field is for display/tracking purposes only
		// Rate should only be set by user directly or via dialogs
		// This handler should NOT modify rate - doing so causes cascade effects
		
		// Sync tree to reflect changes
		if (propasal.quotation.TreeInstance) {
			propasal.quotation.TreeInstance.syncFromDocument();
		}
	},
	
	qty(frm, cdt, cdn) {
		console.log("🔢 Qty changed");
		
		const row = locals[cdt][cdn];
		const rate = flt(row.rate) || 0;
		const qty = flt(row.qty) || 1;
		
		// Explicitly calculate amount = rate × qty
		// Rate is USER INPUT - never changes when qty changes
		const newAmount = rate * qty;
		
		// Note: We DON'T set _skip_percentage_recalc here because:
		// - When qty changes, amount changes (rate × qty)
		// - Percentage SHOULD be recalculated from new amount (amount / parent)
		// - This is mathematically correct behavior
		// The cascade is now safe because percentage handler no longer modifies rate
		frappe.model.set_value(cdt, cdn, "amount", newAmount);
		
		// Sync tree to reflect changes
		if (propasal.quotation.TreeInstance) {
			propasal.quotation.TreeInstance.syncFromDocument();
		}
	},
	
	item_code(frm, cdt, cdn) {
		console.log("📦 Item code changed");
		if (propasal.quotation.TreeInstance) {
			propasal.quotation.TreeInstance.syncFromDocument();
		}
	},
	
	item_name(frm, cdt, cdn) {
		console.log("📝 Item name changed");
		if (propasal.quotation.TreeInstance) {
			propasal.quotation.TreeInstance.syncFromDocument();
		}
	},
	
	item_level(frm) { frm._needs_full_tree_rebuild = true; },
	
	parent_activity(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (row.parent_activity) {
			let parent = frm.doc.items.find(i => i.name === row.parent_activity);
			if (parent) {
				frappe.model.set_value(cdt, cdn, "parent_row_no", parent.idx);
			}
		} else {
			frappe.model.set_value(cdt, cdn, "parent_row_no", 0);
		}
		frm._needs_full_tree_rebuild = true;
		// Also sync tree
		if (propasal.quotation.TreeInstance) {
			propasal.quotation.TreeInstance.syncFromDocument();
		}
	},
	
	items_add(frm, cdt, cdn) {
		let item = frappe.get_doc(cdt, cdn);
		if (!item.item_level) {
			frappe.model.set_value(cdt, cdn, "item_level", "Task");
		}
		// Sync tree when new item added
		setTimeout(() => {
			if (propasal.quotation.TreeInstance) {
				propasal.quotation.TreeInstance.syncFromDocument();
			}
		}, 100);
	},
	
	items_remove(frm) { 
		frm._needs_full_tree_rebuild = true;
		// Sync tree when item removed
		setTimeout(() => {
			if (propasal.quotation.TreeInstance) {
				propasal.quotation.TreeInstance.syncFromDocument();
			}
		}, 100);
	},
});

// ============================================================================
// MODERN TREE COMPONENT - Full Featured, Scalable
// ============================================================================

class ModernTree {
	constructor(options) {
		this.$wrapper = options.wrapper;
		this.frm = options.frm;
		this.docname = options.docname;
		this.currency = options.currency;
		this.readonly = options.readonly;
		this.isNew = options.isNew || false;
		this.defaultExpandAll = true;
		this.latestItems = [];
		
		this.nodes = new Map();
		this.expandedNodes = new Set();
		this.selectedNode = null;
		this.loadingNodes = new Set();
		
		// Performance: batch render for large trees
		this.renderQueue = [];
		this.isRendering = false;
		
		this.init();
	}
	
	init() {
		this.render();
		this.loadRootNodes();
		this.bindEvents();
	}
	
	// ========================================================================
	// REAL-TIME SYNC FROM DOCUMENT
	// ========================================================================
	
	syncFromDocument() {
		// SINGLE SOURCE OF TRUTH: Child Table Grid
		// Tree UI always reads from child table - never from cached data
		if (!this.frm || !this.frm.doc) return;
		
		console.log("⚡ Syncing tree from CHILD TABLE (single source of truth)...");
		
		// Preserve expansion state
		const previousExpanded = new Set(this.expandedNodes);
		
		// Clear nodes but NOT expanded state
		this.nodes.clear();
		
		// SINGLE SOURCE: Read directly from grid (child table)
		const items = [];
		const grid = this.frm.fields_dict.items?.grid;
		
		if (grid && grid.grid_rows) {
			grid.grid_rows.forEach(grid_row => {
				if (grid_row.doc && grid_row.doc.name) {
					// Read from locals (Frappe's real-time data store) - THE source of truth
					const localDoc = locals[grid_row.doc.doctype]?.[grid_row.doc.name];
					if (localDoc) {
						items.push(localDoc);
					} else {
						items.push(grid_row.doc);
					}
				}
			});
		}
		
		// Fallback only if grid is not available
		if (items.length === 0 && this.frm.doc.items) {
			this.frm.doc.items.forEach(item => {
				const localDoc = locals[item.doctype]?.[item.name];
				items.push(localDoc || item);
			});
		}
		
		this.latestItems = items;
		console.log(`📊 Tree: ${items.length} items from child table`);
		
		// Build parent map for auto-expand
		const parentSet = new Set();
		items.forEach(item => {
			if (item.parent_activity) {
				parentSet.add(item.parent_activity);
			}
		});

		// Build nodes from child table data
		items.forEach((item, index) => {
			const nodeData = {
				name: item.name,
				item_code: item.item_code,
				item_name: item.item_name,
				item_level: item.item_level || 'Task',
				parent_activity: item.parent_activity,
				contract_percentage: flt(item.contract_percentage) || 0,
				total_percentage: flt(item.total_percentage) || 0,
				amount: flt(item.amount) || 0,
				net_amount: flt(item.net_amount) || flt(item.amount) || 0,
				calculated_amount: flt(item.calculated_amount) || flt(item.amount) || 0,
				// Discount fields for display
				discount_percentage: flt(item.discount_percentage) || 0,
				discount_amount: flt(item.discount_amount) || 0,
				price_list_rate: flt(item.price_list_rate) || 0,
				rate: flt(item.rate) || 0,
				qty: flt(item.qty) || 1,
				custom_is_fixed: item.custom_is_fixed || 0,
				expandable: item.is_expandable || (item.item_level === 'Activity' || item.item_level === 'Phase'),
				is_expandable: item.is_expandable || (item.item_level === 'Activity' || item.item_level === 'Phase'),
				idx: item.idx
			};
			
			this.nodes.set(item.name, nodeData);
			
			// Restore previous expansion OR auto-expand if has children
			if (previousExpanded.has(item.name) || 
			    (this.defaultExpandAll && (nodeData.is_expandable || parentSet.has(item.name)))) {
				this.expandedNodes.add(item.name);
			}
		});
		
		// Re-render tree
		this.renderFromDocument();
		
		console.log("✅ Tree synced from child table!");
	}
	
	renderFromDocument() {
		// Render tree directly from document items
		const items = this.latestItems.length ? this.latestItems : (this.frm.doc.items || []);
		
		// Build parent-child relationships
		const rootItems = items.filter(i => !i.parent_activity);
		
		this.$content.empty();
		
		if (rootItems.length === 0 && items.length === 0) {
			this.$content.html(`
				<div class="qt-empty">
					<svg class="qt-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
					</svg>
					<div class="qt-empty-title">${__("No items yet")}</div>
					<div class="qt-empty-text">${__("Click 'Add Activity' to create your first hierarchy item")}</div>
				</div>
			`);
		} else {
			rootItems.forEach(item => {
				const node = this.nodes.get(item.name);
				if (node) {
					this.$content.append(this.renderNode(node, 0));
					// Render children recursively if expanded
					if (this.expandedNodes.has(item.name)) {
						this.renderChildrenFromDocument(item.name, 1);
					}
				}
			});
		}
		
		this.updateStats();
	}
	
	renderChildrenFromDocument(parentName, depth) {
		const items = this.latestItems.length ? this.latestItems : (this.frm.doc.items || []);
		const children = items.filter(i => i.parent_activity === parentName);
		
		const $children = this.$content.find(`#children-${parentName}`);
		$children.empty();
		
		children.forEach(item => {
			const node = this.nodes.get(item.name);
			if (node) {
				$children.append(this.renderNode(node, depth));
				// Render nested children if expanded
				if (this.expandedNodes.has(item.name)) {
					this.renderChildrenFromDocument(item.name, depth + 1);
				}
			}
		});
	}
	
	// ========================================================================
	// RENDERING
	// ========================================================================
	
	render() {
		const readonlyClass = this.readonly ? 'is-readonly' : '';
		
		this.$wrapper.html(`
			<div class="quotation-tree-modern ${readonlyClass}">
				${this.readonly ? this.renderReadonlyBanner() : ''}
				<div class="qt-header">
					<div class="qt-title">
						<svg class="qt-title-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
						</svg>
						<span>${__("Quotation Structure")}</span>
						<span class="qt-item-count" id="qt-item-count"></span>
					</div>
					${!this.readonly ? `
					<div class="qt-actions-header">
						<button class="tree-btn" data-action="collapse-all" title="${__('Collapse All')}">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 15l-6-6-6 6"/>
							</svg>
						</button>
						<button class="tree-btn" data-action="expand-all" title="${__('Expand All')}">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M6 9l6 6 6-6"/>
							</svg>
						</button>
						<button class="tree-btn" data-action="export-tasks" title="${__('Export to Task Doctype')}">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
							</svg>
							${__("Create Tasks")}
						</button>
						<button class="tree-btn tree-btn-primary" data-action="add-root">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 5v14m-7-7h14"/>
							</svg>
							${__("Add Activity")}
						</button>
					</div>
					` : ''}
				</div>
				<div class="qt-content" id="qt-content-${this.docname}">
					<div class="qt-loading">
						<div class="qt-loading-spinner"></div>
						<span>${__("Loading hierarchy...")}</span>
					</div>
				</div>
				<div class="qt-totals">
					<div class="qt-totals-info">
						<span class="qt-totals-label">${__("Grand Total")}</span>
						<span class="qt-totals-breakdown" id="tree-breakdown"></span>
					</div>
					<span class="qt-totals-value" id="tree-grand-total">-</span>
				</div>
			</div>
		`);
		
		this.$content = this.$wrapper.find(`#qt-content-${this.docname}`);
		this.$grandTotal = this.$wrapper.find('#tree-grand-total');
		this.$breakdown = this.$wrapper.find('#tree-breakdown');
		this.$itemCount = this.$wrapper.find('#qt-item-count');
	}
	
	renderReadonlyBanner() {
		const status = this.frm.doc.docstatus === 1 ? __("Submitted") : __("Cancelled");
		return `
			<div class="qt-readonly-banner">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
				</svg>
				<span>${__("Document is {0} - Tree is read-only", [status])}</span>
			</div>
		`;
	}
	
	renderNode(data, depth = 0) {
		const level = (data.item_level || 'task').toLowerCase();
		const isExpanded = this.expandedNodes.has(data.name);
		const hasChildren = data.expandable || data.is_expandable;
		const isFixed = data.custom_is_fixed;
		const isLoading = this.loadingNodes.has(data.name);
		
		// Use net_amount if available (reflects discounts), fallback to calculated_amount or amount
		const grossAmount = flt(data.calculated_amount) || flt(data.amount) || 0;
		const netAmount = flt(data.net_amount) || grossAmount;
		const discountAmt = flt(data.discount_amount) || 0;
		const discountPct = flt(data.discount_percentage) || 0;
		
		// Display amount is net_amount (after discount)
		const displayAmount = netAmount;
		const amount = this.formatCurrency(displayAmount);
		const contractPct = parseFloat(data.contract_percentage || 0).toFixed(1);
		const totalPct = parseFloat(data.total_percentage || 0).toFixed(1);
		
		// Check if item has discount (either percentage or amount)
		const hasDiscount = discountPct > 0 || discountAmt > 0;
		
		// Compact indentation
		const indent = depth * 16;
		
		// Level icon (simple)
		const levelIcon = level === 'activity' ? '📁' : level === 'phase' ? '📂' : '📄';
		
		return `
			<div class="qt-node ${isExpanded ? 'is-expanded' : ''} ${isLoading ? 'is-loading' : ''}" 
			     data-name="${data.name}" 
			     data-level="${level}"
			     data-expandable="${hasChildren ? '1' : '0'}"
			     data-depth="${depth}">
				<div class="qt-node-wrapper">
					<div class="qt-node-card" tabindex="0" draggable="${!this.readonly}">
						<div class="qt-node-indent" style="width: ${indent}px"></div>
						
						<button class="qt-expand-btn ${!hasChildren ? 'is-hidden' : ''}" data-action="toggle">
							${isLoading ? `<svg class="qt-spinner" width="12" height="12" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="currentColor" stroke-width="2"/></svg>` 
							: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`}
						</button>
						
						<div class="qt-node-icon qt-node-icon-${level}">
							${level === 'activity' ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`
							: level === 'phase' ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8m-4-4h8"/></svg>`
							: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>`}
						</div>
						
						<div class="qt-node-info">
							<div class="qt-node-title">
								${isFixed ? '<span class="qt-status-dot is-fixed"></span>' : ''}
								<span class="qt-node-level-badge">${(data.item_level || 'Task').charAt(0)}</span>
								${data.item_code || data.item_name || 'Unnamed'}
							</div>
						</div>
						
						<div class="qt-node-values">
							<div class="qt-value"><span class="qt-value-percent">${contractPct}%</span></div>
							<div class="qt-value"><span class="qt-value-percent" style="color:var(--qt-text-muted)">${totalPct}%</span></div>
							<div class="qt-value qt-value-amount">
								${hasDiscount ? `<span class="qt-gross-amount" title="${__('Gross')}: ${this.formatCurrency(grossAmount)}">${this.formatCurrency(grossAmount)}</span>` : ''}
								<span class="qt-value-money ${hasDiscount ? 'has-discount' : ''}">${amount}</span>
								${hasDiscount ? `<span class="qt-discount-badge" title="${__('Discount')}: ${discountPct > 0 ? discountPct.toFixed(1) + '%' : this.formatCurrency(discountAmt)}">-${discountPct > 0 ? discountPct.toFixed(0) + '%' : this.formatCurrency(discountAmt)}</span>` : ''}
							</div>
						</div>
						
						${!this.readonly ? `
						<div class="qt-node-actions">
							<button class="qt-action-btn" data-action="add-group" title="${__('Add Group')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><path d="M12 11v6m-3-3h6"/></svg></button>
							<button class="qt-action-btn" data-action="add-task" title="${__('Add Task')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7h14"/></svg></button>
							<button class="qt-action-btn" data-action="add-multiple" title="${__('Add Multiple')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></button>
							<button class="qt-action-btn" data-action="duplicate" title="${__('Duplicate')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
							<button class="qt-action-btn" data-action="edit" title="${__('Edit')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
							<button class="qt-action-btn action-delete" data-action="delete" title="${__('Delete')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
						</div>
						` : ''}
					</div>
				</div>
				<div class="qt-children" id="children-${data.name}"></div>
			</div>
		`;
	}
	
	// ========================================================================
	// DATA LOADING (Optimized for large trees)
	// ========================================================================
	
	async loadRootNodes() {
		// For new/unsaved quotations, load from document items directly
		if (this.isNew || !this.docname || this.docname === "new") {
			this.syncFromDocument();
			return;
		}
		
		try {
			const data = await this.fetchChildren(null);
			this.$content.empty();
			
			if (!data || data.length === 0) {
				this.$content.html(`
					<div class="qt-empty">
						<svg class="qt-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
						</svg>
						<div class="qt-empty-title">${__("No items yet")}</div>
						<div class="qt-empty-text">${__("Click 'Add Activity' to create your first hierarchy item")}</div>
					</div>
				`);
			} else {
				// Batch render for performance
				const fragment = document.createDocumentFragment();
				const tempDiv = document.createElement('div');
				
				data.forEach(node => {
					this.nodes.set(node.name, node);
					tempDiv.innerHTML = this.renderNode(node, 0);
					fragment.appendChild(tempDiv.firstElementChild);
					if (this.defaultExpandAll && node.expandable) {
						this.expandedNodes.add(node.name);
					}
				});
				
				this.$content.append(fragment);
			}
			
			this.updateStats();
			if (this.defaultExpandAll) {
				this.expandAll();
			}
		} catch (err) {
			console.error("Error loading tree:", err);
			// Fallback: try to load from document
			this.syncFromDocument();
		}
	}
	
	async loadChildren(nodeName) {
		if (this.loadingNodes.has(nodeName)) return;
		
		const $node = this.$content.find(`[data-name="${nodeName}"]`);
		const $children = $node.find(`#children-${nodeName}`);
		
		this.loadingNodes.add(nodeName);
		$node.addClass('is-loading');
		
		try {
			const data = await this.fetchChildren(nodeName);
			$children.empty();
			
			if (data && data.length > 0) {
				const depth = parseInt($node.data('depth') || 0) + 1;
				const fragment = document.createDocumentFragment();
				const tempDiv = document.createElement('div');
				
				data.forEach(node => {
					this.nodes.set(node.name, node);
					tempDiv.innerHTML = this.renderNode(node, depth);
					fragment.appendChild(tempDiv.firstElementChild);
				});
				
				$children.append(fragment);
			}
		} catch (err) {
			console.error("Error loading children:", err);
			$children.html(`<div class="qt-error">${__("Error loading children")}</div>`);
		} finally {
			this.loadingNodes.delete(nodeName);
			$node.removeClass('is-loading');
		}
	}
	
	fetchChildren(parentValue) {
		return new Promise((resolve, reject) => {
			const nodeData = parentValue ? this.nodes.get(parentValue) : null;
			const parent = nodeData ? (nodeData.item_code || nodeData.item_name || nodeData.value) : '';
			
			frappe.call({
				method: "propasal.propasal.quotation_hierarchy.get_quotation_children",
				args: {
					parent: parent,
					parent_id: this.docname,
					quotation_name: this.docname
				},
				callback: (r) => {
					if (r.exc) {
						reject(new Error(r.exc));
					} else {
						resolve(r.message || []);
					}
				},
				error: (r) => reject(r)
			});
		});
	}
	
	// ========================================================================
	// EVENT HANDLERS
	// ========================================================================
	
	bindEvents() {
		const $tree = this.$wrapper.find('.quotation-tree-modern');
		
		// Toggle expand/collapse
		$tree.on('click', '[data-action="toggle"]', (e) => {
			e.stopPropagation();
			const $node = $(e.target).closest('.qt-node');
			this.toggleNode($node);
		});
		
		// Double-click to expand
		$tree.on('dblclick', '.qt-node-card', (e) => {
			const $node = $(e.target).closest('.qt-node');
			if ($node.data('expandable') === '1') {
				this.toggleNode($node);
			}
		});
		
		// Header actions
		$tree.on('click', '[data-action="add-root"]', () => this.showAddGroupDialog(null, true));
		$tree.on('click', '[data-action="expand-all"]', () => this.expandAll());
		$tree.on('click', '[data-action="collapse-all"]', () => this.collapseAll());
		$tree.on('click', '[data-action="export-tasks"]', () => this.showExportTasksDialog());
		
		// Node actions
		$tree.on('click', '[data-action="add-group"]', (e) => {
			e.stopPropagation();
			const name = $(e.target).closest('.qt-node').data('name');
			this.showAddGroupDialog(name, false);
		});
		
		$tree.on('click', '[data-action="add-task"]', (e) => {
			e.stopPropagation();
			const name = $(e.target).closest('.qt-node').data('name');
			this.showAddTaskDialog(name);
		});
		
		$tree.on('click', '[data-action="add-multiple"]', (e) => {
			e.stopPropagation();
			const name = $(e.target).closest('.qt-node').data('name');
			this.showAddMultipleDialog(name);
		});
		
		$tree.on('click', '[data-action="duplicate"]', (e) => {
			e.stopPropagation();
			const name = $(e.target).closest('.qt-node').data('name');
			this.showDuplicateDialog(name);
		});
		
		$tree.on('click', '[data-action="edit"]', (e) => {
			e.stopPropagation();
			const name = $(e.target).closest('.qt-node').data('name');
			this.showEditDialog(name);
		});
		
		$tree.on('click', '[data-action="delete"]', (e) => {
			e.stopPropagation();
			const name = $(e.target).closest('.qt-node').data('name');
			this.deleteNode(name);
		});
		
		// Keyboard navigation
		$tree.on('keydown', '.qt-node-card', (e) => this.handleKeyboard(e));
		
		// Drag and drop
		if (!this.readonly) {
			this.setupDragDrop($tree);
		}
	}
	
	toggleNode($node) {
		const name = $node.data('name');
		const isExpanded = $node.hasClass('is-expanded');
		
		if (isExpanded) {
			$node.removeClass('is-expanded');
			this.expandedNodes.delete(name);
		} else {
			$node.addClass('is-expanded');
			this.expandedNodes.add(name);
			
			const $children = $node.find(`#children-${name}`);
			if ($children.children().length === 0 || $children.find('.qt-loading').length) {
				this.loadChildren(name);
			}
		}
	}
	
	expandAll() {
		const me = this;
		
		// Recursive function to expand a node and all its children
		async function expandNodeAndChildren($node) {
			if (!$node.length) return;
			
			const isExpandable = $node.data('expandable') === 1 || $node.data('expandable') === '1';
			const isExpanded = $node.hasClass('is-expanded');
			const name = $node.data('name');
			
			if (isExpandable && !isExpanded) {
				// Expand this node
				$node.addClass('is-expanded');
				me.expandedNodes.add(name);
				
				// Load children if not already loaded
				const $children = $node.find(`#children-${name}`);
				if ($children.children().length === 0 || $children.find('.qt-loading').length) {
					await me.loadChildren(name);
				}
			}
			
			// Find and expand all expandable children
			const $childNodes = $node.find(`#children-${name} > .qt-node[data-expandable="1"]`);
			for (let i = 0; i < $childNodes.length; i++) {
				await expandNodeAndChildren($($childNodes[i]));
			}
		}
		
		// Start with all root-level expandable nodes
		const $rootNodes = this.$content.find('> .qt-node[data-expandable="1"]');
		
		// Process all root nodes
		(async () => {
			for (let i = 0; i < $rootNodes.length; i++) {
				await expandNodeAndChildren($($rootNodes[i]));
			}
			frappe.show_alert({ message: __("All nodes expanded"), indicator: "green" });
		})();
	}
	
	collapseAll() {
		this.$content.find('.qt-node.is-expanded').removeClass('is-expanded');
		this.expandedNodes.clear();
	}
	
	handleKeyboard(e) {
		const $node = $(e.target).closest('.qt-node');
		const name = $node.data('name');
		
		switch (e.key) {
			case 'Enter':
			case ' ':
				if ($node.data('expandable') === '1') {
					e.preventDefault();
					this.toggleNode($node);
				}
				break;
			case 'ArrowRight':
				if (!$node.hasClass('is-expanded') && $node.data('expandable') === '1') {
					e.preventDefault();
					this.toggleNode($node);
				}
				break;
			case 'ArrowLeft':
				if ($node.hasClass('is-expanded')) {
					e.preventDefault();
					this.toggleNode($node);
				}
				break;
			case 'Delete':
				if (!this.readonly) {
					e.preventDefault();
					this.deleteNode(name);
				}
				break;
		}
	}
	
	setupDragDrop($tree) {
		let draggedNode = null;
		let dragGhost = null;
		
		$tree.on('dragstart', '.qt-node-card', (e) => {
			const $node = $(e.target).closest('.qt-node');
			draggedNode = $node.data('name');
			
			dragGhost = $('<div class="qt-drag-ghost"></div>');
			const nodeData = this.nodes.get(draggedNode);
			dragGhost.text(nodeData?.item_code || nodeData?.item_name || 'Item');
			$('body').append(dragGhost);
			
			$node.addClass('is-dragging');
			e.originalEvent.dataTransfer.effectAllowed = 'move';
		});
		
		$tree.on('dragend', '.qt-node-card', (e) => {
			const $node = $(e.target).closest('.qt-node');
			$node.removeClass('is-dragging');
			$tree.find('.is-drag-over').removeClass('is-drag-over');
			if (dragGhost) dragGhost.remove();
			draggedNode = null;
		});
		
		$tree.on('dragover', '.qt-node', (e) => {
			e.preventDefault();
			const $target = $(e.target).closest('.qt-node');
			
			if ($target.data('name') !== draggedNode && $target.data('expandable') === '1') {
				$tree.find('.is-drag-over').removeClass('is-drag-over');
				$target.addClass('is-drag-over');
			}
		});
		
		$tree.on('drop', '.qt-node', (e) => {
			e.preventDefault();
			const $target = $(e.target).closest('.qt-node');
			const targetName = $target.data('name');
			
			$tree.find('.is-drag-over').removeClass('is-drag-over');
			
			if (targetName && draggedNode && targetName !== draggedNode) {
				this.handleMove(draggedNode, targetName);
			}
		});
		
		$(document).on('dragover', (e) => {
			if (dragGhost) {
				dragGhost.css({
					left: e.pageX + 10,
					top: e.pageY + 10
				});
			}
		});
	}
	
	// ========================================================================
	// ADD ITEM TO DOCUMENT (for new quotations or direct add)
	// ========================================================================
	
	addItemToDocument(data) {
		// Add item directly to document items table
		const row = this.frm.add_child('items');
		
		row.item_code = data.item_code || '';
		row.item_name = data.item_name || data.item_code || '';
		row.description = data.description || '';
		row.item_level = data.item_level || 'Task';
		row.parent_activity = data.parent_activity || '';
		row.contract_percentage = data.contract_percentage || 100;
		row.custom_is_fixed = data.custom_is_fixed || 0;
		row.qty = data.qty || 1;
		// Rate is USER INPUT - get from data.rate only, never calculate from amount
		// Dialog "Amount" field sets rate, not amount field
		row.rate = flt(data.rate) || 0;  // This comes from dialog "Amount" field (which sets rate)
		// Don't set amount - Frappe automatically calculates amount = rate × qty when row is added
		row.uom = data.uom || 'Nos';
		// Clear price_list_rate to prevent ERPNext from auto-calculating discounts
		row.price_list_rate = 0;
		row.discount_percentage = 0;
		row.discount_amount = 0;
		
		// Set expandable for groups
		if (row.item_level === 'Activity' || row.item_level === 'Phase') {
			row.is_expandable = 1;
		}
		
		// Refresh the items table
		this.frm.refresh_field('items');
		
		// Sync tree
		this.syncFromDocument();
		
		return row;
	}
	
	// ========================================================================
	// ADD GROUP DIALOG (Activity/Phase) - FULL FEATURED
	// ========================================================================
	
	showAddGroupDialog(parentName, isRoot = false) {
		if (this.readonly) {
			frappe.msgprint(__("Cannot modify a submitted/cancelled document"));
			return;
		}
		
		// SINGLE SOURCE OF TRUTH: Read parent from child table (locals)
		let parentAmount = 0;
		let parentIsFixed = false;
		let parentLevel = '';
		
		if (parentName) {
			const parentLocal = locals["Quotation Item"]?.[parentName];
			const parentGrid = this.frm.doc.items?.find(i => i.name === parentName);
			const parentItem = parentLocal || parentGrid;
			if (parentItem) {
				// Use net_amount if parent has discount (so percentage is of discounted amount)
				parentAmount = flt(parentItem.net_amount) || flt(parentItem.calculated_amount) || flt(parentItem.amount) || 0;
				parentIsFixed = parentItem.custom_is_fixed || false;
				parentLevel = parentItem.item_level || '';
			}
		}
		
		const mustBeFixed = !isRoot && parentIsFixed && ['Activity', 'Phase'].includes(parentLevel);
		// Only allow percentage if there's a valid parent amount
		const canUsePercentage = !isRoot && parentAmount > 0;
		const self = this;
		
		const fields = [
			{
				label: __("Item Code"),
				fieldtype: "Link",
				fieldname: "item_code",
				options: "Item",
				reqd: 1,
				get_query: () => ({
					filters: { "is_stock_item": 0, "is_sales_item": 1 }
				}),
				onchange: function() {
					const item_code = this.get_value();
					if (item_code) {
						frappe.db.get_value("Item", item_code, ["item_name", "description"])
							.then(r => {
								if (r.message) {
									this.layout.fields_dict.item_name.set_value(r.message.item_name || item_code);
								}
							});
					}
				}
			},
			{ fieldtype: "Column Break" },
			{
				label: __("Group Name"),
				fieldtype: "Data",
				fieldname: "item_name",
				reqd: 1,
				description: __("Display name for this group")
			},
			{ fieldtype: "Section Break", label: __("Type") },
			{
				label: __("Level Type"),
				fieldtype: "Select",
				fieldname: "item_level",
				options: isRoot ? ["Activity"] : ["Phase"],
				default: isRoot ? "Activity" : "Phase",
				reqd: 1,
				read_only: 1
			}
		];
		
		if (isRoot || !canUsePercentage) {
			// ROOT or no valid parent: Amount only, NO percentage
			fields.push(
				{ fieldtype: "Section Break", label: __("Amount") },
				{
					label: __("Amount"),
					fieldtype: "Currency",
					fieldname: "amount",
					default: 0,
					reqd: 1,
					description: isRoot 
						? __("Base amount for this Activity (percentage not applicable)")
						: __("Enter amount (set parent amount first to use percentage)")
				},
				{ fieldtype: "Column Break" },
				{
					label: __("Is Fixed Amount"),
					fieldtype: "Check",
					fieldname: "custom_is_fixed",
					default: mustBeFixed ? 1 : 0,
					read_only: mustBeFixed ? 1 : 0,
					description: __("Children cannot exceed this amount")
				}
			);
		} else {
			// Sub-group with valid parent: Percentage + Amount with real-time calc
			fields.push(
				{ fieldtype: "Section Break", label: __("Pricing - Real-time Calculation") },
				{
					label: __("Contract Percentage (%)"),
					fieldtype: "Float",
					fieldname: "contract_percentage",
					default: 0,
					precision: 2,
					description: __("Parent: {0}", [self.formatCurrency(parentAmount)])
				},
				{ fieldtype: "Column Break" },
				{
					label: __("Amount"),
					fieldtype: "Currency",
					fieldname: "amount",
					default: 0,
					description: __("Or enter amount directly")
				},
				{ fieldtype: "Section Break" },
				{
					fieldtype: "HTML",
					fieldname: "live_calc_display",
					options: `<div id="add-group-calc-preview" style="padding: 12px; background: var(--bg-light-gray); border-radius: 6px; border-left: 3px solid var(--primary);">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div><strong>${__("Percentage:")}</strong> <span id="add-preview-pct">0.00%</span></div>
							<div style="font-size: 1.5em;">→</div>
							<div><strong>${__("Amount:")}</strong> <span id="add-preview-amount" style="color: var(--primary); font-weight: bold;">${self.formatCurrency(0)}</span></div>
						</div>
						<div class="text-muted small" style="margin-top: 8px;">${__("Parent:")} ${self.formatCurrency(parentAmount)}</div>
					</div>`
				},
				{ fieldtype: "Section Break" },
				{
					label: __("Is Fixed Amount"),
					fieldtype: "Check",
					fieldname: "custom_is_fixed",
					default: mustBeFixed ? 1 : 0,
					read_only: mustBeFixed ? 1 : 0,
					description: mustBeFixed ? __("Required: Parent is fixed") : __("Children cannot exceed this amount")
				}
			);
		}
		
		const dialog = new frappe.ui.Dialog({
			title: isRoot ? __("Add Activity (Root Group)") : __("Add Phase (Sub-Group)"),
			fields: fields,
			size: "large",
			primary_action_label: __("Add"),
			primary_action: async (values) => {
				dialog.hide();
				
				let userAmount = flt(values.amount) || 0;  // User enters "amount" in dialog
				let finalPercentage = flt(values.contract_percentage) || 0;
				
				// Determine rate:
				// 1. If percentage provided: calculate amount → set rate = calculated amount
				// 2. If amount provided: set rate = user amount
				// 3. Frappe will automatically calculate amount = rate × qty
				let rateValue = 0;
				if (finalPercentage > 0 && parentAmount > 0) {
					// Percentage provided: calculate amount → set rate
					const calculatedAmount = (parentAmount * finalPercentage) / 100;
					rateValue = calculatedAmount;
				} else if (userAmount > 0) {
					// Amount provided: set rate = user amount (dialog "Amount" field → rate)
					rateValue = userAmount;
				}
				
				const itemData = {
					parent_activity: parentName || "",
					item_code: values.item_code,
					item_name: values.item_name,
					item_level: values.item_level,
					qty: 1,
					custom_is_fixed: values.custom_is_fixed ? 1 : 0,
					contract_percentage: finalPercentage,
					rate: rateValue  // Dialog "Amount" field sets rate, or calculated from percentage
					// Don't set amount - Frappe will calculate it from rate × qty automatically
				};
				
				// For new quotations, add directly to child table
				if (this.isNew || !this.docname || this.docname === "new") {
					this.addItemToDocument(itemData);
					frappe.show_alert({ message: __("Group added - save to persist"), indicator: "blue" });
					return;
				}
				
				// For saved quotations, use API
				try {
					await this.addItem({ parent: this.docname, ...itemData });
					await this.refreshAfterChange(parentName);
					frappe.show_alert({ message: __("Group added"), indicator: "green" });
				} catch (err) {
					frappe.msgprint({ title: __("Error"), indicator: "red", message: err.message || __("Failed to add group") });
				}
			}
		});
		
		dialog.show();
		
		// Setup real-time calculation ONLY when percentage is available
		if (canUsePercentage) {
			const pctField = dialog.get_field('contract_percentage');
			const amtField = dialog.get_field('amount');
			let updating = false;
			
			const updatePreview = (pct, amt) => {
				const pctText = pct > 100 
					? `<span style="color: var(--red)">${pct.toFixed(2)}% (exceeds parent!)</span>`
					: `${pct.toFixed(2)}%`;
				$('#add-preview-pct').html(pctText);
				$('#add-preview-amount').text(self.formatCurrency(amt));
			};
			
			if (pctField && pctField.$input) {
				pctField.$input.on('input change', function() {
					if (updating) return;
					updating = true;
					const pct = flt($(this).val()) || 0;
					const calcAmount = (pct / 100) * parentAmount;
					if (amtField) amtField.set_value(calcAmount);
					updatePreview(pct, calcAmount);
					updating = false;
				});
			}
			
			if (amtField && amtField.$input) {
				amtField.$input.on('input change', function() {
					if (updating) return;
					updating = true;
					const amt = flt($(this).val()) || 0;
					const calcPct = (amt / parentAmount) * 100;
					if (pctField) pctField.set_value(calcPct);
					updatePreview(calcPct, amt);
					updating = false;
				});
			}
		}
	}
	
	// ========================================================================
	// ADD TASK DIALOG - READS FROM CHILD TABLE (Single Source of Truth)
	// ========================================================================
	
	showAddTaskDialog(parentName) {
		if (this.readonly) {
			frappe.msgprint(__("Cannot modify a submitted/cancelled document"));
			return;
		}
		
		// SINGLE SOURCE OF TRUTH: Read parent from child table (locals)
		// Use net_amount if parent has discount (so percentage is of discounted amount)
		let parentAmount = 0;
		if (parentName) {
			const parentLocal = locals["Quotation Item"]?.[parentName];
			const parentGrid = this.frm.doc.items?.find(i => i.name === parentName);
			const parentItem = parentLocal || parentGrid;
			if (parentItem) {
				parentAmount = flt(parentItem.net_amount) || flt(parentItem.calculated_amount) || flt(parentItem.amount) || 0;
			}
		}
		
		const self = this;
		
		const dialog = new frappe.ui.Dialog({
			title: __("Add Task"),
			size: "large",
			fields: [
				{
					label: __("Item Code"),
					fieldtype: "Link",
					fieldname: "item_code",
					options: "Item",
					reqd: 1,
					get_query: () => ({
						filters: { "is_stock_item": 0, "is_sales_item": 1 }
					}),
					onchange: function() {
						const item_code = this.get_value();
						if (item_code) {
							frappe.db.get_value("Item", item_code, ["item_name", "description"])
								.then(r => {
									if (r.message) {
										this.layout.fields_dict.item_name.set_value(r.message.item_name || item_code);
										this.layout.fields_dict.description.set_value(r.message.description || "");
									}
								});
						}
					}
				},
				{
					label: __("Task Name"),
					fieldtype: "Data",
					fieldname: "item_name",
					reqd: 1
				},
				{ fieldtype: "Column Break" },
				{
					label: __("Description"),
					fieldtype: "Small Text",
					fieldname: "description"
				},
				{ fieldtype: "Section Break", label: __("Pricing - Real-time Calculation") },
				{
					label: __("Contract Percentage (%)"),
					fieldtype: "Float",
					fieldname: "contract_percentage",
					default: 0,  // DEFAULT TO 0
					precision: 2,
					description: __("Parent: {0}", [self.formatCurrency(parentAmount)])
				},
				{ fieldtype: "Column Break" },
				{
					label: __("Amount"),
					fieldtype: "Currency",
					fieldname: "amount",
					default: 0,  // DEFAULT TO 0
					description: __("Or enter amount directly")
				},
				{ fieldtype: "Section Break" },
				{
					fieldtype: "HTML",
					fieldname: "live_calc_display",
					options: `<div id="add-task-calc-preview" style="padding: 12px; background: var(--bg-light-gray); border-radius: 6px; border-left: 3px solid var(--primary);">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div><strong>${__("Percentage:")}</strong> <span id="task-preview-pct">0.00%</span></div>
							<div style="font-size: 1.5em;">→</div>
							<div><strong>${__("Amount:")}</strong> <span id="task-preview-amount" style="color: var(--primary); font-weight: bold;">${self.formatCurrency(0)}</span></div>
						</div>
						<div class="text-muted small" style="margin-top: 8px;">${__("Parent:")} ${self.formatCurrency(parentAmount)}</div>
					</div>`
				}
			],
			primary_action_label: __("Add"),
			primary_action: async (values) => {
				dialog.hide();
				
				let userAmount = flt(values.amount) || 0;  // User enters "amount" in dialog
				let finalPercentage = flt(values.contract_percentage) || 0;
				
				// Determine rate:
				// 1. If percentage provided: calculate amount → set rate = calculated amount
				// 2. If amount provided: set rate = user amount
				// 3. Frappe will automatically calculate amount = rate × qty
				let rateValue = 0;
				if (finalPercentage > 0 && parentAmount > 0) {
					// Percentage provided: calculate amount → set rate
					const calculatedAmount = (parentAmount * finalPercentage) / 100;
					rateValue = calculatedAmount;
				} else if (userAmount > 0) {
					// Amount provided: set rate = user amount (dialog "Amount" field → rate)
					rateValue = userAmount;
				}
				
				const itemData = {
					parent_activity: parentName,
					item_code: values.item_code,
					item_name: values.item_name,
					description: values.description,
					item_level: "Task",
					qty: 1,
					contract_percentage: finalPercentage,
					rate: rateValue  // Dialog "Amount" field sets rate, or calculated from percentage
					// Don't set amount - Frappe will calculate it from rate × qty automatically
				};
				
				// For new quotations, add directly to child table
				if (this.isNew || !this.docname || this.docname === "new") {
					this.addItemToDocument(itemData);
					frappe.show_alert({ message: __("Task added - save to persist"), indicator: "blue" });
					return;
				}
				
				try {
					await this.addItem({ parent: this.docname, ...itemData });
					await this.refreshAfterChange(parentName);
					frappe.show_alert({ message: __("Task added"), indicator: "green" });
				} catch (err) {
					frappe.msgprint({ title: __("Error"), indicator: "red", message: err.message || __("Failed to add task") });
				}
			}
		});
		
		dialog.show();
		
		// Setup real-time calculation preview ONLY if parent has amount
		if (parentAmount > 0) {
			const pctField = dialog.get_field('contract_percentage');
			const amtField = dialog.get_field('amount');
			let updating = false;
			
			const updatePreview = (pct, amt) => {
				const pctText = pct > 100 
					? `<span style="color: var(--red)">${pct.toFixed(2)}% (exceeds parent!)</span>`
					: `${pct.toFixed(2)}%`;
				$('#task-preview-pct').html(pctText);
				$('#task-preview-amount').text(self.formatCurrency(amt));
			};
			
			if (pctField && pctField.$input) {
				pctField.$input.on('input change', function() {
					if (updating) return;
					updating = true;
					const pct = flt($(this).val()) || 0;
					const calcAmount = (pct / 100) * parentAmount;
					if (amtField) amtField.set_value(calcAmount);
					updatePreview(pct, calcAmount);
					updating = false;
				});
			}
			
			if (amtField && amtField.$input) {
				amtField.$input.on('input change', function() {
					if (updating) return;
					updating = true;
					const amt = flt($(this).val()) || 0;
					const calcPct = (amt / parentAmount) * 100;
					if (pctField) pctField.set_value(calcPct);
					updatePreview(calcPct, amt);
					updating = false;
				});
			}
		}
	}
	
	// ========================================================================
	// ADD MULTIPLE ITEMS DIALOG - READS FROM CHILD TABLE
	// ========================================================================
	
	showAddMultipleDialog(parentName) {
		if (this.readonly) {
			frappe.msgprint(__("Cannot modify a submitted/cancelled document"));
			return;
		}
		
		// SINGLE SOURCE OF TRUTH: Read parent from child table
		// Use net_amount if parent has discount (so percentage is of discounted amount)
		let parentAmount = 0;
		let parentLabel = parentName;
		if (parentName) {
			const parentLocal = locals["Quotation Item"]?.[parentName];
			const parentGrid = this.frm.doc.items?.find(i => i.name === parentName);
			const parentItem = parentLocal || parentGrid;
			if (parentItem) {
				parentAmount = flt(parentItem.net_amount) || flt(parentItem.calculated_amount) || flt(parentItem.amount) || 0;
				parentLabel = parentItem.item_code || parentItem.item_name || parentName;
			}
		}
		
		// Get existing children for pre-fill
		const existingChildren = this.frm.doc.items.filter(i => i.parent_activity === parentName);
		const initialData = existingChildren.map(item => ({
			item_code: item.item_code,
			description: item.description || item.item_name,
			contract_percentage: item.contract_percentage || 0,
			amount: item.amount || 0,
			custom_is_fixed: item.custom_is_fixed || 0
		}));
		
		const dialog = new frappe.ui.Dialog({
			title: __("Add/Edit Multiple Items: {0}", [parentLabel]),
			size: "extra-large",
			fields: [
				{
					fieldtype: "HTML",
					options: `<div class="alert alert-info">
						<strong>${__("Parent: {0}", [parentLabel])}</strong> | 
						<strong>${__("Parent Amount: {0}", [this.formatCurrency(parentAmount)])}</strong><br>
						<small>
							${existingChildren.length > 0 
								? __("Editing {0} existing items. Add new rows or modify existing.", [existingChildren.length])
								: __("Add multiple items at once. Each row will be created as a Task.")
							}
						</small>
					</div>`
				},
				{
					fieldname: "items",
					fieldtype: "Table",
					label: __("Items"),
					cannot_add_rows: false,
					in_place_edit: true,
					data: initialData,
					get_data: () => dialog.fields_dict.items.grid.data || [],
					fields: [
						{
							fieldtype: "Link",
							fieldname: "item_code",
							label: __("Item Code"),
							options: "Item",
							in_list_view: 1,
							reqd: 1,
							columns: 3,
							get_query: () => ({
								filters: { "is_stock_item": 0, "is_sales_item": 1 }
							})
						},
						{
							fieldtype: "Small Text",
							fieldname: "description",
							label: __("Description"),
							in_list_view: 1,
							columns: 3
						},
						{
							fieldtype: "Percent",
							fieldname: "contract_percentage",
							label: __("Contract %"),
							in_list_view: 1,
							default: 0,  // DEFAULT TO 0
							columns: 2
						},
						{
							fieldtype: "Currency",
							fieldname: "amount",
							label: __("Amount"),
							in_list_view: 1,
							columns: 2
						},
						{
							fieldtype: "Check",
							fieldname: "custom_is_fixed",
							label: __("Fixed"),
							in_list_view: 1,
							columns: 1
						}
					]
				},
				{
					fieldtype: "Section Break",
					label: __("Tips")
				},
				{
					fieldtype: "HTML",
					options: `<div class="text-muted small">
						<ul>
							<li>${__("Item Code: Link to existing Item master record")}</li>
							<li>${__("Contract %: Percentage of parent amount")}</li>
							<li>${__("Amount: Fixed amount (overrides percentage if entered)")}</li>
							<li>${__("Fixed: If checked, child items cannot exceed this amount")}</li>
						</ul>
					</div>`
				}
			],
			primary_action_label: __("Add All Items"),
			primary_action: (values) => {
				if (!values.items || values.items.length === 0) {
					frappe.msgprint(__("Please add at least one item"));
					return;
				}
				
				// Validate items
				for (let item of values.items) {
					if (!item.item_code) {
						frappe.msgprint(__("Item Code is required for all rows"));
						return;
					}
					if (item.contract_percentage < 0 || item.contract_percentage > 100) {
						frappe.msgprint(__("Contract Percentage must be between 0% and 100%"));
						return;
					}
				}
				
				dialog.hide();
				
				frappe.call({
					method: "propasal.propasal.quotation_hierarchy.add_multiple_items",
					args: {
						quotation_name: this.docname,
						parent_name: parentName,
						items: values.items
					},
					freeze: true,
					freeze_message: __("Adding {0} items...", [values.items.length]),
					callback: (r) => {
						if (!r.exc && r.message) {
							frappe.show_alert({
								message: __("{0} items added successfully", [r.message.added_count || values.items.length]),
								indicator: "green"
							});
							this.refreshAfterChange(parentName);
						}
					},
					error: (r) => {
						frappe.msgprint({
							title: __("Error"),
							indicator: "red",
							message: r.message || __("Failed to add items")
						});
					}
				});
			}
		});
		
		dialog.show();
		
		// Add initial empty rows if no existing data
		if (initialData.length === 0) {
			setTimeout(() => {
				for (let i = 0; i < 5; i++) {
					dialog.fields_dict.items.grid.add_new_row();
				}
			}, 300);
		}
	}
	
	// ========================================================================
	// EDIT DIALOG - READS FROM CHILD TABLE (Single Source of Truth)
	// ========================================================================
	
	showEditDialog(nodeName) {
		// SINGLE SOURCE OF TRUTH: Read from child table via locals
		const localItem = locals["Quotation Item"]?.[nodeName];
		const gridItem = this.frm.doc.items?.find(i => i.name === nodeName);
		const item = localItem || gridItem;
		
		if (!item) {
			frappe.msgprint(__("Item not found in child table"));
			return;
		}
		
		const isRoot = !item.parent_activity;
		
		// Get parent info from child table (not from nodes cache)
		// Use net_amount if parent has discount (so percentage is of discounted amount)
		let parentAmount = 0;
		let parentIsFixed = false;
		if (item.parent_activity) {
			const parentLocal = locals["Quotation Item"]?.[item.parent_activity];
			const parentGrid = this.frm.doc.items?.find(i => i.name === item.parent_activity);
			const parentItem = parentLocal || parentGrid;
			if (parentItem) {
				parentAmount = flt(parentItem.net_amount) || flt(parentItem.calculated_amount) || flt(parentItem.amount) || 0;
				parentIsFixed = parentItem.custom_is_fixed || false;
			}
		}
		
		// Determine if percentage makes sense (only for children with valid parent amount)
		const canUsePercentage = !isRoot && parentAmount > 0;
		
		const mustBeFixed = !isRoot && parentIsFixed && ['Activity', 'Phase'].includes(item.item_level);
		const qty = flt(item.qty) || 1;
		const currentAmount = flt(item.amount) || 0;
		const currentPct = flt(item.contract_percentage) || 0;
		
		// Build fields
		const fields = [
			{
				label: __("Item Code"),
				fieldtype: "Link",
				fieldname: "item_code",
				options: "Item",
				default: item.item_code,
				read_only: 1
			},
			{
				label: __("Name"),
				fieldtype: "Data",
				fieldname: "item_name",
				default: item.item_name,
				reqd: 1
			},
			{ fieldtype: "Column Break" },
			{
				label: __("Type"),
				fieldtype: "Select",
				fieldname: "item_level",
				options: ["Activity", "Phase", "Task"],
				default: item.item_level,
				reqd: 1
			},
			{
				label: __("Description"),
				fieldtype: "Small Text",
				fieldname: "description",
				default: item.description
			},
			{ fieldtype: "Section Break", label: __("Pricing") }
		];
		
		// Add Rate and Qty fields - Rate is USER INPUT
		const currentRate = flt(item.rate) || 0;
		fields.push(
			{
				label: __("Rate (per unit)"),
				fieldtype: "Currency",
				fieldname: "rate",
				default: currentRate,
				description: __("Rate per unit (user input)")
			},
			{ fieldtype: "Column Break" },
			{
				label: __("Quantity"),
				fieldtype: "Float",
				fieldname: "qty",
				default: qty,
				reqd: 1,
				description: __("Quantity")
			},
			{ fieldtype: "Column Break" },
			{
				label: __("Amount (Rate × Qty)"),
				fieldtype: "Currency",
				fieldname: "display_amount",
				default: currentAmount,
				read_only: 1,
				description: __("Auto-calculated: Rate × Qty")
			},
			{ fieldtype: "Section Break" }
		);
		
		if (isRoot || !canUsePercentage) {
			// ROOT ITEMS or items without valid parent: Amount can be overridden
			fields.push(
				{
					label: __("Override Amount (optional)"),
					fieldtype: "Currency",
					fieldname: "override_amount",
					default: "",
					description: __("Override calculated amount (leave empty to use Rate × Qty)")
				},
				{
					fieldtype: "HTML",
					fieldname: "root_info",
					options: `<div class="text-muted small" style="padding: 10px; background: var(--bg-light-gray); border-radius: 4px; margin-top: 10px;">
						${isRoot 
							? __("This is a root item - percentage is not applicable.")
							: __("Parent amount is not set - please set parent amount first to use percentage.")}
					</div>`
				}
			);
		} else {
			// CHILD ITEMS with valid parent: Percentage and Amount with real-time calc
			fields.push(
				{
					label: __("Contract Percentage (%)"),
					fieldtype: "Float",
					fieldname: "contract_percentage",
					default: currentPct,
					precision: 2,
					description: __("Percentage of parent ({0})", [this.formatCurrency(parentAmount)])
				},
				{ fieldtype: "Column Break" },
				{
					label: __("Amount"),
					fieldtype: "Currency",
					fieldname: "amount",
					default: currentAmount,
					description: __("Or enter amount directly")
				},
				{ fieldtype: "Section Break" },
				{
					fieldtype: "HTML",
					fieldname: "live_calc_display",
					options: `<div id="live-calc-preview" style="padding: 12px; background: var(--bg-light-gray); border-radius: 6px; border-left: 3px solid var(--primary);">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div>
								<strong>${__("Percentage:")}</strong> <span id="preview-pct">${currentPct.toFixed(2)}%</span>
							</div>
							<div style="font-size: 1.5em;">→</div>
							<div>
								<strong>${__("Amount:")}</strong> <span id="preview-amount" style="color: var(--primary); font-weight: bold;">${this.formatCurrency(currentAmount)}</span>
							</div>
						</div>
						<div class="text-muted small" style="margin-top: 8px;">
							${__("Parent:")} ${this.formatCurrency(parentAmount)} | ${__("Qty:")} ${qty}
						</div>
					</div>`
				}
			);
		}
		
		// Discount section - show gross, discount, and net amounts clearly
		const currentDiscountPct = flt(item.discount_percentage) || 0;
		const currentDiscountAmt = flt(item.discount_amount) || 0;
		const grossAmt = flt(item.amount) || (flt(item.rate) * flt(item.qty)) || 0;
		const netAmt = flt(item.net_amount) || grossAmt;
		
		fields.push(
			{ fieldtype: "Section Break", label: __("Discount"), collapsible: currentDiscountPct === 0, collapsible_depends_on: "eval:doc.discount_percentage > 0" },
			{
				label: __("Gross Amount (before discount)"),
				fieldtype: "Currency",
				fieldname: "display_gross_amount",
				default: grossAmt,
				read_only: 1,
				description: __("Rate × Qty, before any discount")
			},
			{ fieldtype: "Column Break" },
			{
				label: __("Discount (%)"),
				fieldtype: "Percent",
				fieldname: "discount_percentage",
				default: currentDiscountPct,
				description: __("Enter discount percentage to apply")
			},
			{ fieldtype: "Section Break" },
			{
				label: __("Discount Amount"),
				fieldtype: "Currency",
				fieldname: "discount_amount",
				default: currentDiscountAmt,
				read_only: 1,
				description: __("Auto-calculated: Gross × Discount%")
			},
			{ fieldtype: "Column Break" },
			{
				label: __("Net Amount (after discount)"),
				fieldtype: "Currency",
				fieldname: "display_net_amount",
				default: netAmt,
				read_only: 1,
				description: __("Gross Amount - Discount Amount")
			}
		);
		
		fields.push(
			{ fieldtype: "Section Break", label: __("Options") },
			{
				label: __("Is Fixed Amount"),
				fieldtype: "Check",
				fieldname: "custom_is_fixed",
				default: mustBeFixed ? 1 : (item.custom_is_fixed || 0),
				read_only: mustBeFixed ? 1 : 0,
				description: mustBeFixed 
					? __("Required: Parent is fixed")
					: __("Children cannot exceed this amount")
			}
		);
		
		const self = this;
		const dialog = new frappe.ui.Dialog({
			title: __("Edit: {0}", [item.item_name || item.item_code]),
			fields: fields,
			size: "large",
			primary_action_label: __("Update"),
			primary_action: (values) => {
				dialog.hide();
				
				// Update child table directly (single source of truth)
				frappe.model.set_value(item.doctype, item.name, "item_name", values.item_name);
				frappe.model.set_value(item.doctype, item.name, "description", values.description);
				frappe.model.set_value(item.doctype, item.name, "item_level", values.item_level);
				
				let finalIsFixed = mustBeFixed ? 1 : (values.custom_is_fixed ? 1 : 0);
				frappe.model.set_value(item.doctype, item.name, "custom_is_fixed", finalIsFixed);
				
				// Rate and Qty are USER INPUTS - get from dialog values
				const newRate = flt(values.rate) || 0;
				const newQty = flt(values.qty) || 1;
				
				// #region agent log
				fetch('http://localhost:7242/ingest/e989f469-c75d-4d7e-899a-50210f5f18fd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'quotation_hierarchy.js:1917','message':'Edit dialog - setting rate and qty',data:{item_name:item.item_name,old_rate:flt(item.rate),new_rate:newRate,old_qty:flt(item.qty),new_qty:newQty},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'D'})}).catch(()=>{});
				// #endregion
				
				// Update rate and qty (user inputs) - NEVER calculate rate
				frappe.model.set_value(item.doctype, item.name, "rate", newRate);
				frappe.model.set_value(item.doctype, item.name, "qty", newQty);
				
				// Frappe automatically calculates amount = rate × qty when rate/qty changes
				// Only set amount manually if:
				// 1. override_amount is provided (root items)
				// 2. amount is provided directly (child items, when user edits amount field)
				// Otherwise, let Frappe calculate it
				if (values.override_amount !== undefined && values.override_amount !== "") {
					// Root item: override amount provided
					frappe.model.set_value(item.doctype, item.name, "amount", flt(values.override_amount) || 0);
				}
				// For child items: rate was already set above from values.rate
				// The bidirectional calculation in dialog already computed rate = amount / qty
				// Frappe will automatically calculate amount = rate × qty
				// If rate > 0, Frappe will calculate amount automatically - no need to set it
				
				// For child items with percentage field, also update percentage
				if (canUsePercentage && values.contract_percentage !== undefined) {
					frappe.model.set_value(item.doctype, item.name, "contract_percentage", flt(values.contract_percentage) || 0);
				}
				
				// Update discount percentage if provided
				if (values.discount_percentage !== undefined) {
					const discPct = flt(values.discount_percentage) || 0;
					frappe.model.set_value(item.doctype, item.name, "discount_percentage", discPct);
					
					// Calculate discount_amount and net_amount locally for immediate UI feedback
					// These will be recalculated by ERPNext on save, but we need them for tree display
					const rate = flt(values.rate) || flt(item.rate) || 0;
					const qty = flt(values.qty) || flt(item.qty) || 1;
					const amount = rate * qty;
					const discountAmount = amount * (discPct / 100);
					const netAmount = amount - discountAmount;
					
					frappe.model.set_value(item.doctype, item.name, "discount_amount", discountAmount);
					frappe.model.set_value(item.doctype, item.name, "net_amount", netAmount);
				}
				
				// Sync UI from child table first
				self.syncFromDocument();
				
				// Save and sync again after save completes
				self.frm.save().then(() => {
					// Sync again after server calculations are complete
					self.syncFromDocument();
					frappe.show_alert({ message: __("Updated"), indicator: "green" });
				}).catch((err) => {
					console.error("Save failed:", err);
					// Still sync to show current state
					self.syncFromDocument();
				});
			}
		});
		
		dialog.show();
		
		// Get field references for rate/qty/display_amount calculations
		const rateField = dialog.get_field('rate');
		const qtyField = dialog.get_field('qty');
		const displayAmountField = dialog.get_field('display_amount');
		
		// Function to update display_amount = rate × qty
		const updateDisplayAmount = () => {
			const currentRate = flt(rateField?.get_value()) || 0;
			const currentQty = flt(qtyField?.get_value()) || 1;
			const newDisplayAmount = currentRate * currentQty;
			if (displayAmountField) {
				displayAmountField.set_value(newDisplayAmount);
			}
		};
		
		// When rate changes, update display_amount
		if (rateField && rateField.$input) {
			rateField.$input.on('input change', updateDisplayAmount);
		}
		
		// When qty changes, update display_amount
		if (qtyField && qtyField.$input) {
			qtyField.$input.on('input change', updateDisplayAmount);
		}
		
		// Setup discount calculation preview
		const discountPctField = dialog.get_field('discount_percentage');
		const discountAmtField = dialog.get_field('discount_amount');
		const netAmountField = dialog.get_field('display_net_amount');
		const grossAmountField = dialog.get_field('display_gross_amount');
		
		const updateDiscountDisplay = () => {
			const currentRate = flt(rateField?.get_value()) || 0;
			const currentQty = flt(qtyField?.get_value()) || 1;
			const discountPct = flt(discountPctField?.get_value()) || 0;
			
			const grossAmt = currentRate * currentQty;
			const discountAmt = grossAmt * (discountPct / 100);
			const netAmt = grossAmt - discountAmt;
			
			// Update gross amount display
			if (grossAmountField) {
				grossAmountField.set_value(grossAmt);
			}
			if (discountAmtField) {
				discountAmtField.set_value(discountAmt);
			}
			if (netAmountField) {
				netAmountField.set_value(netAmt);
			}
		};
		
		// When discount percentage changes, update discount amount and net amount
		if (discountPctField && discountPctField.$input) {
			discountPctField.$input.on('input change', updateDiscountDisplay);
		}
		
		// Also update discount display when rate or qty changes
		if (rateField && rateField.$input) {
			rateField.$input.on('input change', updateDiscountDisplay);
		}
		if (qtyField && qtyField.$input) {
			qtyField.$input.on('input change', updateDiscountDisplay);
		}
		
		// Setup REAL-TIME calculation preview ONLY for child items with valid parent
		if (canUsePercentage) {
			const pctField = dialog.get_field('contract_percentage');
			const amtField = dialog.get_field('amount');
			
			// Flag to prevent infinite loop
			let updating = false;
			
			const updatePreview = (pct, amt) => {
				// Show warning if percentage > 100%
				const pctText = pct > 100 
					? `<span style="color: var(--red)">${pct.toFixed(2)}% (exceeds parent!)</span>`
					: `${pct.toFixed(2)}%`;
				$('#preview-pct').html(pctText);
				$('#preview-amount').text(self.formatCurrency(amt));
			};
			
			// When percentage changes, calculate amount AND set rate = calculated amount
			if (pctField && pctField.$input) {
				pctField.$input.on('input change', function() {
					if (updating) return;
					updating = true;
					
					const pct = flt($(this).val()) || 0;
					const calcAmount = (pct / 100) * parentAmount;
					
					// Update amount field
					if (amtField) {
						amtField.set_value(calcAmount);
					}
					// Update rate field: rate = calculated amount (NOT divided by qty)
					// User wants: rate = 100k, then if qty=2, amount = 200k
					if (rateField) {
						rateField.set_value(calcAmount);
					}
					// Update display_amount
					updateDisplayAmount();
					updatePreview(pct, calcAmount);
					
					updating = false;
				});
			}
			
			// When amount changes, calculate percentage AND set rate = amount
			if (amtField && amtField.$input) {
				amtField.$input.on('input change', function() {
					if (updating) return;
					updating = true;
					
					const amt = flt($(this).val()) || 0;
					const calcPct = (amt / parentAmount) * 100;
					
					// Update percentage field
					if (pctField) {
						pctField.set_value(calcPct);
					}
					// Update rate field: rate = amount (NOT divided by qty)
					if (rateField) {
						rateField.set_value(amt);
					}
					// Update display_amount
					updateDisplayAmount();
					updatePreview(calcPct, amt);
					
					updating = false;
				});
			}
		}
	}
	
	// ========================================================================
	// DUPLICATE DIALOG - FULL FEATURED
	// ========================================================================
	
	showDuplicateDialog(nodeName) {
		// SINGLE SOURCE OF TRUTH: Read from child table
		const sourceLocal = locals["Quotation Item"]?.[nodeName];
		const sourceGrid = this.frm.doc.items?.find(i => i.name === nodeName);
		const sourceItem = sourceLocal || sourceGrid;
		
		if (!sourceItem) {
			frappe.msgprint(__("Source item not found in child table"));
			return;
		}
		
		// Count children from child table
		const childrenCount = this.frm.doc.items.filter(i => i.parent_activity === nodeName).length;
		const sourcePct = flt(sourceItem.contract_percentage) || 0;
		const sourceAmt = flt(sourceItem.amount) || 0;
		
		const self = this;
		
		const dialog = new frappe.ui.Dialog({
			title: __("Duplicate: {0}", [sourceItem.item_code || sourceItem.item_name]),
			fields: [
				{
					fieldtype: "HTML",
					options: `<div class="alert alert-info">
						<strong>${__("Source:")}</strong> ${sourceItem.item_code || sourceItem.item_name}<br>
						${childrenCount > 0 ? `<strong>${__("Children:")}</strong> ${childrenCount} items<br>` : ''}
						<strong>${__("Percentage:")}</strong> ${sourcePct.toFixed(2)}%<br>
						<strong>${__("Amount:")}</strong> ${self.formatCurrency(sourceAmt)}
						<div class="text-muted small mt-2">${__("Note: Percentage will be copied, amount will be recalculated based on new parent.")}</div>
					</div>`
				},
				{
					label: __("Copy to Group"),
					fieldtype: "Link",
					fieldname: "target_parent",
					options: "Quotation Item",
					reqd: 1,
					get_query: () => ({
						query: "propasal.propasal.quotation_hierarchy.get_parent_items",
						filters: {
							'quotation': this.docname,
							'current_item': nodeName,
							'is_expandable': 1
						}
					})
				},
				{
					label: __("Include child items"),
					fieldtype: "Check",
					fieldname: "include_children",
					default: 1,
					hidden: childrenCount === 0
				},
				{ fieldtype: "Section Break", label: __("Optional: Override Values") },
				{
					label: __("New Percentage (%)"),
					fieldtype: "Float",
					fieldname: "new_percentage",
					precision: 2,
					description: __("Leave empty to use source percentage ({0}%)", [sourcePct.toFixed(2)])
				},
				{ fieldtype: "Column Break" },
				{
					label: __("New Fixed Amount"),
					fieldtype: "Currency",
					fieldname: "new_amount",
					description: __("Leave empty to calculate from percentage")
				}
			],
			primary_action_label: __("Duplicate"),
			primary_action: (values) => {
				dialog.hide();
				
				frappe.call({
					method: "propasal.propasal.quotation_hierarchy.duplicate_item",
					args: {
						quotation_name: this.docname,
						source_item_name: nodeName,
						target_parent_name: values.target_parent,
						include_children: values.include_children ? 1 : 0,
						new_percentage: values.new_percentage || null,
						new_amount: values.new_amount || null
					},
					freeze: true,
					freeze_message: __("Duplicating..."),
					callback: (r) => {
						if (!r.exc && r.message && r.message.success) {
							if (r.message.scaled) {
								// Percentages were scaled to fit
								frappe.show_alert({ 
									message: r.message.message || __("Duplicated (percentages scaled to fit)"), 
									indicator: "blue" 
								}, 7);
							} else {
								frappe.show_alert({ message: __("Duplicated successfully"), indicator: "green" });
							}
							this.refreshAfterChange(null);
						}
					},
					error: (r) => {
						frappe.msgprint({ title: __("Error"), indicator: "red", message: r.message || __("Failed to duplicate") });
					}
				});
			}
		});
		
		dialog.show();
	}
	
	// ========================================================================
	// DELETE NODE - READS FROM CHILD TABLE
	// ========================================================================
	
	deleteNode(nodeName) {
		if (this.readonly) {
			frappe.msgprint(__("Cannot modify a submitted/cancelled document"));
			return;
		}
		
		// SINGLE SOURCE OF TRUTH: Read from child table
		const itemLocal = locals["Quotation Item"]?.[nodeName];
		const itemGrid = this.frm.doc.items?.find(i => i.name === nodeName);
		const item = itemLocal || itemGrid;
		const label = item ? (item.item_code || item.item_name || nodeName) : nodeName;
		
		// Find items to delete (including children)
		const itemsToDelete = this.collectChildrenRecursive(nodeName);
		itemsToDelete.push(nodeName);
		
		const childrenCount = itemsToDelete.length - 1;
		
		let message = __("Delete {0}?", [label]);
		if (childrenCount > 0) {
			message = __("Delete {0} and its {1} child items?", [label, childrenCount]);
		}
		
		frappe.confirm(message, () => {
			// For new quotations, delete directly from document
			if (this.isNew || !this.docname || this.docname === "new") {
				this.deleteItemsFromDocument(itemsToDelete);
				frappe.show_alert({ message: __("Deleted - save document to persist"), indicator: "blue" });
				return;
			}
			
			// For saved quotations, use API
			frappe.call({
				method: "propasal.propasal.quotation_hierarchy.delete_quotation_item",
				args: {
					item_name: nodeName,
					parent: this.docname
				},
				freeze: true,
				freeze_message: __("Deleting..."),
				callback: (r) => {
					if (!r.exc && r.message) {
						frappe.show_alert({ message: __("Deleted successfully"), indicator: "green" });
						this.refreshAfterChange(null);
					}
				},
				error: (r) => {
					frappe.msgprint({
						title: __("Error"),
						indicator: "red",
						message: r.message || __("Failed to delete")
					});
				}
			});
		});
	}
	
	collectChildrenRecursive(parentName) {
		const items = this.frm.doc.items || [];
		const children = items.filter(i => i.parent_activity === parentName);
		let result = [];
		
		children.forEach(child => {
			result.push(child.name);
			result = result.concat(this.collectChildrenRecursive(child.name));
		});
		
		return result;
	}
	
	deleteItemsFromDocument(itemNames) {
		// Remove items from document
		const items = this.frm.doc.items || [];
		this.frm.doc.items = items.filter(i => !itemNames.includes(i.name));
		
		// Refresh items table
		this.frm.refresh_field('items');
		
		// Sync tree
		this.syncFromDocument();
	}
	
	// ========================================================================
	// MOVE ITEM (Drag & Drop)
	// ========================================================================
	
	handleMove(itemName, newParentName) {
		const itemNode = this.nodes.get(itemName);
		const targetNode = this.nodes.get(newParentName);
		
		if (!itemNode || !targetNode) return;
		
		const itemLabel = itemNode.item_code || itemNode.item_name || itemName;
		const targetLabel = targetNode.item_code || targetNode.item_name || newParentName;
		
		const itemAmount = itemNode.calculated_amount || itemNode.amount || 0;
		const newParentAmount = targetNode.calculated_amount || targetNode.amount || 0;
		const newPercentage = newParentAmount > 0 ? (itemAmount / newParentAmount) * 100 : 100;
		
		frappe.confirm(
			__("Move '{0}' to '{1}'?<br><br>New percentage will be {2}%", 
				[itemLabel, targetLabel, newPercentage.toFixed(2)]),
			() => {
				frappe.call({
					method: "propasal.propasal.quotation_hierarchy.move_item",
					args: {
						quotation_name: this.docname,
						item_name: itemName,
						new_parent_name: newParentName,
						new_percentage: newPercentage
					},
					freeze: true,
					freeze_message: __("Moving..."),
					callback: (r) => {
						if (!r.exc && r.message) {
							frappe.show_alert({ message: __("Moved successfully"), indicator: "green" });
							this.refreshAfterChange(null);
						}
					},
					error: (r) => {
						frappe.msgprint({
							title: __("Error"),
							indicator: "red",
							message: r.message || __("Failed to move item")
						});
					}
				});
			}
		);
	}
	
	// ========================================================================
	// EXPORT TO TASKS DIALOG
	// ========================================================================
	
	showExportTasksDialog() {
		const self = this;
		
		// Check if quotation has items
		if (!this.frm.doc.items || this.frm.doc.items.length === 0) {
			frappe.msgprint(__("No items in quotation to export"));
			return;
		}
		
		let hierarchyData = null;
		
		const dialog = new frappe.ui.Dialog({
			title: __("Create Tasks from Quotation"),
			size: "large",
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "info",
					options: `<div class="alert alert-info" style="margin-bottom: 15px;">
						<strong>${__("Export Quotation Hierarchy to Task Doctype")}</strong><br>
						<small>${__("This will create Tasks with parent-child relationships matching your quotation structure (Activity → Phase → Task)")}</small>
					</div>`
				},
				{
					fieldtype: "Section Break",
					label: __("Project Settings")
				},
				{
					fieldtype: "Check",
					fieldname: "create_new_project",
					label: __("Create New Project"),
					default: 1,
					onchange: function() {
						const createNew = dialog.get_value("create_new_project");
						dialog.set_df_property("new_project_name", "hidden", !createNew);
						dialog.set_df_property("new_project_name", "reqd", createNew);
						dialog.set_df_property("existing_project", "hidden", createNew);
						dialog.set_df_property("existing_project", "reqd", !createNew);
					}
				},
				{
					fieldtype: "Data",
					fieldname: "new_project_name",
					label: __("New Project Name"),
					default: self.frm.doc.party_name ? `${self.frm.doc.party_name} - ${self.frm.doc.name}` : self.frm.doc.name,
					depends_on: "eval:doc.create_new_project"
				},
				{
					fieldtype: "Link",
					fieldname: "existing_project",
					label: __("Select Existing Project"),
					options: "Project",
					hidden: 1,
					depends_on: "eval:!doc.create_new_project"
				},
				{
					fieldtype: "Section Break",
					label: __("Preview - Items to Export")
				},
				{
					fieldtype: "HTML",
					fieldname: "preview",
					options: `<div id="export-preview" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 4px; padding: 8px;">
						<div class="text-muted text-center p-3">${__("Loading preview...")}</div>
					</div>`
				}
			],
			primary_action_label: __("Create Tasks"),
			primary_action: () => {
				const createNew = dialog.get_value("create_new_project");
				const newProjectName = dialog.get_value("new_project_name");
				const existingProject = dialog.get_value("existing_project");
				
				if (createNew && !newProjectName) {
					frappe.msgprint(__("Please enter a project name"));
					return;
				}
				if (!createNew && !existingProject) {
					frappe.msgprint(__("Please select a project"));
					return;
				}
				
				dialog.hide();
				
				frappe.call({
					method: "propasal.propasal.quotation_hierarchy.export_quotation_to_tasks",
					args: {
						quotation_name: self.frm.doc.name,
						project_name: createNew ? null : existingProject,
						create_project: createNew,
						new_project_name: createNew ? newProjectName : null
					},
					freeze: true,
					freeze_message: __("Creating tasks..."),
					callback: (r) => {
						if (r.message && r.message.success) {
							frappe.show_alert({
								message: __("{0} tasks created in project {1}", [r.message.created_count, r.message.project]),
								indicator: "green"
							}, 7);
							
							// Ask if user wants to open the project
							frappe.confirm(
								__("Tasks created successfully. Open the project?"),
								() => {
									frappe.set_route("Form", "Project", r.message.project);
								}
							);
						}
					},
					error: (r) => {
						frappe.msgprint({
							title: __("Error"),
							indicator: "red",
							message: r.message || __("Failed to create tasks")
						});
					}
				});
			}
		});
		
		// Load preview
		frappe.call({
			method: "propasal.propasal.quotation_hierarchy.get_quotation_hierarchy_for_export",
			args: { quotation_name: self.frm.doc.name },
			callback: (r) => {
				if (r.message) {
					hierarchyData = r.message;
					renderPreview(r.message.hierarchy);
				}
			}
		});
		
		function renderPreview(hierarchy) {
			const $preview = dialog.$wrapper.find("#export-preview");
			
			if (!hierarchy || hierarchy.length === 0) {
				$preview.html(`<div class="text-muted text-center p-3">${__("No items to export")}</div>`);
				return;
			}
			
			let html = '';
			let totalCount = 0;
			
			hierarchy.forEach((activity, idx) => {
				totalCount++;
				const amount = self.formatCurrency(activity.amount || 0);
				
				html += `
					<div style="margin-bottom: 6px; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden;">
						<div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(233, 69, 96, 0.1);">
							<span style="background: #e94560; color: white; padding: 1px 6px; border-radius: 2px; font-size: 9px; font-weight: 600;">A${idx + 1}</span>
							<strong style="flex: 1; font-size: 11px;">${activity.item_name}</strong>
							<span style="font-size: 10px; color: var(--text-muted);">${amount}</span>
						</div>
				`;
				
				if (activity.children && activity.children.length > 0) {
					html += `<div style="padding-left: 20px; padding-bottom: 4px;">`;
					activity.children.forEach(phase => {
						totalCount++;
						html += `
							<div style="display: flex; align-items: center; gap: 6px; padding: 3px 8px; border-left: 2px solid #00b4d8; margin: 2px 0;">
								<span style="background: rgba(0, 180, 216, 0.1); color: #00b4d8; padding: 1px 4px; border-radius: 2px; font-size: 8px; font-weight: 600;">P</span>
								<span style="flex: 1; font-size: 10px;">${phase.item_name}</span>
								<span style="font-size: 9px; color: var(--text-muted);">${self.formatCurrency(phase.amount || 0)}</span>
							</div>
						`;
						
						if (phase.children && phase.children.length > 0) {
							phase.children.forEach(task => {
								totalCount++;
								html += `
									<div style="display: flex; align-items: center; gap: 6px; padding: 2px 8px; margin-left: 16px; border-left: 2px solid #10b981;">
										<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 1px 4px; border-radius: 2px; font-size: 7px; font-weight: 600;">T</span>
										<span style="font-size: 9px; color: var(--text-muted);">${task.item_name}</span>
									</div>
								`;
							});
						}
					});
					html += `</div>`;
				}
				
				html += `</div>`;
			});
			
			// Add summary
			html = `
				<div style="margin-bottom: 8px; padding: 6px 10px; background: var(--bg-light-gray); border-radius: 4px; font-size: 11px;">
					<strong>${totalCount}</strong> ${__("tasks will be created")} | 
					<strong>${hierarchy.length}</strong> ${__("activities")}
				</div>
			` + html;
			
			$preview.html(html);
		}
		
		dialog.show();
	}
	
	// ========================================================================
	// API HELPERS
	// ========================================================================
	
	addItem(data) {
		return new Promise((resolve, reject) => {
			frappe.call({
				method: "propasal.propasal.quotation_hierarchy.add_quotation_item",
				args: data,
				callback: (r) => {
					if (r.exc) {
						reject(new Error(r.exc));
					} else {
						resolve(r.message);
					}
				},
				error: (r) => reject(new Error(r.message || "API Error"))
			});
		});
	}
	
	async refreshAfterChange(parentName) {
		// Reload document first to get updated values from server
		await this.frm.reload_doc();
		
		// Clear nodes cache
		this.nodes.clear();
		
		// For saved documents, reload from API
		// For new documents, sync from document
		if (this.isNew || !this.docname || this.docname === "new") {
			this.syncFromDocument();
		} else {
			await this.loadRootNodes();
		}
		
		// Re-expand previously expanded nodes
		if (parentName && this.expandedNodes.has(parentName)) {
			const $node = this.$content.find(`[data-name="${parentName}"]`);
			if ($node.length && !$node.hasClass('is-expanded')) {
				this.toggleNode($node);
			}
		}
	}
	
	// ========================================================================
	// STATISTICS & UTILITIES
	// ========================================================================
	
	updateStats() {
		// Update grand total - use html() because frappe.format returns HTML
		const total = this.frm.doc.grand_total || this.frm.doc.total || 0;
		this.$grandTotal.html(this.formatCurrency(total));
		
		// Count items by type
		const items = this.frm.doc.items || [];
		const activities = items.filter(i => i.item_level === 'Activity').length;
		const phases = items.filter(i => i.item_level === 'Phase').length;
		const tasks = items.filter(i => i.item_level === 'Task').length;
		
		this.$itemCount.text(`(${items.length} ${__("items")})`);
		this.$breakdown.html(`
			<span class="badge-activity">${activities} ${__("Activities")}</span>
			<span class="badge-phase">${phases} ${__("Phases")}</span>
			<span class="badge-task">${tasks} ${__("Tasks")}</span>
		`);
	}
	
	formatCurrency(value) {
		return frappe.format(value, {
			fieldtype: "Currency",
			currency: this.currency
		});
	}
}

// Export class
propasal.quotation.ModernTree = ModernTree;
