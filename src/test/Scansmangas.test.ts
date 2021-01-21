import cheerio from 'cheerio'
import { APIWrapper, Source } from 'paperback-extensions-common';
import { ScansMangas } from '../ScansMangas/ScansMangas';

describe('ScansMangas Tests', function () {

    var wrapper: APIWrapper = new APIWrapper();
    var source: Source = new ScansMangas(cheerio);
    var chai = require('chai'), expect = chai.expect, should = chai.should();
    var chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);

    /**
     * The Manga ID which this unit test uses to base it's details off of.
     * Try to choose a manga which is updated frequently, so that the historical checking test can 
     * return proper results, as it is limited to searching 30 days back due to extremely long processing times otherwise.
     */
    // var mangaId = "komi-san-wa-commu-shou-desu";
    // var mangaId = "soul-eater";
    // var mangaId = "shikkaku-mon-no-saikyou-kenja-sekai-saikyou-no-kenja-ga-sara-ni-tsuyokunaru-tame-ni-tensei-shimashita";
    // var mangaId = "dr-stone";
    var mangaId = "6000-the-deep-sea-of-madness";
    // var mangaId = "martial-peak";
    
    it("Retrieve Manga Details", async () => {
        let details = await wrapper.getMangaDetails(source, [mangaId]);
        expect(details, "No results found with test-defined ID [" + mangaId + "]").to.be.an('array');
        expect(details).to.not.have.lengthOf(0, "Empty response from server");

        // Validate that the fields are filled
        let data = details[0];
        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.image, "Missing Image").to.be.not.empty;
        expect(data.status, "Missing Status").to.exist;
        expect(data.tags, "Missing Tags").to.exist;
        expect(data.author, "Missing Author").to.exist;
        expect(data.desc, "Missing Description").to.be.not.empty;
        expect(data.titles, "Missing Titles").to.be.not.empty;
        expect(data.rating, "Missing Rating").to.exist;
    });

    it("Get Chapters", async () => {
        let data = await wrapper.getChapters(source, mangaId);

        expect(data, "No chapters present for: [" + mangaId + "]").to.not.be.empty;

        let entry = data[0]
        expect(entry.id, "No ID present").to.not.be.empty;
        // expect(entry.time, "No date present").to.exist
        expect(entry.name, "No title available").to.not.be.empty
        expect(entry.chapNum, "No chapter number present").to.exist
    });

    it("Get Chapter Details", async () => {

        let chapters = await wrapper.getChapters(source, mangaId);
        let data = await wrapper.getChapterDetails(source, mangaId, chapters[0].id);

        expect(data, "No server response").to.exist;
        expect(data, "Empty server response").to.not.be.empty;

        expect(data.id, "Missing ID").to.be.not.empty;
        expect(data.mangaId, "Missing MangaID").to.be.not.empty;
        expect(data.pages, "No pages present").to.be.not.empty;
    });

    it("Testing search", async () => {
        let testSearch = createSearchRequest({
            title: 'soul'
        });

        let search = await wrapper.search(source, testSearch, 1);
        let result = search[0];

        expect(result, "No response from server").to.exist;

        expect(result.id, "No ID found for search query").to.be.not.empty;
        expect(result.image, "No image found for search").to.be.not.empty;
        expect(result.title, "No title").to.be.not.null;
        expect(result.subtitleText, "No subtitle text").to.be.not.null;
    });

    it("Testing Home-Page aquisition", async() => {
        let homePages = await wrapper.getHomePageSections(source)
        expect(homePages, "No response from server").to.exist
        expect(homePages[0], "No top weekly section available").to.exist
        expect(homePages[1], "No latest updates section available").to.exist
        expect(homePages[2], "No new manga section available").to.exist
    })

})
