// Copyright (c) 2024, Propasal and contributors
// License: MIT

// Make discount section always visible in Quotation Item
frappe.ui.form.on("Quotation Item", {
	refresh: function(frm) {
		// Update discount section collapsible_depends_on to check net_amount or amount
		if (frm.fields_dict.discount_and_margin && frm.fields_dict.discount_and_margin.df) {
			// Change collapsible_depends_on to check for net_amount or amount instead of margin_type || discount_amount
			frm.fields_dict.discount_and_margin.df.collapsible_depends_on = "eval:doc.net_amount || doc.amount";
			
			// Force show the section using jQuery if net_amount or amount exists
			const net_amount = flt(frm.doc.net_amount) || flt(frm.doc.amount) || 0;
			if (net_amount > 0) {
				setTimeout(() => {
					const $section = $(frm.fields_dict.discount_and_margin.wrapper);
					if ($section.length) {
						$section.show();
						$section.find('.section-head').show();
						$section.find('.section-body').show();
					}
				}, 100);
			}
		}
		
		// Ensure discount fields are visible when net_amount or amount is set (not just rate/price_list_rate)
		if (frm.fields_dict.discount_percentage) {
			// Update depends_on to show when net_amount OR amount is set
			if (frm.fields_dict.discount_percentage.df) {
				const current_depends_on = frm.fields_dict.discount_percentage.df.depends_on;
				// Change from price_list_rate to net_amount or amount
				if (current_depends_on === "price_list_rate" || current_depends_on && current_depends_on.includes("price_list_rate")) {
					frm.fields_dict.discount_percentage.df.depends_on = "eval:doc.net_amount || doc.amount";
				}
			}
		}
		
		if (frm.fields_dict.discount_amount) {
			// Update depends_on to show when net_amount OR amount is set
			if (frm.fields_dict.discount_amount.df) {
				const current_depends_on = frm.fields_dict.discount_amount.df.depends_on;
				// Change from price_list_rate to net_amount or amount
				if (current_depends_on === "price_list_rate" || current_depends_on && current_depends_on.includes("price_list_rate")) {
					frm.fields_dict.discount_amount.df.depends_on = "eval:doc.net_amount || doc.amount";
				}
			}
		}
		
		// Update discount section label to show qty when qty > 1
		if (frm.fields_dict.discount_and_margin && frm.doc.qty > 1) {
			const section_label = frm.fields_dict.discount_and_margin.df.label || "Discount and Margin";
			const qty_label = `${section_label} (Qty: ${frm.doc.qty})`;
			frm.set_df_property("discount_and_margin", "label", qty_label);
		}
	},
	
	qty: function(frm) {
		// When qty changes, refresh discount fields and update section label
		const net_amount = flt(frm.doc.net_amount) || flt(frm.doc.amount) || 0;
		if (net_amount > 0) {
			frm.refresh_field("discount_percentage");
			frm.refresh_field("discount_amount");
		}
		
		// Update discount section label to show qty when > 1
		if (frm.fields_dict.discount_and_margin) {
			if (frm.doc.qty > 1) {
				frm.set_df_property("discount_and_margin", "label", `Discount and Margin (Qty: ${frm.doc.qty})`);
			} else {
				frm.set_df_property("discount_and_margin", "label", "Discount and Margin");
			}
		}
	},
	
	amount: function(frm) {
		// When amount changes, refresh discount fields visibility
		const net_amount = flt(frm.doc.net_amount) || flt(frm.doc.amount) || 0;
		if (net_amount > 0) {
			frm.refresh_field("discount_percentage");
			frm.refresh_field("discount_amount");
		}
	},
	
	net_amount: function(frm) {
		// When net_amount changes, refresh discount fields visibility
		const net_amount = flt(frm.doc.net_amount) || flt(frm.doc.amount) || 0;
		if (net_amount > 0) {
			frm.refresh_field("discount_percentage");
			frm.refresh_field("discount_amount");
		}
	},
	
	rate: function(frm) {
		// When rate changes, amount will be recalculated, so refresh discount fields
		const net_amount = flt(frm.doc.net_amount) || flt(frm.doc.amount) || 0;
		if (net_amount > 0) {
			frm.refresh_field("discount_percentage");
			frm.refresh_field("discount_amount");
		}
	},
	
	price_list_rate: function(frm) {
		// When price_list_rate changes, refresh discount fields
		const net_amount = flt(frm.doc.net_amount) || flt(frm.doc.amount) || 0;
		if (net_amount > 0) {
			frm.refresh_field("discount_percentage");
			frm.refresh_field("discount_amount");
		}
	}
});
