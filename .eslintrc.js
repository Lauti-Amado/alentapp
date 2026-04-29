// https://eslint.org/docs/user-guide/configuring

module.exports = {
    root: true,
    parser: "@babel/eslint-parser",

    parserOptions: {
        sourceType: "module",
    },

    env: {
        es6: true,
        node: true,
        browser: true,
    },

    globals: {
        process: true,
        Vue: true,
        $: true,
        jQuery: true,
        NF: true,
        _: true,
        moment: true,
        numbro: true,
        FormValidation: true,
    },
    overrides: [
        {
            files: ["test/**"],
            globals: {
                describe: true,
                test: true,
                before: true,
            },
        },
    ],
    // required to lint *.vue files
    plugins: ["html", "prettier"],
    extends: ["eslint:recommended"],
    // add your custom rules here,
    rules: {
        "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0,
        "no-unused-vars": [
            "error",
            {
                caughtErrors: "none",
            },
        ],
    },
};
