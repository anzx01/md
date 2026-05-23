# Security Policy

## Reporting Security Issues

Please report suspected vulnerabilities privately to the repository maintainer. Avoid opening public issues that contain credentials, tokens, connection strings, or reproducible exploit details.

## Secret Handling

- Do not commit `.env`, private keys, database URLs, API keys, or local tool configuration.
- Use `.env.example` for placeholder configuration only.
- If a credential has been committed, revoke or rotate it immediately before relying on any repository cleanup.
- If the repository has already been shared, also remove the credential from Git history and coordinate with anyone who cloned it.
