(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Madara = void 0;
const Source_1 = require("./Source");
const Manga_1 = require("../models/Manga");
class Madara extends Source_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    //This is to let Madara sources override selectors without needing to override whole methods
    get titleSelector() { return 'div.post-title h1'; }
    get authorSelector() { return 'div.author-content'; }
    get genresSelector() { return 'div.genres-content a'; }
    get artistSelector() { return 'div.artist-content'; }
    get ratingSelector() { return 'span#averagerate'; }
    get thumbnailSelector() { return 'div.summary_image img'; }
    get thumbnailAttr() { return 'src'; }
    get chapterListSelector() { return 'li.wp-manga-chapter'; }
    get pageListSelector() { return 'div.page-break'; }
    get pageImageAttr() { return 'src'; }
    get searchMangaSelector() { return 'div.c-tabs-item__content'; }
    get searchCoverAttr() { return 'src'; }
    getMangaDetailsRequest(ids) {
        let requests = [];
        for (let id of ids) {
            let metadata = { 'id': id };
            requests.push(createRequestObject({
                url: this.MadaraDomain + "/manga/" + id,
                metadata: metadata,
                method: 'GET'
            }));
        }
        return requests;
    }
    getMangaDetails(data, metadata) {
        var _a, _b;
        let manga = [];
        let $ = this.cheerio.load(data);
        let title = $(this.titleSelector).first().children().remove().end().text().trim();
        let titles = [title];
        titles.push.apply(titles, $('div.summary-content').eq(2).text().trim().split(", "));
        let author = $(this.authorSelector).text().trim();
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] })];
        for (let genre of $(this.genresSelector).toArray()) {
            let id = (_b = (_a = $(genre).attr("href")) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
            let tag = $(genre).text();
            tagSections[0].tags.push(createTag({ id: id, label: tag }));
        }
        let status = ($("div.summary-content").last().text() == "Completed") ? Manga_1.MangaStatus.COMPLETED : Manga_1.MangaStatus.ONGOING;
        let averageRating = $(this.ratingSelector).text().trim();
        let src = $(this.thumbnailSelector).attr(this.thumbnailAttr);
        //Not sure if that double slash happens with any Madara source, but added just in case
        src = (src === null || src === void 0 ? void 0 : src.startsWith("http")) ? src : this.MadaraDomain + (src === null || src === void 0 ? void 0 : src.replace("//", ""));
        let artist = $(this.artistSelector).text().trim();
        let description = ($("div.description-summary  div.summary__content").find("p").text() != "") ? $("div.description-summary  div.summary__content").find("p").text().replace(/<br>/g, '\n') : $("div.description-summary  div.summary__content").text();
        return [createManga({
                id: metadata.id,
                titles: titles,
                image: src,
                avgRating: Number(averageRating),
                rating: Number(averageRating),
                author: author,
                artist: artist,
                desc: description,
                status: status,
                tags: tagSections,
                langName: this.language,
                langFlag: this.langFlag
            })];
    }
    getChaptersRequest(mangaId) {
        let metadata = { 'id': mangaId };
        return createRequestObject({
            url: `${this.MadaraDomain}/manga/${mangaId}`,
            method: "GET",
            metadata: metadata
        });
    }
    getChapters(data, metadata) {
        let $ = this.cheerio.load(data);
        let chapters = [];
        for (let elem of $(this.chapterListSelector).toArray()) {
            let name = $(elem).find("a").first().text().trim();
            let id = /[0-9.]+/.exec(name)[0];
            let imgDate = $(elem).find("img").attr("alt");
            let time = (imgDate != undefined) ? this.convertTime(imgDate) : this.parseChapterDate($(elem).find("span.chapter-release-date i").first().text());
            chapters.push(createChapter({
                id: id !== null && id !== void 0 ? id : '',
                chapNum: Number(id),
                mangaId: metadata.id,
                name: name,
                time: time,
                langCode: this.langCode,
            }));
        }
        return chapters;
    }
    parseChapterDate(date) {
        if (date.toLowerCase().includes("ago")) {
            return this.convertTime(date);
        }
        if (date.toLowerCase().startsWith("yesterday")) {
            //To start it at the beginning of yesterday, instead of exactly 24 hrs prior to now
            return new Date((Math.floor(Date.now() / 86400000) * 86400000) - 86400000);
        }
        if (date.toLowerCase().startsWith("today")) {
            return new Date(Math.floor(Date.now() / 86400000) * 8640000);
        }
        if (/\d+(st|nd|rd|th)/.test(date)) {
            let match = /\d+(st|nd|rd|th)/.exec(date)[0];
            let day = match.replace(/\D/g, "");
            return new Date(date.replace(match, day));
        }
        return new Date(date);
    }
    getChapterDetailsRequest(mangaId, chId) {
        let metadata = { 'mangaId': mangaId, 'chapterId': chId, 'nextPage': false, 'page': 1 };
        return createRequestObject({
            url: `${this.MadaraDomain}/manga/${mangaId}/chapter-${chId.replace('.', '-')}`,
            method: "GET",
            metadata: metadata
        });
    }
    getChapterDetails(data, metadata) {
        var _a;
        let pages = [];
        let $ = this.cheerio.load(data);
        let pageElements = $(this.pageListSelector);
        for (let page of pageElements.toArray()) {
            pages.push((_a = $(page)) === null || _a === void 0 ? void 0 : _a.find("img").first().attr(this.pageImageAttr).trim());
        }
        let chapterDetails = createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages: pages,
            longStrip: false
        });
        return chapterDetails;
    }
    constructSearchRequest(query, page) {
        var _a;
        let url = `${this.MadaraDomain}/page/${page}/?`;
        let author = query.author || '';
        let artist = query.artist || '';
        let genres = ((_a = query.includeGenre) !== null && _a !== void 0 ? _a : []).join(",");
        let paramaters = { "s": query.title, "post_type": "wp-manga", "author": author, "artist": artist, "genres": genres };
        return createRequestObject({
            url: url + new URLSearchParams(paramaters).toString(),
            method: 'GET',
            metadata: {
                request: query,
                page: page
            }
        });
    }
    searchRequest(query) {
        var _a;
        return (_a = this.constructSearchRequest(query, 1)) !== null && _a !== void 0 ? _a : null;
    }
    search(data, metadata) {
        var _a, _b, _c;
        let $ = this.cheerio.load(data);
        let mangas = [];
        for (let manga of $(this.searchMangaSelector).toArray()) {
            let id = (_b = (_a = $("div.post-title a", manga).attr("href")) === null || _a === void 0 ? void 0 : _a.split("/")[4]) !== null && _b !== void 0 ? _b : '';
            if (!id.endsWith("novel")) {
                let cover = $("img", manga).first().attr(this.searchCoverAttr);
                cover = (cover === null || cover === void 0 ? void 0 : cover.startsWith("http")) ? cover : this.MadaraDomain + (cover === null || cover === void 0 ? void 0 : cover.replace("//", "/"));
                let title = $("div.post-title a", manga).text();
                let author = $("div.summary-content > a[href*=manga-author]", manga).text().trim();
                let alternatives = $("div.summary-content", manga).first().text().trim();
                mangas.push(createMangaTile({
                    id: id,
                    image: cover,
                    title: createIconText({ text: title !== null && title !== void 0 ? title : '' }),
                    subtitleText: createIconText({ text: author !== null && author !== void 0 ? author : '' })
                }));
            }
        }
        return createPagedResults({
            results: mangas,
            nextPage: (_c = this.constructSearchRequest(metadata.query, metadata.page + 1)) !== null && _c !== void 0 ? _c : undefined
        });
    }
}
exports.Madara = Madara;

},{"../models/Manga":11,"./Source":3}],3:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
class Source {
    constructor(cheerio) {
        this.cheerio = cheerio;
    }
    /**
     * An optional field where the author may put a link to their website
     */
    get authorWebsite() { return null; }
    /**
     * An optional field that defines the language of the extension's source
     */
    get language() { return 'all'; }
    /**
     * An optional field of source tags: Little bits of metadata which is rendered on the website
     * under your repositories section
     */
    get sourceTags() { return []; }
    // <-----------        OPTIONAL METHODS        -----------> //
    requestModifier(request) { return request; }
    getMangaShareUrl(mangaId) { return null; }
    getCloudflareBypassRequest() { return null; }
    /**
     * Returns the number of calls that can be done per second from the application
     * This is to avoid IP bans from many of the sources
     * Can be adjusted per source since different sites have different limits
     */
    get rateLimit() { return 2; }
    /**
     * (OPTIONAL METHOD) Different sources have different tags available for searching. This method
     * should target a URL which allows you to parse apart all of the available tags which a website has.
     * This will populate tags in the iOS application where the user can use
     * @returns A request object which can provide HTML for determining tags that a source uses
     */
    getTagsRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.getTags}
     * and generate a list of {@link TagSection} objects, determining what sections of tags an app has, as well as
     * what tags are associated with each section
     * @param data HTML which can be parsed to get tag information
     */
    getTags(data) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle generating a request for determining whether or
     * not a manga has been updated since a specific reference time.
     * This method is different depending on the source. A current implementation for a source, as example,
     * is going through multiple pages of the 'latest' section, and determining whether or not there
     * are entries available before your supplied date.
     * @param ids The manga IDs which you are searching for updates on
     * @param time A {@link Date} marking the point in time you'd like to search up from.
     * Eg, A date of November 2020, when it is currently December 2020, should return all instances
     * of the image you are searching for, which has been updated in the last month
     * @param page A page number parameter may be used if your update scanning requires you to
     * traverse multiple pages.
     */
    filterUpdatedMangaRequest(ids, time) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.filterUpdatedMangaRequest}
     * and generate a list manga which has been updated within the timeframe specified in the request.
     * @param data HTML which can be parsed to determine whether or not a Manga has been updated or not
     * @param metadata Anything passed to the {@link Request} object in {@link Source.filterUpdatedMangaRequest}
     * with the key of metadata will be available to this method here in this parameter
     * @returns A list of mangaID which has been updated. Also, a nextPage parameter is required. This is a flag
     * which should be set to true, if you need to traverse to the next page of your search, in order to fully
     * determine whether or not you've gotten all of the updated manga or not. This will increment
     * the page number in the {@link Source.filterUpdatedMangaRequest} method and run it again with the new
     * parameter
     */
    filterUpdatedManga(data, metadata) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should generate a {@link HomeSectionRequest} with the intention
     * of parsing apart a home page of a source, and grouping content into multiple categories.
     * This does not exist for all sources, but sections you would commonly see would be
     * 'Latest Manga', 'Hot Manga', 'Recommended Manga', etc.
     * @returns A list of {@link HomeSectionRequest} objects. A request for search section on the home page.
     * It is likely that your request object will be the same in all of them.
     */
    getHomePageSectionRequest() { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart HTML returned from {@link Source.getHomePageSectionRequest}
     * and finish filling out the {@link HomeSection} objects.
     * Generally this simply should update the parameter objects with all of the correct contents, and
     * return the completed array
     * @param data The HTML which should be parsed into the {@link HomeSection} objects. There may only be one element in the array, that is okay
     * if only one section exists
     * @param section The list of HomeSection objects which are unfinished, and need filled out
     */
    getHomePageSections(data, section) { return null; }
    /**
     * (OPTIONAL METHOD) A function which should handle parsing apart a page
     * and generate different {@link MangaTile} objects which can be found on it
     * @param data HTML which should be parsed into a {@link MangaTile} object
     * @param key
     */
    getViewMoreItems(data, key, metadata) { return null; }
    // <-----------        PROTECTED METHODS        -----------> //
    // Many sites use '[x] time ago' - Figured it would be good to handle these cases in general
    convertTime(timeAgo) {
        var _a;
        let time;
        let trimmed = Number(((_a = /\d*/.exec(timeAgo)) !== null && _a !== void 0 ? _a : [])[0]);
        trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
        if (timeAgo.includes('minutes')) {
            time = new Date(Date.now() - trimmed * 60000);
        }
        else if (timeAgo.includes('hours')) {
            time = new Date(Date.now() - trimmed * 3600000);
        }
        else if (timeAgo.includes('days')) {
            time = new Date(Date.now() - trimmed * 86400000);
        }
        else if (timeAgo.includes('year') || timeAgo.includes('years')) {
            time = new Date(Date.now() - trimmed * 31556952000);
        }
        else {
            time = new Date(Date.now());
        }
        return time;
    }
}
exports.Source = Source;

},{}],4:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Madara"), exports);
__exportStar(require("./Source"), exports);

},{"./Madara":2,"./Source":3}],5:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./base"), exports);
__exportStar(require("./models"), exports);
__exportStar(require("./APIWrapper"), exports);

},{"./APIWrapper":1,"./base":4,"./models":19}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],7:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],8:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],9:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCode = void 0;
var LanguageCode;
(function (LanguageCode) {
    LanguageCode["UNKNOWN"] = "_unknown";
    LanguageCode["BENGALI"] = "bd";
    LanguageCode["BULGARIAN"] = "bg";
    LanguageCode["BRAZILIAN"] = "br";
    LanguageCode["CHINEESE"] = "cn";
    LanguageCode["CZECH"] = "cz";
    LanguageCode["GERMAN"] = "de";
    LanguageCode["DANISH"] = "dk";
    LanguageCode["ENGLISH"] = "gb";
    LanguageCode["SPANISH"] = "es";
    LanguageCode["FINNISH"] = "fi";
    LanguageCode["FRENCH"] = "fr";
    LanguageCode["WELSH"] = "gb";
    LanguageCode["GREEK"] = "gr";
    LanguageCode["CHINEESE_HONGKONG"] = "hk";
    LanguageCode["HUNGARIAN"] = "hu";
    LanguageCode["INDONESIAN"] = "id";
    LanguageCode["ISRELI"] = "il";
    LanguageCode["INDIAN"] = "in";
    LanguageCode["IRAN"] = "ir";
    LanguageCode["ITALIAN"] = "it";
    LanguageCode["JAPANESE"] = "jp";
    LanguageCode["KOREAN"] = "kr";
    LanguageCode["LITHUANIAN"] = "lt";
    LanguageCode["MONGOLIAN"] = "mn";
    LanguageCode["MEXIAN"] = "mx";
    LanguageCode["MALAY"] = "my";
    LanguageCode["DUTCH"] = "nl";
    LanguageCode["NORWEGIAN"] = "no";
    LanguageCode["PHILIPPINE"] = "ph";
    LanguageCode["POLISH"] = "pl";
    LanguageCode["PORTUGUESE"] = "pt";
    LanguageCode["ROMANIAN"] = "ro";
    LanguageCode["RUSSIAN"] = "ru";
    LanguageCode["SANSKRIT"] = "sa";
    LanguageCode["SAMI"] = "si";
    LanguageCode["THAI"] = "th";
    LanguageCode["TURKISH"] = "tr";
    LanguageCode["UKRAINIAN"] = "ua";
    LanguageCode["VIETNAMESE"] = "vn";
})(LanguageCode = exports.LanguageCode || (exports.LanguageCode = {}));

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MangaStatus = void 0;
var MangaStatus;
(function (MangaStatus) {
    MangaStatus[MangaStatus["ONGOING"] = 1] = "ONGOING";
    MangaStatus[MangaStatus["COMPLETED"] = 0] = "COMPLETED";
})(MangaStatus = exports.MangaStatus || (exports.MangaStatus = {}));

},{}],12:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],13:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],14:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],15:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],16:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagType = void 0;
/**
 * An enumerator which {@link SourceTags} uses to define the color of the tag rendered on the website.
 * Five types are available: blue, green, grey, yellow and red, the default one is blue.
 * Common colors are red for (Broken), yellow for (+18), grey for (Country-Proof)
 */
var TagType;
(function (TagType) {
    TagType["BLUE"] = "default";
    TagType["GREEN"] = "success";
    TagType["GREY"] = "info";
    TagType["YELLOW"] = "warning";
    TagType["RED"] = "danger";
})(TagType = exports.TagType || (exports.TagType = {}));

},{}],18:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],19:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Chapter"), exports);
__exportStar(require("./ChapterDetails"), exports);
__exportStar(require("./HomeSection"), exports);
__exportStar(require("./Manga"), exports);
__exportStar(require("./MangaTile"), exports);
__exportStar(require("./RequestObject"), exports);
__exportStar(require("./SearchRequest"), exports);
__exportStar(require("./TagSection"), exports);
__exportStar(require("./SourceTag"), exports);
__exportStar(require("./Languages"), exports);
__exportStar(require("./Constants"), exports);
__exportStar(require("./MangaUpdate"), exports);
__exportStar(require("./PagedResults"), exports);

},{"./Chapter":6,"./ChapterDetails":7,"./Constants":8,"./HomeSection":9,"./Languages":10,"./Manga":11,"./MangaTile":12,"./MangaUpdate":13,"./PagedResults":14,"./RequestObject":15,"./SearchRequest":16,"./SourceTag":17,"./TagSection":18}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lelmangavf = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const LM_DOMAIN = 'https://www.lelmangavf.com';
class Lelmangavf extends paperback_extensions_common_1.Source {
    constructor(cheerio) {
        super(cheerio);
    }
    // @getBoolean
    get version() { return '1.0.4'; }
    get name() { return 'Lelmangavf'; }
    get icon() { return 'icon.png'; }
    get author() { return 'getBoolean'; }
    get authorWebsite() { return 'https://github.com/getBoolean'; }
    get language() { return 'French'; }
    get description() { return 'Extension that pulls manga from Lelmangavf.'; }
    get hentaiSource() { return false; }
    getMangaShareUrl(mangaId) {
        return `${LM_DOMAIN}/scan-manga/${mangaId}`;
    }
    get websiteBaseURL() { return LM_DOMAIN; }
    get rateLimit() { return 2; }
    get sourceTags() {
        return [
            {
                text: "French",
                type: paperback_extensions_common_1.TagType.GREY
            },
        ];
    }
    // Done: @getBoolean
    getMangaDetailsRequest(ids) {
        console.log('Inside getMangaDetailsRequest()');
        let requests = [];
        for (let id of ids) {
            console.log(`id: ${id}`);
            let metadata = {
                'id': id,
                'url': `${LM_DOMAIN}/scan-manga/`,
            };
            requests.push(createRequestObject({
                url: `${LM_DOMAIN}/scan-manga/`,
                metadata: metadata,
                method: 'GET',
                param: id,
            }));
        }
        return requests;
    }
    // Done: @getBoolean
    getMangaDetails(data, metadata) {
        var _a, _b, _c;
        console.log('Inside getMangaDetails()');
        let manga = [];
        let $ = this.cheerio.load(data);
        let panel = $('.row').first();
        let table = $('.dl-horizontal', panel).first();
        let title = (_a = $('.widget-title', panel).first().text()) !== null && _a !== void 0 ? _a : '';
        title = this.parseString(title);
        let image = (_b = $('img', panel).attr('src')) !== null && _b !== void 0 ? _b : '';
        image = image.replace('//', 'https://');
        let author = $('.dl-horizontal dd:nth-child(6)').text().replace(/\r?\n|\r/g, '');
        let artist = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '');
        let rating = Number($(".rating div[id='item-rating']").attr('data-score'));
        let status = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '').trim() == 'Ongoing' ? paperback_extensions_common_1.MangaStatus.ONGOING : paperback_extensions_common_1.MangaStatus.COMPLETED;
        let titles = [title]; // Updated below
        let lastUpdate = ''; // Updated below
        let hentai = false;
        let tagSections = [createTagSection({ id: '0', label: 'genres', tags: [] }), createTagSection({ id: '1', label: 'format', tags: [] })];
        // Genres
        let elems = $('.tag-links', table).children();
        let genres = [];
        genres = Array.from(elems, x => $(x).text());
        tagSections[0].tags = genres.map((elem) => createTag({ id: elem, label: elem }));
        hentai = genres.includes('Mature') ? true : false;
        // Date
        let dateModified = (_c = $('.chapters .date-chapter-title-rtl').first().text().trim()) !== null && _c !== void 0 ? _c : '';
        let time = new Date(dateModified);
        lastUpdate = time.toDateString();
        // Alt Titles
        let altTitles = $('.dl-horizontal dd:nth-child(4)').text().trim().split(', ');
        for (let alt of altTitles) {
            alt = this.parseString(alt);
            titles.push(alt.trim());
        }
        let summary = $('.well', panel).children().last().text().replace(/^\s+|\s+$/g, '');
        summary = this.parseString(summary);
        // MangaID
        // console.log(`metadata.id: ${metadata.id}`);
        manga.push(createManga({
            id: metadata.id,
            titles: titles,
            image: image,
            rating: Number(rating),
            status: status,
            artist: artist,
            author: author,
            tags: tagSections,
            // views: views,
            // follows: follows,
            lastUpdate: lastUpdate,
            desc: summary,
            hentai: hentai
        }));
        return manga;
    }
    // Done: @getBoolean
    getChaptersRequest(mangaId) {
        console.log('Inside getChaptersRequest()');
        // console.log(mangaId);
        let metadata = {
            'url': `${LM_DOMAIN}/scan-manga/`,
            'id': mangaId,
        };
        // console.log(`${SM_DOMAIN}/manga/${mangaId}/`);
        return createRequestObject({
            url: `${LM_DOMAIN}/scan-manga/`,
            metadata: metadata,
            method: 'GET',
            param: `${mangaId}`,
        });
    }
    // Done: @getBoolean
    getChapters(data, metadata) {
        var _a, _b;
        console.log('Inside getChapters()');
        console.log(`metadata.url: ${metadata.url}`);
        console.log(`metadata.id: ${metadata.id}`);
        let chapters = [];
        let $ = this.cheerio.load(data);
        // let panel = $('.row').first();
        // let title = $('.widget-title', panel).first().text() ?? '';
        let allChapters = $('.chapters .chapter-title-rtl').toArray();
        // console.log(metadata.url + metadata.id);
        for (let chapter of allChapters) {
            let item = $(chapter);
            let chapterUrl = (_a = $('a', item).attr('href')) !== null && _a !== void 0 ? _a : '';
            // console.log(`item.text(): ${item.text().replace(/\r?\n|\r/g, '').trim()}`);
            // let name: string = item.text().replace(/\r?\n|\r/g, '').trim().split(' :').pop() ?? '';
            let name = item.text().replace(/\r?\n|\r/g, '').trim();
            name = name.slice(name.indexOf(':') + 1, name.length);
            if (name == '') {
                name = item.text().replace(/\r?\n|\r/g, '').trim().split(':')[0].trim();
            }
            let chNum = Number(item.text().replace(/\r?\n|\r/g, '').trim().split(':')[0].trim().split(' ').pop());
            if (Number.isNaN(chNum)) {
                chNum = -9999;
            }
            // console.log(id);
            let timeString = (_b = $('.chapters .date-chapter-title-rtl').first().text().trim()) !== null && _b !== void 0 ? _b : '';
            let time;
            if (timeString.includes('a'))
                time = super.convertTime(timeString.replace('mins', 'minutes').replace('hour', 'hours'));
            else
                time = new Date(timeString);
            chapters.push(createChapter({
                id: chapterUrl,
                mangaId: metadata.id,
                name: this.parseString(name),
                langCode: paperback_extensions_common_1.LanguageCode.FRENCH,
                chapNum: chNum,
                time: time,
            }));
        }
        return chapters;
    }
    // Done: @getBoolean
    getChapterDetailsRequest(mangaId, chapId) {
        console.log('in getChapterDetailsRequest()');
        let metadata = {
            'mangaId': mangaId,
            'chapterId': chapId,
            'nextPage': false,
            'page': 1
        };
        return createRequestObject({
            url: `${chapId}`,
            method: "GET",
            metadata: metadata,
        });
    }
    // Done: @getBoolean
    getChapterDetails(data, metadata) {
        var _a;
        console.log('Inside getChapterDetails()');
        let $ = this.cheerio.load(data);
        // console.log(originalImageName);
        // console.log(pages[0]);
        let items = $('img', '.col-sm-8').toArray();
        items.pop(); // Get rid of extra item
        // let pages = Array.from(items, x=>$(x).attr('data-src')?.replace(' //', 'https://').trim() ?? '' )
        // if (typeof id === 'undefined' || typeof image === 'undefined') continue
        let pages = [];
        for (let item of items) {
            let page = (_a = $(item).attr('data-src')) === null || _a === void 0 ? void 0 : _a.replace(' //', 'https://').trim();
            // If page is undefined, dont push it
            if (typeof page === 'undefined')
                continue;
            pages.push(page);
        }
        // // let firstPage = `https://www.lelmangavf.com/uploads/manga/${metadata.mangaId}/chapters/0001/${$(items[0]).attr('alt')?.split(' ').pop()}.jpg`;
        // let firstPage = $(items[0]).attr('data-src') ?? '';
        // firstPage = firstPage.replace(' //', 'https://');
        // for (let i = 0; i < items.length; i++)
        // {
        //   let page = firstPage.replace('1.jpg', `${i+1}.jpg`);
        //   console.log(page);
        //   pages.push(page);
        // }
        console.log(pages);
        return createChapterDetails({
            id: metadata.chapterId,
            mangaId: metadata.mangaId,
            pages: pages,
            longStrip: false,
        });
    }
    // TODO: @getBoolean
    // filterUpdatedMangaRequest(ids: any, time: Date): Request | null { return null }
    // TODO: @getBoolean
    // filterUpdatedManga(data: any, metadata: any): MangaUpdates | null { return null }
    // Done: @getBoolean
    // JSON parsing from https://github.com/Paperback-iOS/extensions-beta/blob/master/src/ReadComicsOnline/ReadComicsOnline.ts
    searchRequest(query) {
        var _a;
        console.log('Inside searchRequest()');
        let metadata = { searchQuery: (_a = query.title) === null || _a === void 0 ? void 0 : _a.toLowerCase() };
        return createRequestObject({
            url: `${LM_DOMAIN}/search`,
            timeout: 4000,
            metadata: metadata,
            method: 'GET',
        });
    }
    // Done: @getBoolean
    search(data, metadata) {
        console.log('Inside search()');
        let mangaTiles = [];
        let obj = JSON.parse(data);
        // Parse the json context
        for (let entry of obj.suggestions) {
            // Is this relevent to the query?
            if (entry.value.toLowerCase().includes(metadata.searchQuery)) {
                let image = `${LM_DOMAIN}/uploads/manga/${entry.data}/cover/cover_250x350.jpg`;
                mangaTiles.push(createMangaTile({
                    id: entry.data,
                    title: createIconText({ text: this.parseString(entry.value) }),
                    image: image
                }));
            }
        }
        return createPagedResults({
            results: mangaTiles
        });
    }
    // Removed: @getBoolean
    // getTagsRequest(): Request | null { return null }
    // Removed: @getBoolean
    // getTags(data: any): TagSection[] | null { return null }
    // Done: @getBoolean
    getHomePageSectionRequest() {
        console.log('Inside getHomePageSectionRequest()');
        let request1 = createRequestObject({
            url: `${LM_DOMAIN}`,
            method: 'GET'
        });
        let request2 = createRequestObject({
            url: `${LM_DOMAIN}/scan-manga-list`,
            method: 'GET'
        });
        let request3 = createRequestObject({
            url: `${LM_DOMAIN}/latest-release`,
            method: 'GET'
        });
        let section1 = createHomeSection({
            id: 'popularUpdates',
            title: 'Mises à jour des Manga populaires',
        });
        let section2 = createHomeSection({
            id: 'zAll',
            title: 'Annuaire des Manga',
            view_more: this.constructGetViewMoreRequest('zAll', 1),
        });
        let section3 = createHomeSection({
            id: 'recentUpdates',
            title: 'Dernières mises à jour Manga',
            view_more: this.constructGetViewMoreRequest('recentUpdates', 1),
        });
        return [
            createHomeSectionRequest({
                request: request1,
                sections: [section1]
            }),
            createHomeSectionRequest({
                request: request2,
                sections: [section2]
            }),
            createHomeSectionRequest({
                request: request3,
                sections: [section3]
            }),
        ];
    }
    // Done: @getBoolean
    getHomePageSections(data, sections) {
        console.log('Inside getHomePageSections()');
        let $ = this.cheerio.load(data);
        return sections.map(section => {
            switch (section.id) {
                case 'popularUpdates':
                    section.items = this.parsePopularMangaTiles($);
                    break;
                case 'zAll':
                    section.items = this.parseAllMangaTiles($);
                    break;
                case 'recentUpdates':
                    section.items = this.parseLatestMangaTiles($);
                    break;
            }
            return section;
        });
    }
    // Done: @getBoolean
    parsePopularMangaTiles($) {
        console.log('Inside parsePopularMangaTiles()');
        let latestManga = [];
        let panel = $('.hot-thumbnails');
        let items = $('.span3', panel).toArray();
        for (let item of items) {
            let url = $('a', item).first().attr('href');
            let urlSplit = url === null || url === void 0 ? void 0 : url.split('/');
            let id = urlSplit === null || urlSplit === void 0 ? void 0 : urlSplit.pop();
            let image = $('img', item).first().attr('src');
            image = image === null || image === void 0 ? void 0 : image.replace('//', 'https://');
            let title = $('.label-warning', item).text().trim();
            let subtitle = $('p', item).text().trim();
            //console.log(image);
            // console.log(`id: ${id}`);
            // Credit to @GameFuzzy
            // Checks for when no id or image found
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            latestManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: this.parseString(title) }),
                subtitleText: createIconText({ text: this.parseString(subtitle) })
            }));
        }
        return latestManga;
    }
    // Done: @getBoolean
    parseAllMangaTiles($) {
        console.log('Inside parsePopularMangaTiles()');
        let latestManga = [];
        let panel = $('.content');
        let items = $('.col-sm-6', panel).toArray();
        for (let item of items) {
            let url = $('a', item).first().attr('href');
            let urlSplit = url === null || url === void 0 ? void 0 : url.split('/');
            let id = urlSplit === null || urlSplit === void 0 ? void 0 : urlSplit.pop();
            let image = $('img', item).first().attr('src');
            image = image === null || image === void 0 ? void 0 : image.replace('//', 'https://');
            let title = $('.chart-title', item).text().trim();
            let subtitleArray = $('a', item).toArray();
            let subtitle = $(subtitleArray[subtitleArray.length - 1]).text().trim();
            //console.log(image);
            // console.log(`id: ${id}`);
            // Credit to @GameFuzzy
            // Checks for when no id or image found
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            latestManga.push(createMangaTile({
                id: id,
                image: image,
                title: createIconText({ text: this.parseString(title) }),
                subtitleText: createIconText({ text: this.parseString(subtitle) })
            }));
        }
        return latestManga;
    }
    // TODO: @getBoolean (Needs promises) Fix duplicate ids when loading multiple pages. 
    // Maintain a set as a class variable and reset it everytime 'getViewMoreItems'
    // is called with null metadata. Check it for duplicate ids
    // Loading the next page is temp disabled until this is fixed
    parseLatestMangaTiles($) {
        console.log('Inside parseLatestMangaTiles()');
        let latestManga = [];
        let allIds = [];
        let panel = $('.mangalist');
        let items = $('.manga-item', panel).toArray();
        for (let item of items) {
            let url = $('a', item).first().attr('href');
            let urlSplit = url === null || url === void 0 ? void 0 : url.split('/');
            let id = urlSplit === null || urlSplit === void 0 ? void 0 : urlSplit.pop();
            let image = `${LM_DOMAIN}/uploads/manga/${id}/cover/cover_250x350.jpg`;
            let title = $('a:nth-child(2)', item).text().trim();
            let subtitle = $('a:nth-child(1)', item).first().text().trim();
            // console.log(image);
            // console.log(`id: ${id}`);
            // Credit to @GameFuzzy
            // Checks for when no id or image found
            if (typeof id === 'undefined' || typeof image === 'undefined')
                continue;
            // Checks for duplicate ids
            if (!allIds.includes(id)) {
                latestManga.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({ text: this.parseString(title) }),
                    subtitleText: createIconText({ text: this.parseString(subtitle) })
                }));
                allIds.push(id);
            }
        }
        return latestManga;
    }
    // Done: @getBoolean
    constructGetViewMoreRequest(key, page) {
        console.log('Invoking constructGetViewMoreRequest() for page ' + page);
        console.log('key: ' + key);
        let param = '';
        switch (key) {
            case 'zAll':
                param = `scan-manga-list?page=${page}`;
                break;
            case 'recentUpdates':
                param = `latest-release?page=${page}`;
                break;
            default:
                return undefined;
        }
        // console.log(`${SM_DOMAIN}/${param}`)
        return createRequestObject({
            url: `${LM_DOMAIN}/${param}`,
            method: 'GET',
            metadata: {
                key, page
            },
        });
    }
    // Done: @getBoolean
    getViewMoreItems(data, key, metadata) {
        console.log('Invoking getViewMoreItems() for page ' + metadata.page);
        console.log('key: ' + key);
        let $ = this.cheerio.load(data);
        let manga = [];
        switch (key) {
            case 'zAll':
                manga = this.parseAllMangaTiles($);
                break;
            case 'recentUpdates':
                manga = this.parseLatestMangaTiles($);
                break;
            default:
        }
        // TODO @getBoolean remove this once duplicate ids is fixed
        // temp disabled next page cause it causes rendering issues with duplicate ids
        if (key == 'recentUpdates') {
            return createPagedResults({
                results: manga,
            });
        }
        return createPagedResults({
            results: manga,
            nextPage: manga.length > 0 ? this.constructGetViewMoreRequest(key, metadata.page + 1) : undefined,
        });
    }
    // Done: @getBoolean
    /**
     *
     * @param request
     */
    // requestModifier(request: Request): Request {
    //   console.log('Inside requestModifier()');
    //   let headers: any = request.headers == undefined ? {} : request.headers;
    //   headers['Referer'] = `${LM_DOMAIN}`;
    //   return createRequestObject({
    //     url: request.url,
    //     method: request.method,
    //     headers: headers,
    //     data: request.data,
    //     metadata: request.metadata,
    //     timeout: request.timeout,
    //     param: request.param,
    //     cookies: request.cookies,
    //     incognito: request.incognito
    //   });
    // }
    // Done: @getBoolean
    isLastPage($) {
        var _a;
        console.log('Inside isLastPage()');
        let current = $('.active').text();
        let pages = $('.pagination li').toArray();
        let total = $(pages[pages.length - 2]).text();
        if (current) {
            total = ((_a = /(\d+)/g.exec(total)) !== null && _a !== void 0 ? _a : [''])[0];
            return (+total) === (+current);
        }
        return true;
    }
    // Done: @getBoolean Function to parse strings to fix strings having &#039; instead of "'"
    parseString(originalString) {
        // let newString = originalString.replace(/&#039;/g, "'");
        // newString = newString.replace(/&#8211;/g, "-");
        // Decode title
        let newString = originalString.replace(/&#(\d+);/g, function (match, dec) {
            return String.fromCharCode(dec);
        });
        return newString;
    }
}
exports.Lelmangavf = Lelmangavf;

},{"paperback-extensions-common":5}]},{},[20])(20)
});
