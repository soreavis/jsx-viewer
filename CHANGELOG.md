# Changelog

All notable changes to this project are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- `--export` no longer overwrites its own input. The output name was produced by
  substituting `.jsx` with `.html`, which left any other extension unchanged, so
  the output path equalled the input path and the source file was replaced by the
  generated HTML. Export now strips a trailing `.jsx` and appends `.html`.

### Added
- `docs/` — getting started, CLI reference, how it works, supported syntax, and
  troubleshooting.

## [1.0.0] — 2026-03-15

### Added
- Zero-dependency JSX live preview server (Node.js built-ins only)
- Live reload via Server-Sent Events
- React 18 + Babel Standalone loaded from CDN
- Export mode — generates a self-contained HTML file
- Error overlay for transpilation and runtime errors
- Auto-opens browser on startup
- Port auto-increment when default port is in use
