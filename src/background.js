import {
    TOGGLE_FEATURE,
    TOGGLE_TOC,
    REFRESH_TOC,
    TOGGLE_MODE,
    TOGGLE_SUBTREES,
} from "./messages.js";

const browser = require("webextension-polyfill");

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
        case TOGGLE_SUBTREES:
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
