import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, /*MangaUpdates,*/ PagedResults, SourceTag, TagType } from "paperback-extensions-common"


const BM_DOMAIN = 'https://m.bnmanhua.com';

export class BainianManga extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio);
  }
  
  // @getBoolean
  get version(): string { return '0.0.1' }
  get name(): string { return 'BainianManga (百年漫画)' }
  get icon(): string { return 'icon.png' }
  get author(): string { return 'getBoolean' }
  get authorWebsite(): string { return 'https://github.com/getBoolean' }
  get language(): string { return 'Chinese' }
  get description(): string { return 'Extension that pulls manga from BainianManga.' }
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { 
    return `${BM_DOMAIN}/comic/${mangaId}.html`
  }
  get websiteBaseURL(): string { return BM_DOMAIN }
  get rateLimit(): number { return 2 }
  get sourceTags(): SourceTag[] {
    return [
      {
        text: "Chinese (中文)",
        type: TagType.GREY
      },
    ]
  }

  // Done: @getBoolean
  getMangaDetailsRequest(ids: string[]): Request[] {
    console.log('Inside getMangaDetailsRequest()');
    let requests: Request[] = [];
    for (let id of ids) {
      console.log(`id: ${id}`);
      let metadata = { 
        'id': id,
        'url': `${BM_DOMAIN}/comic/`,
      };
      
      requests.push(createRequestObject({
        url: `${BM_DOMAIN}/comic/`,
        metadata: metadata,
        method: 'GET',
        param: `${id}.html`,
      }));
    }
    return requests;
  }

  // Done: @getBoolean
  getMangaDetails(data: any, metadata: any): Manga[] {
    console.log('Inside getMangaDetails()');
    
    let manga: Manga[] = [];
    
    let $ = this.cheerio.load(data);
    let table = $('.dbox');
    let title = $('div.data h4').first().text() ?? 'No title found';
    title = this.parseString(title);
    let image = $('div.img img').attr('src') ?? '';
    let author = $("p.dir").text().substring(3).trim().replace(/\r?\n|\r/g, '');

    // BainianManga does not list artist, rating, or status
    // let artist = $('').text().replace(/\r?\n|\r/g, '');
    // let rating = Number($(".rating div[id='item-rating']").attr('data-score'));
    // let status = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '').trim() == 'Ongoing' ? MangaStatus.ONGOING : MangaStatus.COMPLETED;
    let status = MangaStatus.ONGOING;
    let titles = [title]; // Updated below
    let lastUpdate = ''; // Updated below
    let hentai = false;

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }), createTagSection({ id: '1', label: 'format', tags: [] })];

    // Genres
    // BainianManga only has one category per manga as far as I can tell
    let genres: string[] = [$('div.data .yac').text().replace('类别：','')];
    tagSections[0].tags = genres.map((elem: string) => createTag({ id: elem, label: elem }));
    hentai = false;

    // Date
    let lastUpdateLine = $('div.data .act').text().replace('更新：','');
    let lastUpdateSplit = lastUpdateLine.split('/')
    let time = new Date(lastUpdateSplit[0].trim());
    lastUpdate = time.toDateString();
    
    // BainianManga does not have alt titles
    // Alt Titles
    // let altTitles = $('.dl-horizontal dd:nth-child(4)').text().trim().split(', ');
    // for (let alt of altTitles) {
    //   alt = this.parseString(alt);
    //   titles.push(alt.trim());
    // }
    
    let summary = $("div.tbox_js").text().trim().replace(/^\s+|\s+$/g, '');
    summary = this.parseString(summary);
    
    // MangaID
    // console.log(`metadata.id: ${metadata.id}`);

    manga.push(createManga({
      id: metadata.id,
      titles: titles,
      image: image,
      rating: Number('0'),
      status: status,
      // artist: artist,
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
  getChaptersRequest(mangaId: string): Request {
    console.log('Inside getChaptersRequest()');
    // console.log(mangaId);
    let metadata = {
      'url': `${BM_DOMAIN}/comic/`,
      'id': mangaId,
    };
    // console.log(`${SM_DOMAIN}/manga/${mangaId}/`);
    return createRequestObject({
      url: `${BM_DOMAIN}/comic/`,
      metadata: metadata,
      method: 'GET',
      param: `${mangaId}.html`,
   });
  }

  // Done: @getBoolean
  getChapters(data: any, metadata: any): Chapter[] {
    console.log('Inside getChapters()');
    console.log(`metadata.url: ${metadata.url}`);
    console.log(`metadata.id: ${metadata.id}`);
    let chapters: Chapter[] = [];
    
    let $ = this.cheerio.load(data);
    let allChapters = $('.list_block li').toArray()
    // console.log(metadata.url + metadata.id);

    for (let chapter of allChapters) {
      let item = $(chapter);
      let chapterUrl: string = $('a', item).attr('href') ?? '';
      let fullChapterUrl = `${BM_DOMAIN}${chapterUrl}`;
      // console.log(`item.text(): ${item.text().replace(/\r?\n|\r/g, '').trim()}`);
      // let name: string = item.text().replace(/\r?\n|\r/g, '').trim().split(' :').pop() ?? '';
      let name: string = item.text().replace(/\r?\n|\r/g, '').trim();
      let chNum = Number( name.match(/\d+/)?.toString() ?? '' ); // empty string should return 0
      if (Number.isNaN(chNum)) {
        chNum = -9999;
      }
      // console.log(id);

      // let timeString = $('.chapters .date-chapter-title-rtl').first().text().trim() ?? '';
      // let time: Date
      // if (timeString.includes('a'))
      //   time = super.convertTime(timeString.replace('mins', 'minutes').replace('hour', 'hours'));
      // else
      //   time = new Date(timeString);

      chapters.push(createChapter({
        id: fullChapterUrl,
        mangaId: metadata.id,
        name: this.parseString(name), // createIconText({ text: title }),
        langCode: LanguageCode.CHINEESE,
        chapNum: chNum,
        // time: time,
      }));
    }
    
    return chapters;
  }

  // TODO: @getBoolean
  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    console.log('in getChapterDetailsRequest()')
    let metadata = {
      'mangaId': mangaId, // mangaId ex: 26075
      'chapterId': chapId, // chaptId ex: https://m.bnmanhua.com/comic/26075/1583898.html
      'nextPage': false,
      'page': 1
    };

    return createRequestObject({
      url: `${chapId}`,
      method: "GET",
      metadata: metadata,
      // param: ``,
    });
  }

  // TODO: @getBoolean
  getChapterDetails(data: any, metadata: any): ChapterDetails {
    console.log('Inside getChapterDetails()');
    let $ = this.cheerio.load(data);
    // console.log(originalImageName);
    // console.log(pages[0]);

    let items = $('img', '.col-sm-8').toArray();
    items.pop(); // Get rid of extra item
    // let pages = Array.from(items, x=>$(x).attr('data-src')?.replace(' //', 'https://').trim() ?? '' )
    // if (typeof id === 'undefined' || typeof image === 'undefined') continue
    let pages: string [] = [];
    for(let item of items)
    {
      let page = $(item).attr('data-src')?.replace(' //', 'https://').trim();
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
  searchRequest(query: SearchRequest): Request | null {
    console.log('Inside searchRequest()');
    let metadata = {searchQuery: query.title?.toLowerCase()}

    return createRequestObject({
      url: `${LM_DOMAIN}/search`,
      timeout: 4000,
      metadata: metadata,
      method: 'GET',
    });
  }

  // TODO: @getBoolean
  search(data: any, metadata: any): PagedResults | null {
    console.log('Inside search()');
    let mangaTiles: MangaTile[] = []

    let obj = JSON.parse(data)

    // Parse the json context
    for(let entry of obj.suggestions) {
        // Is this relevent to the query?
        if(entry.value.toLowerCase().includes(metadata.searchQuery)) {
            let image = `${LM_DOMAIN}/uploads/manga/${entry.data}/cover/cover_250x350.jpg`

            mangaTiles.push(createMangaTile({
                id: entry.data,
                title: createIconText({text: this.parseString(entry.value)}),
                image: image
            }))
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



  // TODO: @getBoolean
  getHomePageSectionRequest(): HomeSectionRequest[] | null {
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

    let section1 = createHomeSection({ // Latest chapters (homepage)
      id: 'popularUpdates',
      title: 'Mises à jour des Manga populaires',
    });
    let section2 = createHomeSection({
      id: 'zAll',
      title: 'Annuaire des Manga',
      view_more: this.constructGetViewMoreRequest('zAll', 1),
    });
    let section3 = createHomeSection({ // All titles A-Z
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
    ]
  }

  // TODO: @getBoolean
  getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] {
    console.log('Inside getHomePageSections()');
    let $ = this.cheerio.load(data)

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

  // TODO: @getBoolean
  parsePopularMangaTiles($: CheerioSelector): MangaTile[] {
    console.log('Inside parsePopularMangaTiles()');
    let latestManga: MangaTile[] = [];
    
    let panel = $('.hot-thumbnails');
    let items = $('.span3', panel).toArray();
    for (let item of items) {
      let url = $('a', item).first().attr('href');
      let urlSplit = url?.split('/');
      let id = urlSplit?.pop();
      let image = $('img', item).first().attr('src');
      image = image?.replace('//', 'https://');
      let title = $('.label-warning', item).text().trim();
      let subtitle = $('p', item).text().trim();
      //console.log(image);
      // console.log(`id: ${id}`);

      // Credit to @GameFuzzy
      // Checks for when no id or image found
      if (typeof id === 'undefined' || typeof image === 'undefined') continue
      latestManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: this.parseString(title) }),
        subtitleText: createIconText({ text: this.parseString(subtitle) })
      }));
    }
    
    return latestManga;
  }

  // TODO: @getBoolean
  parseAllMangaTiles($: CheerioSelector): MangaTile[] {
    console.log('Inside parsePopularMangaTiles()');
    let latestManga: MangaTile[] = [];
    
    let panel = $('.content');
    let items = $('.col-sm-6', panel).toArray();
    for (let item of items) {
      let url = $('a', item).first().attr('href');
      let urlSplit = url?.split('/');
      let id = urlSplit?.pop();
      let image = $('img', item).first().attr('src');
      image = image?.replace('//', 'https://');
      let title = $('.chart-title', item).text().trim();
      let subtitleArray = $('a', item).toArray();
      let subtitle = $(subtitleArray[subtitleArray.length-1]).text().trim();
      //console.log(image);
      // console.log(`id: ${id}`);

      // Credit to @GameFuzzy
      // Checks for when no id or image found
      if (typeof id === 'undefined' || typeof image === 'undefined') continue
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
  parseLatestMangaTiles($: CheerioSelector): MangaTile[] {
    console.log('Inside parseLatestMangaTiles()');
    let latestManga: MangaTile[] = [];
    let allIds: string[] = [];
    
    let panel = $('.mangalist');
    let items = $('.manga-item', panel).toArray();
    for (let item of items) {
      let url = $('a', item).first().attr('href');
      let urlSplit = url?.split('/');
      let id = urlSplit?.pop();
      let image = `${LM_DOMAIN}/uploads/manga/${id}/cover/cover_250x350.jpg`;
      let title = $('a:nth-child(2)', item).text().trim();
      let subtitle = $('a:nth-child(1)', item).first().text().trim();
      // console.log(image);
      // console.log(`id: ${id}`);
      
      // Credit to @GameFuzzy
      // Checks for when no id or image found
      if (typeof id === 'undefined' || typeof image === 'undefined') continue
      // Checks for duplicate ids
      if (!allIds.includes(id)) 
      {
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

  // TODO: @getBoolean
  constructGetViewMoreRequest(key: string, page: number) {
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


  // TODO: @getBoolean
  getViewMoreItems(data: any, key: string, metadata: any): PagedResults {
    console.log('Invoking getViewMoreItems() for page ' + metadata.page);
    console.log('key: ' + key);
    let $ = this.cheerio.load(data);
    let manga: MangaTile[] = [];

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
    if (key == 'recentUpdates')
    {
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
  requestModifier(request: Request): Request {
    console.log('Inside requestModifier()');
    let headers: any = request.headers == undefined ? {} : request.headers;
    headers['Referer'] = `${BM_DOMAIN}`;

    return createRequestObject({
      url: request.url,
      method: request.method,
      headers: headers,
      data: request.data,
      metadata: request.metadata,
      timeout: request.timeout,
      param: request.param,
      cookies: request.cookies,
      incognito: request.incognito
    });
  }


  
  
  // TODO: @getBoolean
  isLastPage($: CheerioStatic): boolean {
    console.log('Inside isLastPage()');
    let current = $('.active').text();
    let pages = $('.pagination li').toArray();
    let total = $(pages[pages.length-2]).text();

    if (current) {
      total = (/(\d+)/g.exec(total) ?? [''])[0];
      return (+total) === (+current);
    }

    return true;
  }


  // Done: @getBoolean Function to parse strings to fix strings having &#039; instead of "'"
  parseString(originalString: string): string {
    // let newString = originalString.replace(/&#039;/g, "'");
    // newString = newString.replace(/&#8211;/g, "-");

    // Decode title
    let newString = originalString.replace(/&#(\d+);/g, function(match, dec) {
      return String.fromCharCode(dec);
    })

    return newString;
  }
}
