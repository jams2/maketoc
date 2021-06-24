const path = require("path");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');


module.exports = (env) => ({
    mode: env.development ? "development" : "production",
    devtool: env.development ? "inline-source-map" : "source-map",
    entry: {
        maketoc: "./src/maketoc.js",
        background: "./src/background.js",
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    plugins: [new MiniCssExtractPlugin()],
    module: {
        rules: [
            {
                test: /\.css/i,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader",
                    "postcss-loader",
                ],
            }
        ]
    }
});
