const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env, argv) => {
  const devMode = argv.mode !== "production";

  const staticAssets = [
    "manifest.json", "LICENSE", "img"
  ].map(folder => {
    return {from: `./${folder}`, to: `./${folder}`}
  });

  return {
    mode: "development",
    entry: {
      background: "./src/js/background.js",
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
    plugins: [
      new CleanWebpackPlugin(),
      new CopyWebpackPlugin(staticAssets),
      new HtmlWebpackPlugin({
        template: "./src/templates/background.html",
        filename: "background.html",
        chunks: ["background"]
      }),
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
    ]
  };
};
