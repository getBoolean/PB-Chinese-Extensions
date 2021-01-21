import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, /*MangaUpdates,*/ PagedResults, SourceTag, TagType } from "paperback-extensions-common"


const SM_DOMAIN = 'https://scansmangas.xyz';

export class ScansMangas extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio);
  }

  // @getBoolean
  get version(): string { return '1.0.1' }
  get name(): string { return 'ScansMangas' }
  get icon(): string { return 'icon.png' }
  get author(): string { return 'getBoolean' }
  get authorWebsite(): string { return 'https://github.com/getBoolean' }
  get language(): string { return 'French' }
  get description(): string { return 'Extension that pulls manga from ScansMangas.' }
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { 
    return `${SM_DOMAIN}/manga/${mangaId}`
  }
  get websiteBaseURL(): string { return SM_DOMAIN }
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
      // console.log(`id: ${id}`);
      let metadata = { 
        'id': id,
        'url': `${SM_DOMAIN}/manga/`,
      };
      
      requests.push(createRequestObject({
        // url: `${urlDomain}/`,
        url: `${SM_DOMAIN}/manga/`,
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
    let panel = $('.white');
    let table = $('.infox', panel);
    let title = $('h1', table).first().text() ?? '';
    let image = $('img', panel).attr('src') ?? '';
    let author = ''; // Updated below
    let artist = ''; // Updated below
    let autart = $('.spe span:nth-child(3)').text().replace('Auteur: ', '').replace('Auteur original : ', '').replace(/\r?\n|\r/g, '').split(', ');
    autart[autart.length-1] = autart[autart.length-1]?.replace(', ', '');
    author = autart[0].trim();
    if (autart.length > 1 && $(autart[1]).text() != ' ') {
      artist = autart[1];
    }

    let rating = Number($('.dev-meta-rating').children().first().text().trim());
    let status = $('.spe span:nth-child(2)').text().replace('Statut: ', '').trim() == 'En cours' ? MangaStatus.ONGOING : MangaStatus.COMPLETED;
    let titles = [title];
    // let follows = Number($('#rate_row_cmd', table).text().replace(' votes', '').split(' ').pop() );
    // let views = Number($('.manga-info-text li:nth-child(6)').text().replace(/,/g, '').replace('View : ', '') );
    let lastUpdate = ''; // Updated below
    let hentai = false;

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }), createTagSection({ id: '1', label: 'format', tags: [] })];

    // Genres
    let elems = $('.spe span:last-child').find('a').toArray();
    let genres: string[] = [];
    genres = Array.from(elems, x=>$(x).text() );
    tagSections[0].tags = genres.map((elem: string) => createTag({ id: elem, label: elem }));
    hentai = genres.includes('Mature') ? true : false;

    // Date
    let dateModified = $("head meta[property='article:modified_time']").attr("content") ?? '';
    let time = new Date(dateModified);
    lastUpdate = time.toDateString();
    
    // Alt Titles
    let altTitles = $('.alter', panel).text().trim().split(' / ');
    for (let alt of altTitles) {
      titles.push(alt.trim());
    }
    
    let summary = $('.entry-content-single').text().replace(/^\s+|\s+$/g, '');
    
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
      'url': `${SM_DOMAIN}/manga/`,
      'id': mangaId,
    };
    // console.log(`${SM_DOMAIN}/manga/${mangaId}/`);
    return createRequestObject({
      url: `${SM_DOMAIN}/manga/`,
      metadata: metadata,
      method: 'GET',
      param: `${mangaId}/`,
   });
  }

  // Done: @getBoolean
  getChapters(data: any, metadata: any): Chapter[] {
    console.log('Inside getChapters()');
    let chapters: Chapter[] = [];
    
    let $ = this.cheerio.load(data);
    let chapterContainer = $(".bxcl ul[id='chapter_list']");
    let allChapters = $('li', chapterContainer).toArray()
    // console.log(metadata.url + metadata.id);

    for (let chapter of allChapters) {
      let item = $('.desktop', chapter).first();
      let chapterUrl: string = $('a', item).attr('href') ?? '';
      // let chapterUrlSplit: string[] = chapterUrl.split('/');
      let name: string = item.text();
      let nameSplit: string[] = name.split(' ')
      let chNum = Number( nameSplit.pop() );
      if (Number.isNaN(chNum)) {
        chNum = Number( nameSplit.pop() );
      }
      // let id = `${chNum}`;
      // console.log(id);

      chapters.push(createChapter({
        id: chapterUrl,
        mangaId: metadata.id,
        name: name, // createIconText({ text: title }),
        langCode: LanguageCode.FRENCH,
        chapNum: chNum,
      }));
    }
    
    return chapters.reverse();
  }

  // Done: @getBoolean
  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    console.log('in getChapterDetailsRequest()')
    let metadata = {
      'mangaId': mangaId, // mangaId ex: dr-stone
      'chapterId': chapId, // chaptId ex: https://scansmangas.xyz/scan-dr-stone-1/
      'nextPage': false,
      'page': 1
    };
    let urlMangaId = `scan-${mangaId.replace('.', '-')}`;
    // console.log('url: ' + `${SM_DOMAIN}/${urlMangaId}/`)
    // console.log('param: ' + ``)

    return createRequestObject({
      // url: `${SM_DOMAIN}/${urlMangaId}-${chapId}/`,
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
    // console.log(data);
    let pages: string[] = [];
    let panel = $('.postbody');
    let firstImage = $('img', panel).attr('src')?.replace(/\r?\n|\r/g, '') ?? ''
    pages.push( firstImage );
    let originalImageName = firstImage.split('/').pop() ?? '';
    // console.log(originalImageName);
    // console.log(pages[0]);

    let imageBaseUrl = firstImage.replace(`/${originalImageName}`, '');


    let items = $('a', '.nav_apb').toArray();
    let prevItem;
    let item;
    let prevImageNumber : Number;
    let imageNumber : Number;
    let page : string;
    let imageName : string;

    // Loop starting from the second image
    for (let i = metadata.chapterId == 1 ? 1 : 2; i < items.length; i++) {
      item = items[i];
      imageNumber = Number($(item).text());
      imageName = originalImageName.replace(`1`, `${metadata.chapterId == 1 ? i+1 : i}`);
      // console.log(imageName);
      if (!Number.isNaN(imageNumber))
      {
        page = `${imageBaseUrl}/${imageName}`;
        // console.log(page);
        pages.push( page );
      }
    }

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
  searchRequest(query: SearchRequest): Request | null {
    console.log('Inside searchRequest()');
    let metadata = { 'page': 1, 'search': '' };

    let keyword = (query.title ?? '').replace(/ /g, '+');
    if (query.author)
      keyword += (query.author ?? '').replace(/ /g, '+');
    let search: string = `${keyword}`;
    console.log('searchRequest(): ' + `${SM_DOMAIN}/` + `page/${metadata.page}/?s=${search}&post_type=manga`);
    metadata.search = search;

    return createRequestObject({
      url: `${SM_DOMAIN}/`,
      method: 'GET',
      metadata: metadata,
      param: `page/${metadata.page}/?s=${search}&post_type=manga`
    });
  }

  // Done: @getBoolean
  search(data: any, metadata: any): PagedResults | null {
    console.log('Inside search()');
    let manga: MangaTile[] = [];
    let $ = this.cheerio.load(data);
    
    let panel = $('.white');
    let mangaPanel = $('.trending', panel)
    for (let item of $('.bs', mangaPanel).toArray()) {
      let url = $('a', item).attr('href') ?? '';
      let chapterUrlSplit: string[] = url.split('/');
      let id = chapterUrlSplit[chapterUrlSplit.length-2];
      let title = $('a', item).attr('title') ?? '';
      // Removed subTitle because it was always "Ch."
      let subTitle = '' // $('.epxs', item).text().trim();
      let image = $('img',item).attr('src') ?? '';
      let rating = ($('.rating', item).children().last().text().trim());

      //console.log('search(): ')
      //console.log('     url: ' + url)
      //console.log('   image: ' + image)
      manga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subTitle }),
        primaryText: createIconText({ text: rating, icon: 'star.fill' }),
      }));
    }
    
    metadata.page = ++metadata.page;
    let nextPage = this.isLastPage($) ? undefined : {
      url: `${SM_DOMAIN}/`,
      method: 'GET',
      metadata: metadata,
      param: `page/${metadata.page}/?s=${metadata.search}`
    };

    return createPagedResults({
      results: manga,
      nextPage: nextPage
    });
  }

  // Removed: Mangakakalot does not support searching plus tags @getBoolean
  // getTagsRequest(): Request | null { return null }

  // Removed: Mangakakalot does not support searching plus tags @getBoolean
  // getTags(data: any): TagSection[] | null { return null }



  // Done: @getBoolean
  getHomePageSectionRequest(): HomeSectionRequest[] | null {
    console.log('Inside getHomePageSectionRequest()');
    let request1 = createRequestObject({
      url: `${SM_DOMAIN}`,
      method: 'GET'
    });
    let request2 = createRequestObject({
      url: `${SM_DOMAIN}/tous-nos-mangas/?order=popular`,
      method: 'GET'
    });
    let request3 = createRequestObject({
      url: `${SM_DOMAIN}/tous-nos-mangas/?order=title`,
      method: 'GET'
    });

    let section1 = createHomeSection({ // Latest chapters (homepage w/ pages)
      id: 'latest',
      title: 'Derniers chapitres en ligne',
      view_more: this.constructGetViewMoreRequest('latest', 1),
    });
    let section2 = createHomeSection({
      id: 'popular',
      title: 'Popularité',
      view_more: this.constructGetViewMoreRequest('popular', 1),
    });
    let section3 = createHomeSection({ // All titles A-Z
      id: 'az',
      title: 'Tous nos mangas',
      view_more: this.constructGetViewMoreRequest('az', 1),
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
        case 'latest':
          section.items = this.parseLatestMangaTiles($);
          break;
        case 'popular':
          section.items = this.parseMangaSectionTiles($);
          break;
        case 'az':
          section.items = this.parseMangaSectionTiles($);
          break;
      }

      return section;
    });
  }

  // Done: @getBoolean
  parseLatestMangaTiles($: CheerioSelector): MangaTile[] {
    console.log('Inside parseLatestMangaTiles()');
    let latestManga: MangaTile[] = [];
    for (let item of $('.utao', '.listupd').toArray()) {
      let url = $('a', item).first().attr('href') ?? '';
      let urlSplit = url.split('/');
      let id = urlSplit[urlSplit.length-2];
      let image = $('img', item).attr('src') ?? '';
      let latestChapters = $('.Manga', item);
      let title = $('a', item).attr('title') ?? ''
      let subtitle = $('a', latestChapters).first().text().trim()
      //console.log(image);
      // console.log(`id: ${id}`);
      latestManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subtitle }),
      }));
    }
    
    return latestManga;
  }

  // Done: @getBoolean
  parseMangaSectionTiles($: CheerioSelector): MangaTile[] {
    console.log('Inside parseMangaSectionTiles()');
    let latestManga: MangaTile[] = [];
    
    let panel = $('.pads')
    for (let item of $('.bs', panel).toArray()) {
      let url = $('a', item).first().attr('href') ?? '';
      let urlSplit = url.split('/');
      let id = urlSplit[urlSplit.length-2];
      let image = $('img', item).first().attr('src') ?? '';
      let title = $('a', item).attr('title') ?? '';
      // let subtitle = $('.epxs', item).text() ?? '';
      //console.log(image);
      // console.log(`id: ${id}`);
      latestManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: '' })
      }));
    }
    
    return latestManga;
  }

  // Done: @getBoolean
  constructGetViewMoreRequest(key: string, page: number) {
    console.log('Invoking constructGetViewMoreRequest() for page ' + page);
    console.log('key: ' + key);
    let param = '';
    switch (key) {
      case 'latest':
        param = `page/${page}/`;
        //console.log('param: ' + param);
        break;
      case 'popular':
        param = `tous-nos-mangas/?order=popular`;
        break;
      case 'az':
        param = `tous-nos-mangas/?order=title`;
        break;
      default:
        return undefined;
    }
    // console.log(`${SM_DOMAIN}/${param}`)
    return createRequestObject({
      url: `${SM_DOMAIN}/${param}`,
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
      case 'latest':
        manga = this.parseLatestMangaTiles($);
        break;
      case 'popular':
        manga = this.parseMangaSectionTiles($);
        break;
      case 'az':
        manga = this.parseMangaSectionTiles($);
        break;
      default:
    }

    return createPagedResults({
      results: manga,
      nextPage: manga.length > 0 ? this.constructGetViewMoreRequest(key, metadata.page + 1) : undefined,
    });
  }


  // Done: @getBoolean
  /**
   * Just in case, headers
   * @param request
   */
  requestModifier(request: Request): Request {
    console.log('Inside requestModifier()');
    let headers: any = request.headers == undefined ? {} : request.headers;
    headers['Referer'] = `${SM_DOMAIN}`;

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


  
  
  // Done: @getBoolean
  isLastPage($: CheerioStatic): boolean {
    console.log('Inside isLastPage()');
    let current = $('.current').text();
    let pages = $('.pagination').children();
    let total = $(pages[pages.length-1]).text();

    if (current) {
      total = (/(\d+)/g.exec(total) ?? [''])[0];
      return (+total) === (+current);
    }

    return true;
  }
}
