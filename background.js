const TOGGLE_FEATURE = "toggle-feature";
const TOGGLE_TOC = "toggle-toc";
const REFRESH_TOC = "refresh-toc";
const TOGGLE_MODE = "toggle-toc-mode";
const TOGGLE_SUB_TOCS = "toggle-sub-tocs";

function logError(error) {
    console.error(`background.js: ${error}`);
}

function dispatchKeyEvent(message) {
    console.group("MAKETOC MESSAGE DISPATCH");
    console.debug(message);
    switch (message) {
        case TOGGLE_FEATURE:
        case TOGGLE_TOC:
        case REFRESH_TOC:
        case TOGGLE_MODE:
        case TOGGLE_SUB_TOCS:
            sendMessage(message);
            break;
        default:
            console.error(`Unknown message (${message})`);
    }
    console.groupEnd();
}

function sendMessage(message) {
    browser.tabs.query({ currentWindow: true, active: true })
        .then(tabs => browser.tabs.sendMessage(tabs[0].id, { message }))
        .catch(logError);
}

browser.commands.onCommand.addListener(dispatchKeyEvent);
