const prettierConfig = require("eslint-config-prettier");

module.exports = [
  // Rekomendasi ESLint untuk Node.js CommonJS
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-undef": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "prefer-const": "error",
      "require-atomic-updates": "warn",
      "no-var": "error",
      "object-shorthand": "warn",
    },
    ignores: ["node_modules/", ".hermes/"],
  },
  // Matikan aturan ESLint yang bentrok dengan Prettier
  prettierConfig,
];
