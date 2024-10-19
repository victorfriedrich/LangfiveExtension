const siteApiMap = {
    'kino.pub': {
        subtitleTransformType: 'replace',
        subtitleSelector: '.jw-captions',
        subtitlePopupSelector: '#player',
        popupOffsetBottom: 4,
        pause() {
            var _a, _b;
            if ((_a = document.querySelector('video.jw-video')) === null || _a === void 0 ? void 0 : _a.paused)
                return false;
            (_b = document.querySelector('video.jw-video')) === null || _b === void 0 ? void 0 : _b.pause();
            return true;
        },
        play() {
            var _a;
            (_a = document.querySelector('video.jw-video')) === null || _a === void 0 ? void 0 : _a.play();
        },
    },
    'www.netflix.com': {
        subtitleTransformType: 'replace',
        subtitleSelector: '.player-timedtext:not(.billboard .player-timedtext)',
        subtitlePopupSelector: '.watch-video',
        popupOffsetBottom: 0,
        pause() {
            var _a;
            if (document.querySelector('[data-uia^="control-play-pause-play"]'))
                return false;
            (_a = document
                .querySelector('[data-uia^="control-play-pause-pause"]')) === null || _a === void 0 ? void 0 : _a.click();
            return true;
        },
        play() {
            var _a;
            (_a = document
                .querySelector('[data-uia^="control-play-pause-play"]')) === null || _a === void 0 ? void 0 : _a.click();
        },
    },
    'www.youtube.com': {
        subtitleTransformType: 'replace',
        subtitleSelector: '#movie_player .ytp-caption-window-container',
        subtitlePopupSelector: '#movie_player',
        popupOffsetBottom: 8,
        pause() {
            var _a, _b;
            if ((_a = document.querySelector('#movie_player video')) === null || _a === void 0 ? void 0 : _a.paused)
                return false;
            (_b = document.querySelector('#movie_player video')) === null || _b === void 0 ? void 0 : _b.pause();
            return true;
        },
        play() {
            var _a;
            (_a = document.querySelector('#movie_player video')) === null || _a === void 0 ? void 0 : _a.play();
        },
    },
    'localhost:3000': {
        subtitleTransformType: 'replace',
        subtitleSelector: '#movie_player .ytp-caption-window-container',
        subtitlePopupSelector: '#movie_player',
        popupOffsetBottom: 8,
        pause() {
            var _a, _b;
            if ((_a = document.querySelector('#movie_player video')) === null || _a === void 0 ? void 0 : _a.paused)
                return false;
            (_b = document.querySelector('#movie_player video')) === null || _b === void 0 ? void 0 : _b.pause();
            return true;
        },
        play() {
            var _a;
            (_a = document.querySelector('#movie_player video')) === null || _a === void 0 ? void 0 : _a.play();
        },
    },
    'www.primevideo.com': {
        subtitleTransformType: 'mask',
        subtitleSelector: '.atvwebplayersdk-captions-overlay',
        maskContainerSelector: '.atvwebplayersdk-captions-text',
        subtitlePopupSelector: '.atvwebplayersdk-overlays-container',
        popupOffsetBottom: 4,
        pause() {
            var _a, _b;
            if ((_a = document.querySelector('#dv-web-player video')) === null || _a === void 0 ? void 0 : _a.paused)
                return false;
            (_b = document.querySelector('#dv-web-player video')) === null || _b === void 0 ? void 0 : _b.pause();
            return true;
        },
        play() {
            var _a;
            (_a = document.querySelector('#dv-web-player video')) === null || _a === void 0 ? void 0 : _a.play();
        },
    },
};
function isAllowedHost(host) {
    return host in siteApiMap;
}
export function getSiteSpecificApi(host) {
    if (isAllowedHost(host))
        return siteApiMap[host];
    return {
        subtitleTransformType: 'replace',
        subtitleSelector: '',
        subtitlePopupSelector: '',
        popupOffsetBottom: 0,
        pause: () => false,
        play: () => undefined,
    };
}
//# sourceMappingURL=siteApi.js.map