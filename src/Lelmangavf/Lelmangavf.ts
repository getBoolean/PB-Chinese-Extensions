import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, /*MangaUpdates,*/ PagedResults, SourceTag, TagType } from "paperback-extensions-common"


const LM_DOMAIN = 'https://www.lelmangavf.com';

export class Lelmangavf extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio);
  }
  
  // @getBoolean
  get version(): string { return '1.0.4' }
  get name(): string { return 'Lelmangavf' }
  get icon(): string { return 'icon.png' }
  get author(): string { return 'getBoolean' }
  get authorWebsite(): string { return 'https://github.com/getBoolean' }
  get language(): string { return 'French' }
  get description(): string { return 'Extension that pulls manga from Lelmangavf.' }
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { 
    return `${LM_DOMAIN}/scan-manga/${mangaId}`
  }
  get websiteBaseURL(): string { return LM_DOMAIN }
  get rateLimit(): number { return 2 }
  get sourceTags(): SourceTag[] {
    return [
      {
        text: "French",
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
  getMangaDetails(data: any, metadata: any): Manga[] {
    console.log('Inside getMangaDetails()');
    
    let manga: Manga[] = [];
    
    let $ = this.cheerio.load(data);
    let panel = $('.row').first();
    let table = $('.dl-horizontal', panel).first()
    let title = $('.widget-title', panel).first().text() ?? '';
    title = this.parseString(title);
    let image = $('img', panel).attr('src') ?? '';
    image = image.replace('//', 'https://');
    let author = $('.dl-horizontal dd:nth-child(6)').text().replace(/\r?\n|\r/g, '');
    let artist = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '');

    let rating = Number($(".rating div[id='item-rating']").attr('data-score'));
    let status = $('.dl-horizontal dd:nth-child(8)').text().replace(/\r?\n|\r/g, '').trim() == 'Ongoing' ? MangaStatus.ONGOING : MangaStatus.COMPLETED;
    let titles = [title]; // Updated below
    let lastUpdate = ''; // Updated below
    let hentai = false;

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }), createTagSection({ id: '1', label: 'format', tags: [] })];

    // Genres
    let elems = $('.tag-links', table).children();
    let genres: string[] = [];
    genres = Array.from(elems, x=>$(x).text() );
    tagSections[0].tags = genres.map((elem: string) => createTag({ id: elem, label: elem }));
    hentai = genres.includes('Mature') ? true : false;

    // Date
    let dateModified = $('.chapters .date-chapter-title-rtl').first().text().trim() ?? '';
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
  getChaptersRequest(mangaId: string): Request {
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
  getChapters(data: any, metadata: any): Chapter[] {
    console.log('Inside getChapters()');
    console.log(`metadata.url: ${metadata.url}`);
    console.log(`metadata.id: ${metadata.id}`);
    let chapters: Chapter[] = [];
    
    let $ = this.cheerio.load(data);
    // let panel = $('.row').first();
    // let title = $('.widget-title', panel).first().text() ?? '';
    let allChapters = $('.chapters .chapter-title-rtl').toArray()
    // console.log(metadata.url + metadata.id);

    for (let chapter of allChapters) {
      let item = $(chapter);
      let chapterUrl: string = $('a', item).attr('href') ?? '';
      // console.log(`item.text(): ${item.text().replace(/\r?\n|\r/g, '').trim()}`);
      // let name: string = item.text().replace(/\r?\n|\r/g, '').trim().split(' :').pop() ?? '';
      let name: string = item.text().replace(/\r?\n|\r/g, '').trim()
      name = name.slice(name.indexOf(':')+1, name.length)
      if (name == '')
      {
        name = item.text().replace(/\r?\n|\r/g, '').trim().split(':')[0].trim();
      }
      let chNum = Number( item.text().replace(/\r?\n|\r/g, '').trim().split(':')[0].trim().split(' ').pop() );
      if (Number.isNaN(chNum)) {
        chNum = -9999;
      }
      // console.log(id);

      let timeString = $('.chapters .date-chapter-title-rtl').first().text().trim() ?? '';
      let time: Date
      if (timeString.includes('a'))
        time = super.convertTime(timeString.replace('mins', 'minutes').replace('hour', 'hours'));
      else
        time = new Date(timeString);

      chapters.push(createChapter({
        id: chapterUrl,
        mangaId: metadata.id,
        name: this.parseString(name), // createIconText({ text: title }),
        langCode: LanguageCode.FRENCH,
        chapNum: chNum,
        time: time,
      }));
    }
    
    return chapters;
  }

  // Done: @getBoolean
  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    console.log('in getChapterDetailsRequest()')
    let metadata = {
      'mangaId': mangaId, // mangaId ex: berserk
      'chapterId': chapId, // chaptId ex: https://www.lelmangavf.com/scan-manga/berserk/1
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

  // Done: @getBoolean
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

  // Done: @getBoolean
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



  // Done: @getBoolean
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

  // Done: @getBoolean
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

  // Done: @getBoolean
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

  // Done: @getBoolean
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

  // Done: @getBoolean
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


  // Done: @getBoolean
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
