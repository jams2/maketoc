module.exports = {
    important: true,
    mode: "jit",
    prefix: "mktc-",
    corePlugins: { preflight: false },
    purge: ["./src/maketoc.ts", "./src/constants.ts"],
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {
            maxHeight: {
                "3/4": "75vh",
            },
            zIndex: { max: "2147483647" },
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
};
