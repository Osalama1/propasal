# Propasal

Custom **ERPNext v15** app that extends **Quotation** with a **hierarchy tree** (Activity → Phase → Task), percentage-based amounts, fixed vs calculated lines, and a **Hierarchy Tree** tab for editing and reordering items.

## Requirements

- Frappe v15  
- ERPNext v15  
- Python 3.10+  
- Node.js (for `bench build` when assets change)

## Install

From your bench directory:

```bash
bench get-app propasal https://github.com/Osalama1/propasal.git
bench --site your-site-name install-app propasal
bench --site your-site-name migrate
bench --site your-site-name clear-cache
bench restart
```

Optional: `bench build --app propasal` if the tree UI assets were updated.

## What you get

- **Hierarchy Tree** tab on Quotation with expand/collapse, drag-and-drop, add/edit/delete, duplicate, and related actions  
- **Item levels**: Activity (root), Phase, Task  
- **Percentages**: contract % vs parent, total % vs quotation, with **calculated amount** (and optional **fixed** amounts with validation)  
- **Custom fields** on Quotation Item and Quotation created on install / via patches (see [INSTALLATION.md](INSTALLATION.md))

## Quick calculation idea

With grand total **100,000**:

- Activity at **40%** of quotation → **40,000**  
- Phase at **50%** of that activity → **20,000** total %  
- Task at **20%** of that phase → **4,000** total %  

Exact rules and field names are documented in [INSTALLATION.md](INSTALLATION.md).

## Verify install

```bash
cd /path/to/frappe-bench
bench --site your-site-name console
```

```python
exec(open("apps/propasal/verify_installation.py").read())
verify_installation()
```

## Documentation

| File | Purpose |
|------|---------|
| [INSTALLATION.md](INSTALLATION.md) | Full install steps, custom fields list, patches, troubleshooting, uninstall notes |

## License

MIT
