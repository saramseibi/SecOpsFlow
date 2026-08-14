"""Static metadata for the six CI jobs the Scan Overview page displays, plus a defensive
best-effort summarizer for each job's raw scan-result.json body. Adding a new job scanner
only requires a new entry in JOB_CONFIG (and, optionally, a RAW_SUMMARIZERS entry) --
nothing else in the ingestion path needs to change.
"""

JOB_CONFIG: dict[str, dict[str, str]] = {
    "phpunit": {"label": "PHPUnit", "category": "Tests"},
    "composer-audit": {"label": "Composer Audit", "category": "Dependency Security"},
    "npm-audit": {"label": "NPM Audit", "category": "Dependency Security"},
    "semgrep": {"label": "Semgrep", "category": "Code Security"},
    "larastan": {"label": "Larastan", "category": "Static Analysis"},
    "php-insights": {"label": "PHP Insights", "category": "Code Quality"},
    "security-tests": {"label": "Security Tests", "category": "Security Tests"},
    "dast": {"label": "DAST Scan", "category": "Dynamic Security"},
}


def category_for(scanner: str) -> str:
    return JOB_CONFIG.get(scanner, {}).get("category", "Other")


def _summarize_tests(raw: dict) -> str | None:
    passed = raw.get("passed")
    failed = raw.get("failed")
    skipped = raw.get("skipped")
    if passed is None and failed is None and skipped is None:
        return None
    parts = [f"{passed or 0} passed"]
    if failed:
        parts.append(f"{failed} failed")
    if skipped:
        parts.append(f"{skipped} skipped")
    return ", ".join(parts)


def _summarize_composer_audit(raw: dict) -> str | None:
    findings = raw.get("findings")
    if findings is None:
        return None
    packages = {f.get("package") for f in findings if f.get("package")}
    count = len(packages) or len(findings)
    return f"{count} vulnerable package{'s' if count != 1 else ''}"


def _summarize_npm_audit(raw: dict) -> str | None:
    findings = raw.get("findings")
    if findings is None:
        return None
    packages = {f.get("package") for f in findings if f.get("package")}
    count = len(packages) or len(findings)
    return f"{count} vulnerable package{'s' if count != 1 else ''}"


def _summarize_semgrep(raw: dict) -> str | None:
    results = raw.get("results") or raw.get("findings")
    if results is None:
        return None
    count = len(results)
    return f"{count} security finding{'s' if count != 1 else ''}" if count else "No security findings"


def _summarize_larastan(raw: dict) -> str | None:
    errors = raw.get("errors") or raw.get("findings")
    if errors is None:
        return None
    count = len(errors) if isinstance(errors, list) else errors
    return f"{count} static-analysis error{'s' if count != 1 else ''}" if count else "No static-analysis errors"


def _summarize_php_insights(raw: dict) -> str | None:
    score = raw.get("score") or (raw.get("summary") or {}).get("score")
    if score is None:
        return None
    return f"Quality score: {score}/100"


RAW_SUMMARIZERS = {
    "phpunit": _summarize_tests,
    "security-tests": _summarize_tests,
    "composer-audit": _summarize_composer_audit,
    "npm-audit": _summarize_npm_audit,
    "semgrep": _summarize_semgrep,
    "larastan": _summarize_larastan,
    "php-insights": _summarize_php_insights,
}


def summarize(scanner: str, status: str, raw: dict | None, findings_count: int) -> str:
    """Best-effort human summary for a job's result row. Falls back to a generic
    findings-count sentence when the tool's raw payload doesn't have the fields a
    dedicated summarizer expects (e.g. it errored before producing full output).
    """
    if status == "failed":
        return "Job failed"
    if status == "skipped":
        return "Job skipped"
    if status == "cancelled":
        return "Job cancelled"
    if status == "running":
        return "In progress"

    summarizer = RAW_SUMMARIZERS.get(scanner)
    if summarizer and isinstance(raw, dict):
        summary = summarizer(raw)
        if summary:
            return summary

    if findings_count:
        return f"{findings_count} finding{'s' if findings_count != 1 else ''}"
    return "No issues found"
