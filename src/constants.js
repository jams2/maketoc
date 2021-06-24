/* detail box states
 * 0: closed
 * 1: open - opened by local click or "open all", from 0
 * 2: openPrime - opened by "open all" from 1
 */

export const CLOSED = "CLOSED";
export const OPEN = "OPEN";
export const SUPER_OPEN = "SUPER_OPEN";
export const CLOSE_LOCAL = "CLOSE_LOCAL";
export const OPEN_LOCAL = "OPEN_LOCAL";
export const CLOSE_ALL = "CLOSE_ALL";
export const OPEN_ALL = "OPEN_ALL";

export const SUBTREE_STATE = {
    [CLOSED]: {
        [CLOSE_LOCAL]: CLOSED,
        [OPEN_LOCAL]: OPEN,
        [CLOSE_ALL]: CLOSED,
        [OPEN_ALL]: OPEN,
    },
    [OPEN]: {
        [CLOSE_LOCAL]: CLOSED,
        [OPEN_LOCAL]: OPEN,
        [CLOSE_ALL]: CLOSED,
        [OPEN_ALL]: SUPER_OPEN,
    },
    [SUPER_OPEN]: {
        [CLOSE_LOCAL]: CLOSED,
        [OPEN_LOCAL]: SUPER_OPEN,
        [CLOSE_ALL]: OPEN,
        [OPEN_ALL]: SUPER_OPEN,
    },
};



export const TYPE_TREE = true;
export const TYPE_FLAT = false;
export const TITLE_MAX_LENGTH = 50;
export const HEAVY_X = "&#10006;";

export const CONTAINER_CLASSES = `
mktc-font-sans
mktc-top-8 mktc-left-8 mktc-fixed
mktc-bg-white mktc-prose mktc-prose-sm
mktc-rounded-md mktc-shadow-md hover:mktc-shadow-lg mktc-transition-shadow mktc-duration-300
mktc-max-h-3/4 mktc-overflow-x-hidden mktc-overflow-y-hidden
mktc-z-max
`;

export const TOC_CLASSES = `
mktc-hidden mktc-pb-4 mktc-pr-8 mktc-pl-2 mktc-mt-0
mktc-text-sm mktc-text-gray-900 mktc-mt-1
`;

export const TITLE_CLASSES = `
mktc-block mktc-w-auto
mktc-mr-auto mktc-px-4 mktc-py-2
mktc-bg-green-100 mktc-text-green-900 mktc-font-bold
mktc-flex mktc-items-center
mktc-sticky mktc-top-0
mktc-shadow-sm
`;

export const OL_CLASSES = `mktc-p-0 mktc-pl-8`;

export const LI_CLASSES = `
mktc-p-0 mktc-py-2 last-of-type:mktc-pb-0
mktc-border-b-2 last-of-type:mktc-border-b-0`;

export const SUMMARY_CLASSES = ``;

export const X_CLASSES = `
mktc-ml-auto mktc-mr-0 mktc-font-normal
mktc-p-1 mktc-cursor-pointer
`;

