import { describe, expect, test } from "bun:test";
import {
	addMinimalWorkflowPermissions,
	buildBranchName,
	buildPrPlans,
	parseCsvRecords,
	scanFindingFromCsvRecord,
} from "./create_workflow_permission_prs";

describe("workflow permission PR planning", () => {
	test("parses quoted CSV values", () => {
		const records = parseCsvRecords(
			'repo,workflow_path,status,permissions_summary\nowner/repo,.github/workflows/ci.yml,missing_workflow_permissions,"missing, needs default"\n',
		);
		expect(records).toEqual([
			{
				repo: "owner/repo",
				workflow_path: ".github/workflows/ci.yml",
				status: "missing_workflow_permissions",
				permissions_summary: "missing, needs default",
			},
		]);
	});

	test("maps legacy scan CSV rows to missing permissions", () => {
		const finding = scanFindingFromCsvRecord({
			repo: "owner/repo",
			path: ".github/workflows/build.yml",
			has_permissions: "no",
			permissions_summary: "missing",
		});
		expect(finding?.status).toBe("missing_workflow_permissions");
	});

	test("maps legacy id-token write rows to OIDC review", () => {
		const finding = scanFindingFromCsvRecord({
			repo: "owner/repo",
			path: ".github/workflows/deploy.yml",
			has_permissions: "yes",
			permissions_summary: "contents: read; id-token: write",
		});
		expect(finding?.status).toBe("oidc_review");
	});

	test("plans only low-risk default edits", () => {
		const plans = buildPrPlans([
			{
				repo: "owner/repo",
				workflowPath: ".github/workflows/ci.yml",
				status: "missing_workflow_permissions",
				summary: "missing",
			},
			{
				repo: "owner/repo",
				workflowPath: ".github/workflows/release.yml",
				status: "write_scope",
				summary: "contents: write",
			},
			{
				repo: "owner/repo",
				workflowPath: "../bad.yml",
				status: "missing_workflow_permissions",
				summary: "missing",
			},
		]);

		expect(plans).toHaveLength(1);
		expect(plans[0].edits.map((edit) => edit.workflowPath)).toEqual([
			".github/workflows/ci.yml",
		]);
		expect(plans[0].skips).toHaveLength(2);
	});

	test("adds top-level minimal permissions before jobs", () => {
		const result = addMinimalWorkflowPermissions(
			`name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n`,
		);
		expect(result.changed).toBe(true);
		expect(result.text).toContain(
			"permissions:\n  contents: read\n  id-token: none\n\njobs:",
		);
	});

	test("does not rewrite workflows with existing top-level permissions", () => {
		const text = "name: CI\npermissions:\n  contents: read\njobs: {}\n";
		const result = addMinimalWorkflowPermissions(text);
		expect(result.changed).toBe(false);
		expect(result.text).toBe(text);
	});

	test("builds sanitized branch names", () => {
		const branch = buildBranchName(
			"Owner/Repo.Name",
			"hardening/minimal workflow permissions",
			new Date("2026-05-29T01:02:03.000Z"),
		);
		expect(branch).toBe(
			"hardening/minimal-workflow-permissions-20260529t010203z-owner-repo-name",
		);
	});
});
