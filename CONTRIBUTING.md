# Contributing

Thanks for your interest in contributing!

## How to contribute
- Open an issue to discuss large changes before starting.
- Fork the repo and create a feature branch.
- Keep changes focused and add tests where relevant.
- Ensure `npm run dev` works locally and type checks pass.
- Open a PR with a clear description and screenshots for UI-visible changes.

## Development
- Node 18+
- Cloudflare Wrangler (see README)
- TypeScript

## Coding guidelines
- Keep the Worker stateless.
- Avoid Node-specific APIs (use Web/Workers-compatible libs).
- Favor small, composable modules.

## Commit messages
- Use concise, imperative style: "add X", "fix Y".

## License
By contributing you agree your contributions are licensed under the MIT License.
