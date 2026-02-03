export {}; // 👈 makes this file an ES module

const file = process.env.npm_config_file;

if (!file) {
  console.error("Usage: npm run test --file=<name>.ts");
  process.exit(1);
}

if (!file.endsWith(".ts")) {
  console.error("Error: file must be a .ts file");
  process.exit(1);
}

await import(`./${file}`);
