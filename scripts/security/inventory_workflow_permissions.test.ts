import { describe, expect, test } from "bun:test";
import { scanWorkflowPermissions } from "./inventory_workflow_permissions";

describe("workflow permission inventory", () => {
	test("flags missing workflow permissions", () => {
		expect(
			scanWorkflowPermissions("name: CI\non: push\njobs: {}\n").status,
		).toBe("missing_workflow_permissions");
	});

	test("separates job-level permissions from workflow-level permissions", () => {
		const result = scanWorkflowPermissions(`
name: CI
on: push
jobs:
  build:
    permissions:
      contents: read
`);
		expect(result.status).toBe("job_level_permissions_present");
		expect(result.hasJobPermissions).toBe(true);
	});

	test("ignores nested non-token permissions inputs under steps", () => {
		const result = scanWorkflowPermissions(`
name: CI
on: push
permissions:
  contents: read
jobs:
  build:
    steps:
      - uses: example/action@v1
        with:
          permissions: write-all
`);
		expect(result.status).toBe("safe_readonly");
	});

	test("detects broad write-all permissions", () => {
		expect(scanWorkflowPermissions("permissions: write-all\n").status).toBe(
			"write_all",
		);
	});

	test("detects write scopes except id-token", () => {
		const result = scanWorkflowPermissions(`
permissions:
  contents: write
  id-token: write
`);
		expect(result.status).toBe("write_scope");
	});

	test("marks id-token write for OIDC review", () => {
		const result = scanWorkflowPermissions(`
permissions:
  contents: read
  id-token: write
`);
		expect(result.status).toBe("oidc_review");
	});

	test("accepts read-only and disabled permissions as safe", () => {
		expect(
			scanWorkflowPermissions(`
permissions:
  contents: read
  id-token: none
`).status,
		).toBe("safe_readonly");
		expect(scanWorkflowPermissions("permissions: {}\n").status).toBe(
			"safe_readonly",
		);
	});

	test("reports malformed permission entries as parse errors", () => {
		const result = scanWorkflowPermissions(`
permissions:
  contents:
`);
		expect(result.status).toBe("parse_error");
		expect(result.errors.length).toBeGreaterThan(0);
	});
});
