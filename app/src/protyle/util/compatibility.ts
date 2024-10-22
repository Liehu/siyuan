import {focusByRange} from "./selection";
import {fetchPost} from "../../util/fetch";
import {Constants} from "../../constants";

export const openByMobile = (uri: string) => {
    if (!uri) {
        return;
    }
    if (isInIOS()) {
        if (uri.startsWith("assets/")) {
            window.webkit.messageHandlers.openLink.postMessage(encodeURI(location.origin + "/" + uri));
        } else {
            try {
                new URL(uri);
                window.webkit.messageHandlers.openLink.postMessage(encodeURI(uri));
            } catch (e) {
                window.webkit.messageHandlers.openLink.postMessage(encodeURI("https://" + uri));
            }
        }
    } else if (isInAndroid()) {
        window.JSAndroid.openExternal(uri);
    } else {
        window.open(uri);
    }
};

export const readText = () => {
    if (isInAndroid()) {
        return window.JSAndroid.readClipboard();
    }
    return navigator.clipboard.readText();
};

export const writeText = (text: string) => {
    let range: Range;
    if (getSelection().rangeCount > 0) {
        range = getSelection().getRangeAt(0).cloneRange();
    }
    try {
        // navigator.clipboard.writeText 抛出异常不进入 catch，这里需要先处理移动端复制
        if (isInAndroid()) {
            window.JSAndroid.writeClipboard(text);
            return;
        }
        if (isInIOS()) {
            window.webkit.messageHandlers.setClipboard.postMessage(text);
            return;
        }
        navigator.clipboard.writeText(text);
    } catch (e) {
        if (isInIOS()) {
            window.webkit.messageHandlers.setClipboard.postMessage(text);
        } else if (isInAndroid()) {
            window.JSAndroid.writeClipboard(text);
        } else {
            const textElement = document.createElement("textarea");
            textElement.value = text;
            textElement.style.position = "fixed";  //avoid scrolling to bottom
            document.body.appendChild(textElement);
            textElement.focus();
            textElement.select();
            document.execCommand("copy");
            document.body.removeChild(textElement);
            if (range) {
                focusByRange(range);
            }
        }
    }
};

export const copyPlainText = async (text: string) => {
    text = text.replace(new RegExp(Constants.ZWSP, "g"), ""); // `复制纯文本` 时移除所有零宽空格 https://github.com/siyuan-note/siyuan/issues/6674
    await writeText(text);
};

// 用户 iPhone 点击延迟/需要双击的处理
export const getEventName = () => {
    if (isIPhone()) {
        return "touchstart";
    } else {
        return "click";
    }
};

export const isOnlyMeta = (event: KeyboardEvent | MouseEvent) => {
    if (isMac()) {
        // mac
        if (event.metaKey && !event.ctrlKey) {
            return true;
        }
        return false;
    } else {
        if (!event.metaKey && event.ctrlKey) {
            return true;
        }
        return false;
    }
};

export const isNotCtrl = (event: KeyboardEvent | MouseEvent) => {
    if (!event.metaKey && !event.ctrlKey) {
        return true;
    }
    return false;
};

export const isHuawei = () => {
    return window.siyuan.config.system.osPlatform.toLowerCase().indexOf("huawei") > -1;
};

export const isIPhone = () => {
    return navigator.userAgent.indexOf("iPhone") > -1;
};

export const isIPad = () => {
    return navigator.userAgent.indexOf("iPad") > -1;
};

export const isMac = () => {
    return navigator.platform.toUpperCase().indexOf("MAC") > -1;
};

export const isInAndroid = () => {
    return window.siyuan.config.system.container === "android" && window.JSAndroid;
};

export const isInIOS = () => {
    return window.siyuan.config.system.container === "ios" && window.webkit?.messageHandlers;
};

export const isLocalhost = () => {
    return window.location.hostname === "127.0.0.1";
}

// Mac，Windows 快捷键展示
export const updateHotkeyTip = (hotkey: string) => {
    if (isMac()) {
        return hotkey;
    }

    const KEY_MAP = new Map(Object.entries({
        "⌘": "Ctrl",
        "⌃": "Ctrl",
        "⇧": "Shift",
        "⌥": "Alt",
        "⇥": "Tab",
        "⌫": "Backspace",
        "⌦": "Delete",
        "↩": "Enter",
    }));

    const keys = [];

    if ((hotkey.indexOf("⌘") > -1 || hotkey.indexOf("⌃") > -1)) keys.push(KEY_MAP.get("⌘"));
    if (hotkey.indexOf("⇧") > -1) keys.push(KEY_MAP.get("⇧"));
    if (hotkey.indexOf("⌥") > -1) keys.push(KEY_MAP.get("⌥"));

    // 不能去最后一个，需匹配 F2
    const lastKey = hotkey.replace(/⌘|⇧|⌥|⌃/g, "");
    if (lastKey) {
        keys.push(KEY_MAP.get(lastKey) || lastKey);
    }

    return keys.join("+");
};

export const getLocalStorage = (cb: () => void) => {
    fetchPost("/api/storage/getLocalStorage", undefined, (response) => {
        window.siyuan.storage = response.data;
        // 历史数据迁移
        const defaultStorage: any = {};
        defaultStorage[Constants.LOCAL_SEARCHASSET] = {
            keys: [],
            col: "",
            row: "",
            layout: 0,
            method: 0,
            types: {},
            sort: 0,
            k: "",
        };
        defaultStorage[Constants.LOCAL_SEARCHUNREF] = {
            col: "",
            row: "",
            layout: 0,
        };
        Constants.SIYUAN_ASSETS_SEARCH.forEach(type => {
            defaultStorage[Constants.LOCAL_SEARCHASSET].types[type] = true;
        });
        defaultStorage[Constants.LOCAL_SEARCHKEYS] = {
            keys: [],
            replaceKeys: [],
            col: "",
            row: "",
            layout: 0,
            colTab: "",
            rowTab: "",
            layoutTab: 0
        };
        defaultStorage[Constants.LOCAL_PDFTHEME] = {
            light: "light",
            dark: "dark",
            annoColor: "var(--b3-pdf-background1)"
        };
        defaultStorage[Constants.LOCAL_LAYOUTS] = [];   // {name: "", layout:{}, time: number, filespaths: filesPath[]}
        defaultStorage[Constants.LOCAL_AI] = [];   // {name: "", memo: ""}
        defaultStorage[Constants.LOCAL_PLUGIN_DOCKS] = {};  // { pluginName: {dockId: IPluginDockTab}}
        defaultStorage[Constants.LOCAL_PLUGINTOPUNPIN] = [];
        defaultStorage[Constants.LOCAL_OUTLINE] = {keepExpand: true};
        defaultStorage[Constants.LOCAL_FILEPOSITION] = {}; // {id: IScrollAttr}
        defaultStorage[Constants.LOCAL_DIALOGPOSITION] = {}; // {id: IPosition}
        defaultStorage[Constants.LOCAL_HISTORY] = {
            notebookId: "%", type: 0, operation: "all"
        };
        defaultStorage[Constants.LOCAL_FLASHCARD] = {
            fullscreen: false
        };
        defaultStorage[Constants.LOCAL_BAZAAR] = {
            theme: "0",
            template: "0",
            icon: "0",
            widget: "0",
        };
        defaultStorage[Constants.LOCAL_EXPORTWORD] = {removeAssets: false, mergeSubdocs: false};
        defaultStorage[Constants.LOCAL_EXPORTPDF] = {
            landscape: false,
            marginType: "0",
            scale: 1,
            pageSize: "A4",
            removeAssets: true,
            keepFold: false,
            mergeSubdocs: false,
            watermark: false
        };
        defaultStorage[Constants.LOCAL_EXPORTIMG] = {
            keepFold: false,
            watermark: false
        };
        defaultStorage[Constants.LOCAL_DOCINFO] = {
            id: "",
        };
        defaultStorage[Constants.LOCAL_FONTSTYLES] = [];
        defaultStorage[Constants.LOCAL_FILESPATHS] = [];    // filesPath[]
        defaultStorage[Constants.LOCAL_SEARCHDATA] = {
            page: 1,
            sort: 0,
            group: 0,
            hasReplace: false,
            method: 0,
            hPath: "",
            idPath: [],
            k: "",
            r: "",
            types: {
                document: window.siyuan.config.search.document,
                heading: window.siyuan.config.search.heading,
                list: window.siyuan.config.search.list,
                listItem: window.siyuan.config.search.listItem,
                codeBlock: window.siyuan.config.search.codeBlock,
                htmlBlock: window.siyuan.config.search.htmlBlock,
                mathBlock: window.siyuan.config.search.mathBlock,
                table: window.siyuan.config.search.table,
                blockquote: window.siyuan.config.search.blockquote,
                superBlock: window.siyuan.config.search.superBlock,
                paragraph: window.siyuan.config.search.paragraph,
                embedBlock: window.siyuan.config.search.embedBlock,
                databaseBlock: window.siyuan.config.search.databaseBlock,
            },
            replaceTypes: Object.assign({}, Constants.SIYUAN_DEFAULT_REPLACETYPES),
        };
        defaultStorage[Constants.LOCAL_ZOOM] = 1;

        [Constants.LOCAL_EXPORTIMG, Constants.LOCAL_SEARCHKEYS, Constants.LOCAL_PDFTHEME, Constants.LOCAL_BAZAAR,
            Constants.LOCAL_EXPORTWORD, Constants.LOCAL_EXPORTPDF, Constants.LOCAL_DOCINFO, Constants.LOCAL_FONTSTYLES,
            Constants.LOCAL_SEARCHDATA, Constants.LOCAL_ZOOM, Constants.LOCAL_LAYOUTS, Constants.LOCAL_AI,
            Constants.LOCAL_PLUGINTOPUNPIN, Constants.LOCAL_SEARCHASSET, Constants.LOCAL_FLASHCARD,
            Constants.LOCAL_DIALOGPOSITION, Constants.LOCAL_SEARCHUNREF, Constants.LOCAL_HISTORY,
            Constants.LOCAL_OUTLINE, Constants.LOCAL_FILEPOSITION, Constants.LOCAL_FILESPATHS,
            Constants.LOCAL_PLUGIN_DOCKS].forEach((key) => {
            if (typeof response.data[key] === "string") {
                try {
                    const parseData = JSON.parse(response.data[key]);
                    if (typeof parseData === "number") {
                        // https://github.com/siyuan-note/siyuan/issues/8852 Object.assign 会导致 number to Number
                        window.siyuan.storage[key] = parseData;
                    } else {
                        window.siyuan.storage[key] = Object.assign(defaultStorage[key], parseData);
                    }
                } catch (e) {
                    window.siyuan.storage[key] = defaultStorage[key];
                }
            } else if (typeof response.data[key] === "undefined") {
                window.siyuan.storage[key] = defaultStorage[key];
            }
        });
        // 搜索数据添加 replaceTypes 兼容
        if (!window.siyuan.storage[Constants.LOCAL_SEARCHDATA].replaceTypes ||
            Object.keys(window.siyuan.storage[Constants.LOCAL_SEARCHDATA].replaceTypes).length === 0) {
            window.siyuan.storage[Constants.LOCAL_SEARCHDATA].replaceTypes = Object.assign({}, Constants.SIYUAN_DEFAULT_REPLACETYPES);
        }
        cb();
    });
};

export const setStorageVal = (key: string, val: any, cb?: () => void) => {
    if (window.siyuan.config.readonly) {
        return;
    }
    fetchPost("/api/storage/setLocalStorageVal", {
        app: Constants.SIYUAN_APPID,
        key,
        val,
    }, () => {
        if (cb) {
            cb();
        }
    });
};
