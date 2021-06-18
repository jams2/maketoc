module.exports = {
    mode: "jit",
    prefix: "mktc-",
    corePlugins: { preflight: false },
    purge: ["./maketoc.js"],
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {
            maxHeight: {
                '3/4': '75vh',
            }
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
}
