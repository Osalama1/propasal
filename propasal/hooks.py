app_name = "propasal"
app_title = "Propasal"
app_publisher = "omar"
app_description = "Propasal is meant Quatation Doctype customize in it"
app_email = "omarsalama102@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "propasal",
# 		"logo": "/assets/propasal/logo.png",
# 		"title": "Propasal",
# 		"route": "/propasal",
# 		"has_permission": "propasal.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# CSS is embedded inline in quotation_hierarchy.js - no external CSS needed
# app_include_css = "/assets/propasal/css/quotation_tree.css"
# app_include_js = "/assets/propasal/js/propasal.js"

# include js, css files in header of web template
# web_include_css = "/assets/propasal/css/propasal.css"
# web_include_js = "/assets/propasal/js/propasal.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "propasal/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
	"Quotation" : ["public/js/quotation_hierarchy.js", "public/js/wbs_tree.js"],
	"Quotation Item" : "public/js/quotation_item_discount.js"
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "propasal/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "propasal.utils.jinja_methods",
# 	"filters": "propasal.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "propasal.install.before_install"
after_install = "propasal.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "propasal.uninstall.before_uninstall"
# after_uninstall = "propasal.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "propasal.utils.before_app_install"
# after_app_install = "propasal.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "propasal.utils.before_app_uninstall"
# after_app_uninstall = "propasal.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "propasal.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
	"Quotation": ["propasal.propasal.overrides.quotation.Quotation"]
}

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Quotation": {
		"validate": [
			"propasal.propasal.proposal_wbs_api.ensure_wbs_quotation_item_before_save"
		],
		"after_insert": [
			"propasal.propasal.proposal_wbs_api.auto_create_root_on_save"
		],
		"on_update": [
			"propasal.propasal.proposal_wbs_api.auto_create_root_on_save"
		],
		"on_update_after_submit": [
			"propasal.propasal.services.quotation_hierarchy_service.on_quotation_update_after_submit"
		],
		"on_cancel": [
			"propasal.propasal.services.quotation_hierarchy_service.on_quotation_cancel"
		],
		"on_trash": [
			"propasal.propasal.services.quotation_hierarchy_service.on_quotation_trash",
			"propasal.propasal.services.wbs_service.on_quotation_trash"
		],
	}
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"propasal.tasks.all"
# 	],
# 	"daily": [
# 		"propasal.tasks.daily"
# 	],
# 	"hourly": [
# 		"propasal.tasks.hourly"
# 	],
# 	"weekly": [
# 		"propasal.tasks.weekly"
# 	],
# 	"monthly": [
# 		"propasal.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "propasal.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "propasal.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "propasal.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["propasal.utils.before_request"]
# after_request = ["propasal.utils.after_request"]

# Job Events
# ----------
# before_job = ["propasal.utils.before_job"]
# after_job = ["propasal.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"propasal.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

