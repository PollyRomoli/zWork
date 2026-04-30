# Security Policy

## Supported Versions

Currently, only the latest release of zWork receives security updates.

| Version | Supported |
|---------|-----------|
| Latest release | ✅ |
| Older releases | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability, please send an email to the project maintainers. Do not open public issues.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

### Response timeline

- Initial acknowledgment within 48 hours
- Detailed response within 7 days
- Patch release for critical issues within 14 days

### Private disclosure

We appreciate responsible disclosure. Please:
1. Don't discuss the issue publicly until it's fixed
2. Don't exploit the vulnerability for any reason
3. Provide us reasonable time to address the issue

## Security Best Practices

### For Users

- Only download zWork from official sources (GitHub Releases)
- Verify the checksum of downloaded installers when possible
- Keep your application updated to the latest version
- Review the source code before running custom builds

### For Developers

- Never commit API keys or secrets to the repository
- Use environment variables for sensitive configuration
- Follow secure coding practices for all contributions
- Review dependencies regularly for known vulnerabilities

## Security Features

### Local Data Protection

- All user data is stored locally by default
- Cloud sync requires explicit opt-in
- API keys are never transmitted without user consent

### Update Process

- Updates are signed using Tauri's built-in updater
- The updater verifies signatures before installation
- Manual verification is always available via GitHub Releases

### Authentication

- OAuth 2.0 flow through Google for account sign-in
- Session tokens are stored securely
- Users can revoke access at any time

## Security Audits

This project has not yet undergone a formal security audit. We plan to commission one before the v1.0 release.

## License

Security fixes will be backported to supported versions as needed. All security patches follow the project's main license.
