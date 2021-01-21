import { /*Source,*/ Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, /*MangaUpdates,*/ PagedResults, SourceTag, TagType } from "paperback-extensions-common"
import { Manganelo } from '../Manganelo'

const MK_DOMAIN = 'https://mangakakalot.com'
// const MN_DOMAIN = 'https://manganelo.com'
// let MN_IMAGE_DOMAIN = 'https://avt.mkklcdnv6.com/'
// let MK_IMAGE_DOMAIN = 'https://s5.mkklcdnv5.com/'

export class Mangakakalot extends Manganelo {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  // @getBoolean
  get version(): string { return '1.2.4'; }
  get name(): string { return 'Mangakakalot' }
  get icon(): string { return 'mangakakalot.com.ico' }
  get author(): string { return 'getBoolean' }
  get authorWebsite(): string { return 'https://github.com/getBoolean' }
  get language(): string { return 'English' }
  get description(): string { return 'Extension that pulls manga from Mangakakalot. Does not support Advanced Search' }
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { 
    /*if ( mangaId.includes('read-')) {
      //console.log(`${MK_DOMAIN}/${mangaId}`)
      return `${MK_DOMAIN}/${mangaId}`
    }
    return `${MK_DOMAIN}/manga/${mangaId}`*/
    return `${mangaId}/`
  }
  get websiteBaseURL(): string { return MK_DOMAIN }
  get rateLimit(): number {
    return 2
  }

  get sourceTags(): SourceTag[] {
    return [
      {
        text: "English",
        type: TagType.GREY
      }
    ]
  }

  // Done @getBoolean
  getMangaDetailsRequest(ids: string[]): Request[] {
    let requests: Request[] = []
    for (let id of ids) {
      let idTemp = id.slice( id.indexOf( '/', id.indexOf('/') + 2 ), id.length )
      let urlDomain = id.replace(idTemp, '')
      let metadata = { 
        'id': id,
        'url': urlDomain,
        'idTemp': idTemp
      }
      
      requests.push(createRequestObject({
        url: `${urlDomain}/`,
        //url: `${MK_DOMAIN}/manga/`,
        metadata: metadata,
        method: 'GET',
        param: idTemp
      }))
    }
    return requests
  }

  // Done @getBoolean
  getMangaDetails(data: any, metadata: any): Manga[] {
    let manga: Manga[] = []
    if (metadata.id.toLowerCase().includes('mangakakalot')) {
      manga = this.parseMangakakalotMangaDetails(data, metadata)
    }
    else { // metadata.id.toLowerCase().includes('manganelo')
      manga = super.getMangaDetails(data, metadata)
    }

    return manga
  }

  // Done @getBoolean
  parseMangakakalotMangaDetails(data: any, metadata: any): Manga[] {
    console.log('Inside parseMangakakalotMangaDetails()')
    let manga: Manga[] = []
    let $ = this.cheerio.load(data)
    let panel = $('.manga-info-top')
    let title = $('h1', panel).first().text() ?? ''
    let image = $('.manga-info-pic', panel).children().first().attr('src') ?? ''
    if (image == '//mangakakalot.com/themes/home/images/404-avatar.png' || image == '')
        image = 'https://mangakakalot.com/themes/home/images/404-avatar.png'
    let table = $('.manga-info-text', panel)
    let author = '' // Updated below
    let artist = '' // Updated below
    let autart = $('.manga-info-text li:nth-child(2)').text().replace('Author(s) :', '').replace(/\r?\n|\r/g, '').split(', ')
    autart[autart.length-1] = autart[autart.length-1]?.replace(', ', '')
    author = autart[0]
    if (autart.length > 1 && $(autart[1]).text() != ' ') {
      artist = autart[1]
    }
    let rating = Number($('#rate_row_cmd', table).text().replace('Mangakakalot.com rate : ', '').slice($('#rate_row_cmd', table).text().indexOf('Mangakakalot.com rate : '), $('#rate_row_cmd', table).text().indexOf(' / 5')) )
    let status = $('.manga-info-text li:nth-child(3)').text().split(' ').pop() == 'Ongoing' ? MangaStatus.ONGOING : MangaStatus.COMPLETED
    let titles = [title]
    let follows = Number($('#rate_row_cmd', table).text().replace(' votes', '').split(' ').pop() )
    let views = Number($('.manga-info-text li:nth-child(6)').text().replace(/,/g, '').replace('View : ', '') )
    let lastUpdate = '' // Updated below
    let hentai = false

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }), createTagSection({ id: '1', label: 'format', tags: [] })]

    // Genres
    let elems = $('.manga-info-text li:nth-child(7)').find('a').toArray()
    let genres: string[] = []
    genres = Array.from(elems, x=>$(x).text() )
    //let ids: string[] = []
    /*for (let elem of elems) {

      let text = $(elem).text()
      //let id = $(elem).attr('href')?.split('/').pop()?.split('&')[1].replace('category=', '') ?? ''
      if (text.toLowerCase().includes('smut') || text.toLowerCase().includes('adult')) {
        hentai = true
      }
      genres.push(text)
      //ids.push(id)
    }*/
    tagSections[0].tags = genres.map((elem: string) => createTag({ id: elem, label: elem }))
    hentai = (genres.includes('Adult') || genres.includes('Smut') ) ? true : false;

    // Date
    let time = new Date($('.manga-info-text li:nth-child(4)').text().replace(/((AM)*(PM)*)/g, '').replace('Last updated : ', ''))
    lastUpdate = time.toDateString()
    

    // Alt Titles
    for (let row of $('li', table).toArray()) {
      if ($(row).find('.story-alternative').length > 0) {
        let alts = $('h2', table).text().replace('Alternative : ','').split(/,|;/)
        for (let alt of alts) {
          titles.push(alt.trim())
        }
      }
    }

    
    // Exclude child text: https://www.viralpatel.net/jquery-get-text-element-without-child-element/
    // Remove line breaks from start and end: https://stackoverflow.com/questions/14572413/remove-line-breaks-from-start-and-end-of-string
    let summary = $('#noidungm', $('.leftCol'))
                    .clone()    //clone the element
                    .children() //select all the children
                    .remove()   //remove all the children
                    .end()  //again go back to selected element
                    .text().replace(/^\s+|\s+$/g, '')
    

    manga.push(createManga({
      id: metadata.id,
      titles: titles,
      image: image,
      rating: Number(rating),
      status: status,
      artist: artist,
      author: author,
      tags: tagSections,
      views: views,
      follows: follows,
      lastUpdate: lastUpdate,
      desc: summary,
      hentai: hentai
    }))

    return manga
  }

  // Done @getBoolean
  getChaptersRequest(mangaId: string): Request {
    let idTemp = mangaId.slice( mangaId.indexOf( '/', mangaId.indexOf('/') + 2 ), mangaId.length )
    let urlDomain = mangaId.replace(idTemp, '')
    let metadata = {
      'url': urlDomain, // https://mangakakalot.com
      'id': mangaId,    // https://mangakakalot.com/read-oo1zd158524527909
      'idTemp': idTemp  // /read-oo1zd158524527909
    }

    return createRequestObject({
      url: `${urlDomain}/`,
      metadata: metadata,
      method: 'GET',
      param: idTemp
   })
  }

  // Done @getBoolean
  getChapters(data: any, metadata: any): Chapter[] {
    let chapters: Chapter[] = []
    if (metadata.id.toLowerCase().includes('mangakakalot')) {
      chapters = this.getMangakakalotChapters(data, metadata)
    }
    else { // metadata.id.toLowerCase().includes('manganelo')
      chapters = super.getChapters(data, metadata)
    }

    return chapters
  }

  // Done @getBoolean
  getMangakakalotChapters(data: any, metadata: any): Chapter[] {
    let $ = this.cheerio.load(data)
    let allChapters = $('.chapter-list', '.leftCol')
    let chapters: Chapter[] = []

    // volume is commented out because it doesn't sort properly.
    for (let chapter of $('.row', allChapters).toArray()) {
      let id: string = $('a', chapter).attr('href') ?? ''
      let text: string = $('a', chapter).text() ?? ''
      let chNum = Number( id.split('_').pop() )
      //let volume = Number ( text.includes('Vol.') ? text.slice( text.indexOf('Vol.') + 4, text.indexOf(' ')) : '')
      let name: string = text //text.includes(': ') ? text.slice(text.indexOf(': ') + 2, text.length) : ''
      
      let timeString = $('span:nth-child(3)', chapter).attr('title') ?? ''
      let time: Date
      if (timeString.includes('a'))
        time = super.convertTime(timeString.replace('mins', 'minutes').replace('hour', 'hours'))
      else
        time = new Date(timeString)

      chapters.push(createChapter({
        id: id,
        mangaId: metadata.id,
        name: name,
        langCode: LanguageCode.ENGLISH,
        chapNum: chNum,
        //volume: Number.isNaN(volume) ? 0 : volume,
        time: time
      }))
    }
    
    return chapters
  }

  // Done @getBoolean
  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    console.log('in getChapterDetailsRequest()')
    //let mangaIdTemp = mangaId.slice( mangaId.indexOf( '/', mangaId.indexOf('/') + 2 ), mangaId.length )
    //let mangaCode = chapId.slice( chapId.indexOf('chapter/') + 8, chapId.indexOf('/chapter_'))
    //let urlDomain = mangaId.replace(mangaIdTemp, '')
    //let tempChapId = chapId.split('/').pop() ?? chapId
    let metadata = {
      'mangaId': mangaId, // mangaId is the full URL
      // Thanks to @FaizanDurrani for this fix. tempChapId was used instead of chapId
      'chapterId': chapId, // chapId is the full URL
      'nextPage': false,
      'page': 1
    }
    //console.log('url: ' + `${urlDomain}/chapter/`)
    //console.log('param: ' + `${mangaCode}/${tempChapId}`)

    return createRequestObject({
      url: `${chapId}`,
      method: "GET",
      metadata: metadata
    })
  }

  // Done @getBoolean
  getChapterDetails(data: any, metadata: any): ChapterDetails {
    console.log('Inside getChapterDetails()')
    //let chapterDetails : ChapterDetails
    //console.log('metadata.mangaId: ' + metadata.mangaId)
    if (metadata.mangaId.toLowerCase().includes('mangakakalot')) {
      console.log('Invoking method this.getMangakakalotChapterDetails()')
      return this.getMangakakalotChapterDetails(data, metadata)
    }
    else { // metadata.mangaId.toLowerCase().includes('manganelo')
      console.log('Invoking method super.getChapterDetails()')
      return super.getChapterDetails(data, metadata)
    }
  }

  // Done @getBoolean
  getMangakakalotChapterDetails(data: any, metadata: any): ChapterDetails {
    console.log('In getMangakakalotChapterDetails()')
    let $ = this.cheerio.load(data)
    // Mangakakalot updated their reader, '.vung-doc' is now '.container-chapter-reader'
    let items = $('img', '.container-chapter-reader').toArray()
    let pages = Array.from(items, x=>$(x).attr('src') ?? '' )

    return createChapterDetails({
      id: metadata.chapterId,
      mangaId: metadata.mangaId,
      pages: pages,
      longStrip: false
    })
  }

  // Removed: Mangakakalot does not show the updated date on their updates page @getBoolean
  // filterUpdatedMangaRequest(ids: any, time: Date): Request | null { return null }

  // Removed: Mangakakalot does not show the updated date on their updates page @getBoolean
  // filterUpdatedManga(data: any, metadata: any): MangaUpdates | null { return null }

  // Done @getBoolean
  // Mangakakalot does not support advanced search.
  searchRequest(query: SearchRequest): Request | null {
    let metadata = { 'page': 1, 'search': '' }

    let keyword = (query.title ?? '').replace(/ /g, '_')
    if (query.author)
      keyword += (query.author ?? '').replace(/ /g, '_')
    let search: string = `${keyword}`
    //console.log('searchRequest(): ' + `${MK_DOMAIN}/search/story/` + `${search}?page=${metadata.page}`)
    metadata.search = search
    return createRequestObject({
      url: `${MK_DOMAIN}/search/story/`,
      method: 'GET',
      metadata: metadata,
      param: `${search}?page=${metadata.page}`
    })
  }

  // Done @getBoolean
  search(data: any, metadata: any): PagedResults | null {
    let $ = this.cheerio.load(data)
    let panel = $('.panel_story_list')
    let manga: MangaTile[] = []
    for (let item of $('.story_item', panel).toArray()) {
      let url = $('a', item).first().attr('href') ?? ''
      let title = $('.story_name', item).children().first().text()
      let subTitle = $('.story_chapter', item).first().text().trim()
      let image = $('img',item).attr('src') ?? ''
      if (image == '//mangakakalot.com/themes/home/images/404-avatar.png' || image == '')
        image = 'https://mangakakalot.com/themes/home/images/404-avatar.png'
      //let rating = $('.genres-item-rate', item).text()
      let time = new Date($('.story_item_right span:nth-child(5)', item).text().replace(/((AM)*(PM)*)/g, '').replace('Updated : ', ''))
      let updated = time.toDateString()

      //console.log('search(): ')
      //console.log('     url: ' + url)
      //console.log('   image: ' + image)
      manga.push(createMangaTile({
        id: url,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subTitle }),
        //primaryText: createIconText({ text: rating, icon: 'star.fill' }),
        secondaryText: createIconText({ text: updated, icon: 'clock.fill' })
      }))
    }

    metadata.page = ++metadata.page;
    let nextPage = this.isLastPage($) ? undefined : {
      url: `${MK_DOMAIN}/search/story/`,
      method: 'GET',
      metadata: metadata,
      param: `${metadata.search}&page=${metadata.page}`
    }

    return createPagedResults({
      results: manga,
      nextPage: nextPage
    });
  }

  // Removed: Mangakakalot does not support searching plus tags @getBoolean
  // getTagsRequest(): Request | null { return null }

  // Removed: Mangakakalot does not support searching plus tags @getBoolean
  // getTags(data: any): TagSection[] | null { return null }



  // Done
  getHomePageSectionRequest(): HomeSectionRequest[] | null {
    let request1 = createRequestObject({
      url: `${MK_DOMAIN}`,
      method: 'GET'
    })
    let request2 = createRequestObject({
      url: `${MK_DOMAIN}/manga_list?type=topview&category=all&state=all&page=`,
      method: 'GET'
    })
    let request3 = createRequestObject({
      url: `${MK_DOMAIN}/manga_list?type=newest&category=all&state=all&page=`,
      method: 'GET'
    })
    let request4 = createRequestObject({
      url: `${MK_DOMAIN}/manga_list?type=newest&category=all&state=Completed&page=`,
      method: 'GET'
    })

    let section1 = createHomeSection({
      id: 'popular_manga',
      title: 'POPULAR MANGA'
    })
    let section2 = createHomeSection({
      id: 'latest_updates',
      title: 'LATEST MANGA RELEASES',
      view_more: this.constructGetViewMoreRequest('latest_updates', 1)
    })
    let section3 = createHomeSection({
      id: 'hot_manga',
      title: 'HOT MANGA',
      view_more: this.constructGetViewMoreRequest('hot_manga', 1)
    })
    let section4 = createHomeSection({
      id: 'new_manga',
      title: 'NEW MANGA',
      view_more: this.constructGetViewMoreRequest('new_manga', 1)
    })
    let section5 = createHomeSection({
      id: 'zcompleted_manga',
      title: 'COMPLETED MANGA',
      view_more: this.constructGetViewMoreRequest('zcompleted_manga', 1)
    })
    return [
      createHomeSectionRequest({
        request: request1,
        sections: [section1, section2] 
      }),
      createHomeSectionRequest({
        request: request2,
        sections: [section3]
      }),
      createHomeSectionRequest({
        request: request3,
        sections: [section4]
      }),
      createHomeSectionRequest({
        request: request4,
        sections: [section5]
      })
    ]
  }

  // Done
  getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] {
    let $ = this.cheerio.load(data)

    return sections.map(section => {
      switch (section.id) {
        case 'popular_manga':
          section.items = this.parseFeaturedMangaTiles($);
          break;
        case 'latest_updates':
          section.items = this.parseLatestMangaTiles($);
          break;
        case 'hot_manga':
          section.items = this.parseMangaSectionTiles($);
          break;
        case 'new_manga':
          section.items = this.parseMangaSectionTiles($);
          break;
        case 'zcompleted_manga':
          section.items = this.parseMangaSectionTiles($);
          break;
      }

      return section;
    });
  }

  parseFeaturedMangaTiles($: CheerioSelector): MangaTile[] {
    let popularManga: MangaTile[] = [];

    for (let item of $('.item', '.owl-carousel').toArray()) {
      let url = $('a', item).first().attr('href') ?? ''
      let image = $('img', item).attr('src') ?? ''
      if (image == '//mangakakalot.com/themes/home/images/404-avatar.png' || image == '')
        image = 'https://mangakakalot.com/themes/home/images/404-avatar.png'
      let title = $('div.slide-caption', item).children().first().text()
      let subtitle = $('div.slide-caption', item).children().last().text()

      popularManga.push(createMangaTile({
        id: url,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subtitle })
      }))
    }

    return popularManga;
  }

  parseLatestMangaTiles($: CheerioSelector): MangaTile[] {
    let latestManga: MangaTile[] = [];

    for (let item of $('.first', '.doreamon').toArray()) {
      let url = $('a', item).first().attr('href') ?? ''
      let image = $('img', item).attr('src') ?? ''
      if (image == '//mangakakalot.com/themes/home/images/404-avatar.png' || image == '')
        image = 'https://mangakakalot.com/themes/home/images/404-avatar.png'
      //console.log(image)
      latestManga.push(createMangaTile({
        id: url,
        image: image,
        title: createIconText({ text: $('h3', item).text() }),
        subtitleText: createIconText({ text: $('.sts_1', item).first().text() }),
      }))
    }
    return latestManga;
  }

  parseMangaSectionTiles($: CheerioSelector): MangaTile[] {
    let latestManga: MangaTile[] = [];
    let panel = $('.truyen-list')
    for (let item of $('.list-truyen-item-wrap', panel).toArray()) {
      let id = $('a', item).first().attr('href') ?? ''
      let image = $('img', item).first().attr('src') ?? ''
      if (image == '//mangakakalot.com/themes/home/images/404-avatar.png' || image == '')
        image = 'https://mangakakalot.com/themes/home/images/404-avatar.png'
      //console.log(image)
      let title = $('a', item).first().attr('title') ?? ''
      let subtitle = $('.list-story-item-wrap-chapter', item).attr('title') ?? ''
      latestManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subtitle })
      }))
    }
    return latestManga;
  }

  // Done @getBoolean
  constructGetViewMoreRequest(key: string, page: number) {
    console.log('Invoking constructGetViewMoreRequest() for page ' + page)
    console.log('key: ' + key)
    let param = ''
    switch (key) {
      case 'latest_updates':
        param = `manga_list?type=latest&category=all&state=all&page=${page}`
        //console.log('param: ' + param)
        break;
      case 'hot_manga':
        param = `manga_list?type=topview&category=all&state=all&page=${page}`
        break;
      case 'new_manga':
        param = `manga_list?type=newest&category=all&state=all&page=${page}`
        break;
      case 'zcompleted_manga':
        param = `manga_list?type=newest&category=all&state=Completed&page=${page}`
        break;
      default:
        return undefined
    }
    console.log(`${MK_DOMAIN}/${param}`)
    return createRequestObject({
      url: `${MK_DOMAIN}/${param}`,
      method: 'GET',
      metadata: {
        key, page
      }
    })
  }


  // TODO: @getBoolean
  getViewMoreItems(data: any, key: string, metadata: any): PagedResults {
    console.log('Invoking getViewMoreItems() for page ' + metadata.page)
    console.log('key: ' + key)
    let $ = this.cheerio.load(data)
    let manga: MangaTile[] = []

    switch (key) {
      case 'latest_updates':
        manga = this.parseMangaSectionTiles($);
        break;
      case 'hot_manga':
        manga = this.parseMangaSectionTiles($);
        break;
      case 'new_manga':
        manga = this.parseMangaSectionTiles($);
        break;
      case 'zcompleted_manga':
        manga = this.parseMangaSectionTiles($);
        break;
      default:
    }

    return createPagedResults({
      results: manga,
      nextPage: manga.length > 0 ? this.constructGetViewMoreRequest(key, metadata.page + 1) : undefined
    });
  }



  /**
   * Manganelo image requests for older chapters and pages are required to have a referer to it's host
   * @param request
   */
  requestModifier(request: Request): Request {

    let headers: any = request.headers == undefined ? {} : request.headers
    headers['Referer'] = `${MK_DOMAIN}`

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
    })
  }



  

  isLastPage($: CheerioStatic): boolean {
    let current = $('.page_select').text();
    let total = $('.page_last').text();

    if (current) {
      total = (/(\d+)/g.exec(total) ?? [''])[0]
      return (+total) === (+current)
    }

    return true
  }
}