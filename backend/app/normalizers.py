"""Turns each scanner's own raw finding shape (from its scan-result.json artifact) into
rows matching the shared `Vulnerability` model. Add a new scanner by adding a normalizer
here and registering it in NORMALIZERS -- nothing else needs to change.
"""

_SEVERITY_ALIASES = {
    "moderate": "medium",
    "informational": "info",
    "unknown": "info",
}
_VALID_SEVERITIES = {"critical", "high", "medium", "low", "info"}


def _severity(value: str | None) -> str:
    sev = _SEVERITY_ALIASES.get((value or "info").lower(), (value or "info").lower())
    return sev if sev in _VALID_SEVERITIES else "info"


def normalize_composer_audit(scan_result: dict, *, repository: str, branch: str, commit_sha: str) -> list[dict]:
    rows = []
    for finding in scan_result.get("findings", []):
        package = finding.get("package", "")
        cve = finding.get("cve")
        advisory_id = finding.get("advisory_id")
        affected_versions = finding.get("affected_versions") or ""
        description = finding.get("title") or ""
        if affected_versions:
            description = f"{description}\n\nAffected versions: {affected_versions}".strip()
        rows.append(
            {
                "title": finding.get("title") or f"Vulnerable dependency: {package}",
                "description": description,
                "severity": _severity(finding.get("severity")),
                "scanner": "composer-audit",
                "vulnerability_type": "sca",
                "file_path": "composer.lock",
                "line_number": None,
                "dependency": package,
                
                "installed_version": affected_versions.replace("|", ", ") or None,
                "fixed_version": None,
                "cve": cve,
                "cwe": None,
                "cvss_score": None,
                "recommendation": (
                    f"Update {package} to a patched version. See {finding.get('link')}"
                    if finding.get("link")
                    else f"Update {package} to a patched version."
                ),
                "repository": repository,
                "branch": branch,
                "commit_sha": commit_sha,
                "fingerprint": f"composer-audit:{package}:{cve or advisory_id or finding.get('title')}",
            }
        )
    return rows


def normalize_npm_audit(scan_result: dict, *, repository: str, branch: str, commit_sha: str) -> list[dict]:
    rows = []
    for finding in scan_result.get("findings", []):
        package = finding.get("package", "")
        title = finding.get("title") or f"Vulnerable dependency: {package}"
        link = finding.get("link")
        affected_versions = finding.get("affected_versions") or ""
        advisory_id = finding.get("advisory_id")
        # the workflow's "cve" key actually holds CWE ids (e.g. "CWE-1321"), not CVE ids
        cwe = ",".join(finding.get("cve") or []) or None
        fixed_version = "Fix available" if finding.get("fix_available") else None
        description = title
        if affected_versions:
            description = f"{description}\n\nAffected versions: {affected_versions}".strip()

        rows.append(
            {
                "title": title,
                "description": description,
                "severity": _severity(finding.get("severity")),
                "scanner": "npm-audit",
                "vulnerability_type": "sca",
                "file_path": "package-lock.json",
                "line_number": None,
                "dependency": package,
                "installed_version": affected_versions or None,
                "fixed_version": fixed_version,
                "cve": None,
                "cwe": cwe,
                "cvss_score": None,
                "recommendation": (
                    f"Update {package} to a patched version. See {link}"
                    if link
                    else f"Update {package} to a patched version."
                ),
                "repository": repository,
                "branch": branch,
                "commit_sha": commit_sha,
                "fingerprint": f"npm-audit:{package}:{advisory_id or link or title}",
            }
        )
    return rows


_SEMGREP_SEVERITY = {
    "error": "high",
    "warning": "medium",
    "info": "low",
}


def normalize_semgrep(scan_result: dict, *, repository: str, branch: str, commit_sha: str) -> list[dict]:
    rows = []
    for finding in scan_result.get("findings", []):
        rule_id = finding.get("rule_id") or ""
        file_path = finding.get("file_path") or ""
        line_number = finding.get("line_number")
        message = finding.get("message") or ""
       
        cwe = (finding.get("cwe") or "").split(":", 1)[0].strip()[:50] or None
        link = finding.get("link")
        recommendation = f"{message}\n\nSee {link}".strip() if link else message

        rows.append(
            {
                "title": finding.get("title") or rule_id or "Semgrep finding",
                "description": message,
                "severity": _severity(_SEMGREP_SEVERITY.get((finding.get("severity") or "").lower())),
                "scanner": "semgrep",
                "vulnerability_type": "sast",
                "file_path": file_path,
                "line_number": line_number,
                "dependency": None,
                "installed_version": None,
                "fixed_version": None,
                "cve": None,
                "cwe": cwe,
                "cvss_score": None,
                "recommendation": recommendation or f"Review {file_path}:{line_number}",
                "repository": repository,
                "branch": branch,
                "commit_sha": commit_sha,
                "fingerprint": f"semgrep:{rule_id}:{file_path}:{line_number}",
            }
        )
    return rows


_TS_ESLINT_SEVERITY = {
    "error": "high",
    "warning": "medium",
    "info": "low",
}


def normalize_vue_tsc(scan_result: dict, *, repository: str, branch: str, commit_sha: str) -> list[dict]:
    rows = []
    for finding in scan_result.get("findings", []):
        rule_id = finding.get("rule_id") or ""
        file_path = finding.get("file_path") or ""
        line_number = finding.get("line_number")
        message = finding.get("message") or ""

        rows.append(
            {
                "title": finding.get("title") or rule_id or "vue-tsc finding",
                "description": message,
                "severity": _severity(_TS_ESLINT_SEVERITY.get((finding.get("severity") or "").lower())),
                "scanner": "vue-tsc",
                "vulnerability_type": "type-check",
                "file_path": file_path,
                "line_number": line_number,
                "dependency": None,
                "installed_version": None,
                "fixed_version": None,
                "cve": None,
                "cwe": None,
                "cvss_score": None,
                "recommendation": message or f"Review {file_path}:{line_number}",
                "repository": repository,
                "branch": branch,
                "commit_sha": commit_sha,
                "fingerprint": f"vue-tsc:{rule_id}:{file_path}:{line_number}",
            }
        )
    return rows


def normalize_eslint(scan_result: dict, *, repository: str, branch: str, commit_sha: str) -> list[dict]:
    rows = []
    for finding in scan_result.get("findings", []):
        rule_id = finding.get("rule_id") or ""
        file_path = finding.get("file_path") or ""
        line_number = finding.get("line_number")
        message = finding.get("message") or ""

        rows.append(
            {
                "title": finding.get("title") or rule_id or "ESLint finding",
                "description": message,
                "severity": _severity(_TS_ESLINT_SEVERITY.get((finding.get("severity") or "").lower())),
                "scanner": "eslint",
                "vulnerability_type": "lint",
                "file_path": file_path,
                "line_number": line_number,
                "dependency": None,
                "installed_version": None,
                "fixed_version": None,
                "cve": None,
                "cwe": None,
                "cvss_score": None,
                "recommendation": message or f"Review {file_path}:{line_number}",
                "repository": repository,
                "branch": branch,
                "commit_sha": commit_sha,
                "fingerprint": f"eslint:{rule_id}:{file_path}:{line_number}",
            }
        )
    return rows


_ZAP_RISK_SEVERITY = {
    "3": "critical",
    "2": "high",
    "1": "medium",
    "0": "low",
}


def normalize_zap(scan_result: dict, *, repository: str, branch: str, commit_sha: str) -> list[dict]:
    """ZAP's own JSON report shape: `{"site": [{"@name": ..., "alerts": [...]}]}` -- entirely
    different from this app's scan-result.json convention the other normalizers expect, since
    it comes straight from the zaproxy/action-full-scan action rather than our CI scripts.
    """
    rows = []
    for site in scan_result.get("site") or []:
        site_name = site.get("@name") or ""
        for alert in site.get("alerts") or []:
            name = alert.get("alert") or alert.get("name") or "ZAP finding"
            plugin_id = alert.get("pluginid") or alert.get("pluginId") or ""
            instances = alert.get("instances") or []
            uri = (instances[0].get("uri") if instances else None) or site_name
            cwe_id = str(alert.get("cweid") or "").strip()
            solution = (alert.get("solution") or "").strip()

            rows.append(
                {
                    "title": name,
                    "description": (alert.get("desc") or "").strip(),
                    "severity": _severity(_ZAP_RISK_SEVERITY.get(str(alert.get("riskcode") or "").strip())),
                    "scanner": "zap",
                    "vulnerability_type": "dast",
                    "file_path": uri,
                    "line_number": None,
                    "dependency": None,
                    "installed_version": None,
                    "fixed_version": None,
                    "cve": None,
                    "cwe": f"CWE-{cwe_id}" if cwe_id and cwe_id != "-1" else None,
                    "cvss_score": None,
                    "recommendation": solution or f"Review {uri}",
                    "repository": repository,
                    "branch": branch,
                    "commit_sha": commit_sha,
                    "fingerprint": f"zap:{plugin_id}:{uri}",
                }
            )
    return rows


NORMALIZERS = {
    "composer-audit": normalize_composer_audit,
    "npm-audit": normalize_npm_audit,
    "semgrep": normalize_semgrep,
    "vue-tsc": normalize_vue_tsc,
    "eslint": normalize_eslint,
}


def normalize_scan_result(scan_result: dict, *, repository: str, branch: str, commit_sha: str) -> list[dict]:
    scanner = scan_result.get("scanner", "")
    normalizer = NORMALIZERS.get(scanner)
    if normalizer is None:
        return []
    return normalizer(scan_result, repository=repository, branch=branch, commit_sha=commit_sha)
