import { Action } from "./types";
import { browser } from "webextension-polyfill-ts";

function logError(error: string) {
    console.error(`background.js: ${error}`);
}

function dispatchKeyEvent(message: string) {
    const action = message as Action;
    switch (action) {
        case Action.TOGGLE_FEATURE:
        case Action.TOGGLE_TOC:
        case Action.REFRESH_TOC:
        case Action.TOGGLE_TOC_MODE:
        case Action.TOGGLE_SUBTREES:
            sendMessage(action);
            break;
        default:
            console.error(`Unknown message (${message})`);
    }
}

function sendMessage(message: Action) {
    browser.tabs
        .query({ currentWindow: true, active: true })
        .then((tabs) => browser.tabs.sendMessage(tabs[0].id, { message }))
        .catch(logError);
}

browser.commands.onCommand.addListener(dispatchKeyEvent);
