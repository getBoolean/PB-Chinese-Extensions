// https://github.com/Paperback-iOS/extensions-beta/blob/master/src/Manganelo/Manganelo.ts
import { Source, Manga, MangaStatus, Chapter, ChapterDetails, HomeSectionRequest, HomeSection, MangaTile, SearchRequest, LanguageCode, TagSection, Request, PagedResults, SourceTag, TagType, MangaUpdates } from "paperback-extensions-common"

const MN_DOMAIN = 'https://manganelo.com'

export class Manganelo extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  get version(): string { return '1.3.0' }

  get name(): string { return 'Manganelo' }
  get icon(): string { return 'icon.png' }
  get author(): string { return 'Daniel Kovalevich' }
  get authorWebsite(): string { return 'https://github.com/DanielKovalevich' }
  get description(): string { return 'Extension that pulls manga from Manganelo, includes Advanced Search and Updated manga fetching' }
  get hentaiSource(): boolean { return false }
  getMangaShareUrl(mangaId: string): string | null { return `${MN_DOMAIN}/manga/${mangaId}` }
  get websiteBaseURL(): string { return MN_DOMAIN }
  get rateLimit(): number {
    return 2
  }

  get sourceTags(): SourceTag[] {
    return [
      {
        text: "Notifications",
        type: TagType.GREEN
      }
    ]
  }

  getMangaDetailsRequest(ids: string[]): Request[] {
    let requests: Request[] = []
    for (let id of ids) {
      let metadata = { 'id': id }
      requests.push(createRequestObject({
        url: `${MN_DOMAIN}/manga/`,
        metadata: metadata,
        method: 'GET',
        param: id
      }))
    }
    return requests
  }

  getMangaDetails(data: any, metadata: any): Manga[] {
    let manga: Manga[] = []
    let $ = this.cheerio.load(data)
    let panel = $('.panel-story-info')
    let title = $('.img-loading', panel).attr('title') ?? ''
    let image = $('.img-loading', panel).attr('src') ?? ''
    let table = $('.variations-tableInfo', panel)
    let author = ''
    let artist = ''
    let rating = 0
    let status = MangaStatus.ONGOING
    let titles = [title]
    let follows = 0
    let views = 0
    let lastUpdate = ''
    let hentai = false

    let tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }), createTagSection({ id: '1', label: 'format', tags: [] })]

    for (let row of $('tr', table).toArray()) {
      if ($(row).find('.info-alternative').length > 0) {
        let alts = $('h2', table).text().split(/,|;/)
        for (let alt of alts) {
          titles.push(alt.trim())
        }
      }
      else if ($(row).find('.info-author').length > 0) {
        let autart = $('.table-value', row).find('a').toArray()
        author = $(autart[0]).text()
        if (autart.length > 1) {
          artist = $(autart[1]).text()
        }
      }
      else if ($(row).find('.info-status').length > 0) {
        status = $('.table-value', row).text() == 'Ongoing' ? MangaStatus.ONGOING : MangaStatus.COMPLETED
      }
      else if ($(row).find('.info-genres').length > 0) {
        let elems = $('.table-value', row).find('a').toArray()
        let genres: string[] = []
        for (let elem of elems) {
          let text = $(elem).text()
          //let id = $(elem).attr('href')?.split('/').pop()?.split('-').pop() ?? ''
          if (text.toLowerCase().includes('smut')) {
            hentai = true
          }
          genres.push(text)
          //tagSections[0].tags.push(createTag({ id: text, label: text }))
        }
        tagSections[0].tags = genres.map((elem: string) => createTag({ id: elem, label: elem }))
      }
    }

    table = $('.story-info-right-extent', panel)
    for (let row of $('p', table).toArray()) {
      if ($(row).find('.info-time').length > 0) {
        let time = new Date($('.stre-value', row).text().replace(/(-*(AM)*(PM)*)/g, ''))
        lastUpdate = time.toDateString()
      }
      else if ($(row).find('.info-view').length > 0) {
        views = Number($('.stre-value', row).text().replace(/,/g, ''))
      }
    }

    rating = Number($('[property=v\\:average]', table).text())
    follows = Number($('[property=v\\:votes]', table).text())
    //let summary = $('.panel-story-info-description', panel).text()
    // Exclude child text: https://www.viralpatel.net/jquery-get-text-element-without-child-element/
    // Remove line breaks from start and end: https://stackoverflow.com/questions/14572413/remove-line-breaks-from-start-and-end-of-string
    let summary = $('.panel-story-info-description', panel)
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

  getChaptersRequest(mangaId: string): Request {
    let metadata = { 'id': mangaId }
    return createRequestObject({
      url: `${MN_DOMAIN}/manga/`,
      metadata: metadata,
      method: 'GET',
      param: mangaId
    })
  }

  getChapters(data: any, metadata: any): Chapter[] {
    let $ = this.cheerio.load(data)
    let allChapters = $('.row-content-chapter', '.body-site')
    let chapters: Chapter[] = []

    // volume is commented out because it doesn't sort properly.
    for (let chapter of $('li', allChapters).toArray()) {
      let id: string = $('a', chapter).attr('href') ?? ''
      let name: string = $('a', chapter).text() ?? ''
      let chNum: number = Number((/Chapter (\d*)/g.exec(name) ?? [])[1] ?? '')
      //let volume = Number( name.includes('Vol.') ? name.slice( name.indexOf('Vol.') + 4, name.indexOf(' ')) : '')
      //name = name.includes(': ') ? name.slice(name.indexOf(': ') + 2, name.length) : ''
      let time: Date = new Date($('.chapter-time', chapter).attr('title') ?? '')

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

  getChapterDetailsRequest(mangaId: string, chId: string): Request {
    let metadata = { 'mangaId': mangaId, 'chapterId': chId, 'nextPage': false, 'page': 1 }
    return createRequestObject({
      url: `${MN_DOMAIN}/chapter/`,
      method: "GET",
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Cookie: 'content_lazyload=off'
      },
      param: `${mangaId}/${chId}`
    })
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {
    let $ = this.cheerio.load(data)
    // let pages: string[] = []
    let pages = Array.from($('img', '.container-chapter-reader').toArray(), x=>$(x).attr('src') ?? '' )
    /*for (let item of $('img', '.container-chapter-reader').toArray()) {
      pages.push($(item).attr('src') ?? '')
    }*/

    let chapterDetails = createChapterDetails({
      id: metadata.chapterId,
      mangaId: metadata.mangaId,
      pages: pages,
      longStrip: false
    })

    return chapterDetails
  }

  filterUpdatedMangaRequest(ids: any, time: Date): Request {
    let metadata = { 'ids': ids, 'referenceTime': time, page: 1 }
    return createRequestObject({
      url: `${MN_DOMAIN}/genre-all/`,
      method: 'GET',
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      param: `${metadata.page}`
    })
  }

  filterUpdatedManga(data: any, metadata: any): MangaUpdates | null {
    let $ = this.cheerio.load(data)

    let returnObject: MangaUpdates = {
      ids: [],
      nextPage: undefined
    }

    let passedReferenceTime = false;
    let panel = $('.panel-content-genres')
    for (let item of $('.content-genres-item', panel).toArray()) {
      let id = ($('a', item).first().attr('href') ?? '').split('/').pop() ?? ''
      let time = new Date($('.genres-item-time').first().text())
      // site has a quirk where if the manga what updated in the last hour
      // it will put the update time as tomorrow
      if (time > new Date(Date.now())) {
        time = new Date(Date.now() - 60000)
      }

      passedReferenceTime = time <= metadata.referenceTime;
      if (!passedReferenceTime) {
        if (metadata.ids.includes(id)) {
          returnObject.ids.push(id)
        }
      }
      else break;
    }

    if (!passedReferenceTime) {
      metadata.page++;
      returnObject.nextPage = createRequestObject({
        url: `${MN_DOMAIN}/genre-all/`,
        method: 'GET',
        metadata: metadata,
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        param: `${metadata.page}`
      })
    }

    return createMangaUpdates(returnObject)
  }

  constructGetViewMoreRequest(key: string, page: number) {
    let metadata = { page: page }
    let param = ''
    switch (key) {
      case 'latest_updates': {
        param = `/genre-all/${metadata.page}`
        break
      }
      case 'new_manga': {
        param = `/genre-all/${metadata.page}?type=newest`
        break
      }
      default: return undefined
    }

    return createRequestObject({
      url: `${MN_DOMAIN}`,
      method: 'GET',
      param: param,
      metadata: {
        key, page
      }
    })
  }

  getHomePageSectionRequest(): HomeSectionRequest[] | null {
    let request = createRequestObject({ url: `${MN_DOMAIN}`, method: 'GET', })
    let section1 = createHomeSection({ id: 'top_week', title: 'TOP OF THE WEEK' })
    let section2 = createHomeSection({ id: 'latest_updates', title: 'LATEST UPDATES', view_more: this.constructGetViewMoreRequest('latest_updates', 1) })
    let section3 = createHomeSection({ id: 'new_manga', title: 'NEW MANGA', view_more: this.constructGetViewMoreRequest('new_manga', 1) })
    return [createHomeSectionRequest({ request: request, sections: [section1, section2, section3] })]
  }

  getHomePageSections(data: any, sections: HomeSection[]): HomeSection[] | null {
    let $ = this.cheerio.load(data)
    let topManga: MangaTile[] = []
    let updateManga: MangaTile[] = []
    let newManga: MangaTile[] = []

    for (let item of $('.item', '.owl-carousel').toArray()) {
      let id = $('a', item).first().attr('href')?.split('/').pop() ?? ''
      let image = $('img', item).attr('src') ?? ''
      topManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: $('a', item).first().text() }),
        subtitleText: createIconText({ text: $('[rel=nofollow]', item).text() })
      }))
    }

    for (let item of $('.content-homepage-item', '.panel-content-homepage').toArray()) {
      let id = $('a', item).first().attr('href')?.split('/').pop() ?? ''
      let image = $('img', item).attr('src') ?? ''
      let itemRight = $('.content-homepage-item-right', item)
      let latestUpdate = $('.item-chapter', itemRight).first()
      updateManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: $('a', itemRight).first().text() }),
        subtitleText: createIconText({ text: $('.item-author', itemRight).text() }),
        primaryText: createIconText({ text: $('.genres-item-rate', item).text(), icon: 'star.fill' }),
        secondaryText: createIconText({ text: $('i', latestUpdate).text(), icon: 'clock.fill' })
      }))
    }

    for (let item of $('a', '.panel-newest-content').toArray()) {
      let id = $(item).attr('href')?.split('/').pop() ?? ''
      let image = $('img', item).attr('src') ?? ''
      let title = $('img', item).attr('alt') ?? ''
      newManga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title })
      }))
    }

    sections[0].items = topManga
    sections[1].items = updateManga
    sections[2].items = newManga
    return sections
  }

  searchRequest(query: SearchRequest): Request | null {
    let metadata = { page: 1, search: '' }
    let genres = (query.includeGenre ?? []).concat(query.includeDemographic ?? []).join('_')
    let excluded = (query.excludeGenre ?? []).concat(query.excludeDemographic ?? []).join('_')
    let status = ""
    switch (query.status) {
      case 0: status = 'completed'; break
      case 1: status = 'ongoing'; break
      default: status = ''
    }

    let keyword = (query.title ?? '').replace(/ /g, '_')
    if (query.author)
      keyword += (query.author ?? '').replace(/ /g, '_')
    let search: string = `s=all&keyw=${keyword}`
    search += `&g_i=${genres}&g_e=${excluded}`
    if (status) {
      search += `&sts=${status}`
    }

    metadata.search = search
    return createRequestObject({
      url: `${MN_DOMAIN}/advanced_search?`,
      method: 'GET',
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      param: `${search}&page=${metadata.page}`
    })
  }

  search(data: any, metadata: any): PagedResults | null {
    let $ = this.cheerio.load(data)
    let panel = $('.panel-content-genres')
    let manga: MangaTile[] = []
    for (let item of $('.content-genres-item', panel).toArray()) {
      let id = $('.genres-item-name', item).attr('href')?.split('/').pop() ?? ''
      let title = $('.genres-item-name', item).text()
      let subTitle = $('.genres-item-chap', item).text()
      let image = $('.img-loading', item).attr('src') ?? ''
      let rating = $('.genres-item-rate', item).text()
      let updated = $('.genres-item-time', item).text()

      manga.push(createMangaTile({
        id: id,
        image: image,
        title: createIconText({ text: title }),
        subtitleText: createIconText({ text: subTitle }),
        primaryText: createIconText({ text: rating, icon: 'star.fill' }),
        secondaryText: createIconText({ text: updated, icon: 'clock.fill' })
      }))
    }

    metadata.page = metadata.page++;
    let nextPage = this.isLastPage($) ? undefined : {
      url: `${MN_DOMAIN}/advanced_search?`,
      method: 'GET',
      metadata: metadata,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      param: `${metadata.search}&page=${metadata.page}`
    }

    return createPagedResults({
      results: manga,
      nextPage: nextPage
    });
  }

  getTagsRequest(): Request | null {
    return createRequestObject({
      url: `${MN_DOMAIN}/advanced_search?`,
      method: 'GET',
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      }
    })
  }

  getTags(data: any): TagSection[] | null {
    let $ = this.cheerio.load(data)
    let panel = $('.advanced-search-tool-genres-list')
    let genres = createTagSection({
      id: 'genre',
      label: 'Genre',
      tags: []
    })
    for (let item of $('span', panel).toArray()) {
      let id = $(item).attr('data-i') ?? ''
      let label = $(item).text()
      genres.tags.push(createTag({ id: id, label: label }))
    }
    return [genres]
  }

  getViewMoreRequest(key: string): Request | undefined {
    let metadata = { page: 1 }
    let param = ''
    switch (key) {
      case 'latest_updates': {
        param = `/genre-all/${metadata.page}`
        break
      }
      case 'new_manga': {
        param = `/genre-all/${metadata.page}?type=newest`
        break
      }
      default: return undefined
    }

    return createRequestObject({
      url: `${MN_DOMAIN}`,
      method: 'GET',
      param: param,
      metadata: metadata
    })
  }

  getViewMoreItems(data: any, key: string, metadata: any): PagedResults | null {
    let $ = this.cheerio.load(data)
    let manga: MangaTile[] = []
    if (key == 'latest_updates' || key == 'new_manga') {
      let panel = $('.panel-content-genres')
      for (let item of $('.content-genres-item', panel).toArray()) {
        let id = ($('a', item).first().attr('href') ?? '').split('/').pop() ?? ''
        let image = $('img', item).attr('src') ?? ''
        let title = $('.genres-item-name', item).text()
        let subtitle = $('.genres-item-chap', item).text()
        let time = new Date($('.genres-item-time').first().text())
        if (time > new Date(Date.now())) {
          time = new Date(Date.now() - 60000)
        }
        let rating = $('.genres-item-rate', item).text()
        manga.push(createMangaTile({
          id: id,
          image: image,
          title: createIconText({ text: title }),
          subtitleText: createIconText({ text: subtitle }),
          primaryText: createIconText({ text: rating, icon: 'star.fill' }),
          secondaryText: createIconText({ text: time.toDateString(), icon: 'clock.fill' })
        }))
      }
    }
    else return null

    let nextPage: Request | undefined = undefined
    console.log(!this.isLastPage($));
    if (!this.isLastPage($)) {
      metadata.page = metadata.page++;
      let param = ''
      switch (key) {
        case 'latest_updates': {
          param = `/genre-all/${metadata.page}`
          break
        }
        case 'new_manga': {
          param = `/genre-all/${metadata.page}?type=newest`
          break
        }
        default: return null
      }
      nextPage = {
        url: `${MN_DOMAIN}`,
        method: 'GET',
        param: param,
        metadata: metadata
      }
      console.log(nextPage.url);
      console.log(nextPage.method);
      console.log(nextPage.param);
    }

    return createPagedResults({
      results: manga,
      nextPage: nextPage
    });
  }

  /**
   * Manganelo image requests for older chapters and pages are required to have a referer to it's host
   * @param request
   */
  requestModifier(request: Request): Request {

    let headers: any = request.headers == undefined ? {} : request.headers
    headers['Referer'] = `${MN_DOMAIN}`

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
    let current = $('.page-select').text();
    let total = $('.page-last').text();

    if (current) {
      total = (/(\d+)/g.exec(total) ?? [''])[0]
      return (+total) === (+current)
    }

    return true
  }
}