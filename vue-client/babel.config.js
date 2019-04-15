module.exports = {
  presets: [
    ["@babel/preset-env"],
    ["@babel/preset-react"],
  ],
  plugins: [
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    ["@babel/plugin-proposal-class-properties", { "loose": true }],
    ["@babel/plugin-syntax-jsx"],
    ["@babel/plugin-transform-react-jsx"],
    ["@babel/plugin-syntax-dynamic-import"],
    ["@babel/plugin-transform-runtime"],
  ],
}
