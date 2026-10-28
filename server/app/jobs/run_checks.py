from __future__ import annotations

import sys
from datetime import datetime

from app.core.db import get_session_factory
from app.services.admin import AdminService


def main() -> int:
    """
    Executes platform system invariant checks and prints a formatted report.
    Exits non-zero (1) on any failed check, 0 on all checks passing.
    """
    print("=" * 80)
    print("Rent4Fraction — System Invariant Checks Report")
    print(f"Executed at: {datetime.now().isoformat()}")
    print("=" * 80)

    try:
        session_factory = get_session_factory()
    except Exception as exc:
        print(f"FATAL: Database connection failed: {exc}", file=sys.stderr)
        return 1

    with session_factory() as db:
        admin_service = AdminService(db)
        report = admin_service.run_system_checks()

    print(f"\nSummary: {report.passed_checks}/{report.total_checks} checks passed. ({report.failed_checks} failed)\n")
    print(f"{'Check ID':<32} | {'Status':<6} | {'Violations':<10} | {'Check Name'}")
    print("-" * 80)

    critical_failures = 0
    for c in report.checks:
        status_label = "[PASS]" if c.status == "pass" else "[FAIL]"
        print(f"{c.check_id:<32} | {status_label:<6} | {c.violations_count:<10} | {c.name}")
        if c.status == "fail":
            critical_failures += 1
            print(f"  -> Message: {c.message}")
            if c.offending_ids:
                print(f"  -> Offending IDs: {', '.join(c.offending_ids[:10])}")

    print("=" * 80)
    if critical_failures > 0:
        print(f"FAILED: {critical_failures} critical invariant violation(s) detected!", file=sys.stderr)
        return 1
    else:
        print("ALL SYSTEM INVARIANT CHECKS PASSED.")
        return 0


if __name__ == "__main__":
    sys.exit(main())

