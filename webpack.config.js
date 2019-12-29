const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

function copyStaticAssets(files, folders) {
  const staticAssets = [];
  const collectAssets = (assets, toType) => {
    assets.forEach(asset => {
      staticAssets.push({from: `./${asset}`, to: `./${asset}`, toType})
    });
  }
  collectAssets(files, "file");
  collectAssets(folders, "dir");
  return new CopyWebpackPlugin(staticAssets);
}

module.exports = (env, argv) => {
  const devMode = argv.mode !== "production";

  const plugins = [
    copyStaticAssets(
      ["manifest.json", ".web-extension-id", "LICENSE.md"],
      ["img"]
    ),
    new HtmlWebpackPlugin({
      template: "./src/templates/popup.html",
      filename: "popup.html",
      chunks: ["popup"]
    }),
    new HtmlWebpackPlugin({
      template: "./src/templates/options.html",
      filename: "options.html",
      chunks: ["options"]
    })
  ];
  if (devMode) {
    plugins.unshift(new CleanWebpackPlugin());
  }

  return {
    mode: "development",
    entry: {
      popup: "./src/js/popup.js",
      options: "./src/js/options.js"
    },
    output: {
      path: path.resolve(__dirname, "addon"),
      filename: "[name].js",
      publicPath: "/"
    },
    devtool: devMode ? "source-map" : false,
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                ["@babel/preset-env", {modules: false}]
              ]
            }
          }
        },
        {
          test: /\.(s*)css$/,
          use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"]
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
          use: ["file-loader"]
        }
      ]
    },
    plugins
  };
};
