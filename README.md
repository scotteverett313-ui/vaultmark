# Vaultmark

Digital art authentication platform. A gallery or artist vaults an original,
receives a key credential, and anyone can verify a copy against it without
Vaultmark storing the artwork or the key.

## How the authentication works

The engine (`lib/engine.ts`) is pure, framework-free TypeScript:

1. **Capture** fingerprints the artwork — SHA-256 over the decoded pixels of a
   centre-cropped square, so the hash does not depend on file container or
   metadata.
2. **Vault** selects a region of the image, samples it into a 21×21 pixel grid,
   and masks it with one of four seeded QR symbols. The pixels under the mask
   are hashed into the key credential.
3. **Verify** takes an image and a key and re-runs three layers: whole-image
   fingerprint, QR mask reconstructed from the key's own symbol seed, and the
   masked-pixel hash recomputed at the key's stored region. It is stateless —
   nothing is read from a server.

## Development

```
npm install
npm run dev     # http://localhost:3000
npm test        # engine + session suites, Node's built-in runner
npm run build
```

Tests run through Node's native TypeScript stripping, so there is no test
framework dependency.
