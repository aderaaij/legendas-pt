// Ambient declaration for side-effect CSS imports (e.g. `import "./globals.css"`).
// TypeScript 6.0 requires a type declaration for side-effect imports of
// non-code modules; Next.js does not ship one for global CSS imports.
declare module "*.css";
