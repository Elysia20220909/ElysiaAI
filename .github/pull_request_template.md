## Summary

Describe the change in one or two sentences.

## Impact

- [ ] Code
- [ ] Configuration
- [ ] Infrastructure
- [ ] Documentation

## Scope

- [ ] Docs
- [ ] CI / release
- [ ] Security
- [ ] Backend
- [ ] Python kernel
- [ ] Rust shield-agent
- [ ] UI / desktop

## Verification

Commands run:

```text
# paste commands here
```

Results:

```text
# paste short result summary here
```

## Risk

- [ ] Low
- [ ] Medium
- [ ] High

## Security review

- [ ] No secrets, tokens, webhook URLs, or private paths are included.
- [ ] Inputs and authorization boundaries were reviewed or are not affected.
- [ ] Logs, errors, and artifacts do not expose sensitive data.
- [ ] Dependency updates were checked against changelogs or release notes.
- [ ] RAG content is treated as untrusted reference material.
- [ ] External posts, file writes, and destructive operations require human confirmation.
- [ ] CodeQL, Secret Scanning, lint, and tests are passing or explicitly explained.

## Rollback

Describe the safest rollback path. For a normal merged PR:

```bash
git log --oneline --merges -n 5
git revert -m 1 <MERGE_SHA>
git push origin master
```

## Notes for reviewers

Add anything reviewers should focus on.
