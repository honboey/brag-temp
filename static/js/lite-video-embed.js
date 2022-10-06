/**
 * A lightweight youtube embed. Still should feel the same to the user, just MUCH faster to initialize and paint.
 * https://github.com/paulirish/lite-youtube-embed
 *
 * Thx to these as the inspiration
 *   https://storage.googleapis.com/amp-vs-non-amp/youtube-lazy.html
 *   https://autoplay-youtube-player.glitch.me/
 *
 * Once built it, I also found these:
 *   https://github.com/ampproject/amphtml/blob/master/extensions/amp-youtube (👍👍)
 *   https://github.com/Daugilas/lazyYT
 *   https://github.com/vb/lazyframe
 */
 class LiteYTEmbed extends HTMLElement {
  connectedCallback() {
      this.videoId = this.getAttribute('videoid');

      let playBtnEl = this.querySelector('.lite-playbtn');
      // A label for the button takes priority over a [playlabel] attribute on the custom-element
      this.playLabel = (playBtnEl && playBtnEl.textContent.trim()) || this.getAttribute('playlabel') || 'Play Video';

      /**
       * Lo, the youtube placeholder image!  (aka the thumbnail, poster image, etc)
       *
       * See https://github.com/paulirish/lite-youtube-embed/blob/master/youtube-thumbnail-urls.md
       *
       * TODO: Do the sddefault->hqdefault fallback
       *       - When doing this, apply referrerpolicy (https://github.com/ampproject/amphtml/pull/3940)
       * TODO: Consider using webp if supported, falling back to jpg
       */
      if (!this.style.backgroundImage) {
        this.posterUrl = "https://i.ytimg.com/vi/" + this.videoId + "/hqdefault.jpg";
        // Warm the connection for the poster image
        LiteYTEmbed.addPrefetch('preload', this.posterUrl, 'image');

        this.style.backgroundImage = "url('" + this.posterUrl + "')"
      }

      // Set up play button, and its visually hidden label
      if (!playBtnEl) {
          playBtnEl = document.createElement('button');
          playBtnEl.type = 'button';
          playBtnEl.classList.add('lite-playbtn');
          this.append(playBtnEl);
      }
      if (!playBtnEl.textContent) {
          const playBtnLabelEl = document.createElement('span');
          playBtnLabelEl.className = 'sr-only';
          playBtnLabelEl.textContent = this.playLabel;
          playBtnEl.append(playBtnLabelEl);
      }

      // On hover (or tap), warm up the TCP connections we're (likely) about to use.
      this.addEventListener('pointerover', LiteYTEmbed.warmConnections, {once: true});

      // Once the user clicks, add the real iframe and drop our play button
      // TODO: In the future we could be like amp-youtube and silently swap in the iframe during idle time
      //   We'd want to only do this for in-viewport or near-viewport ones: https://github.com/ampproject/amphtml/pull/5003
      this.addEventListener('click', e => this.addIframe());
  }

  // // TODO: Support the the user changing the [videoid] attribute
  // attributeChangedCallback() {
  // }

  /**
   * Add a <link rel={preload | preconnect} ...> to the head
   */
  static addPrefetch(kind, url, as) {
      const linkEl = document.createElement('link');
      linkEl.rel = kind;
      linkEl.href = url;
      if (as) {
          linkEl.as = as;
      }
      document.head.append(linkEl);
  }

  /**
   * Begin pre-connecting to warm up the iframe load
   * Since the embed's network requests load within its iframe,
   *   preload/prefetch'ing them outside the iframe will only cause double-downloads.
   * So, the best we can do is warm up a few connections to origins that are in the critical path.
   *
   * Maybe `<link rel=preload as=document>` would work, but it's unsupported: http://crbug.com/593267
   * But TBH, I don't think it'll happen soon with Site Isolation and split caches adding serious complexity.
   */
  static warmConnections() {
      if (LiteYTEmbed.preconnected) return;

      // The iframe document and most of its subresources come right off youtube.com
      LiteYTEmbed.addPrefetch('preconnect', 'https://www.youtube-nocookie.com');
      // The botguard script is fetched off from google.com
      LiteYTEmbed.addPrefetch('preconnect', 'https://www.google.com');

      // Not certain if these ad related domains are in the critical path. Could verify with domain-specific throttling.
      LiteYTEmbed.addPrefetch('preconnect', 'https://googleads.g.doubleclick.net');
      LiteYTEmbed.addPrefetch('preconnect', 'https://static.doubleclick.net');

      LiteYTEmbed.preconnected = true;
  }

  addIframe() {
      const params = new URLSearchParams(this.getAttribute('params') || []);
      params.append('autoplay', '1');

      const iframeEl = document.createElement('iframe');
      iframeEl.width = 560;
      iframeEl.height = 315;
      // No encoding necessary as [title] is safe. https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#:~:text=Safe%20HTML%20Attributes%20include
      iframeEl.title = 'YouTube embed';
      iframeEl.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      iframeEl.allowFullscreen = true;
      // AFAIK, the encoding here isn't necessary for XSS, but we'll do it only because this is a URL
      // https://stackoverflow.com/q/64959723/89484
      iframeEl.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(this.videoId) + '?' + params.toString();
  this.append(iframeEl);
      this.append(iframeEl);

      this.classList.add('lite-activated');

      // Set focus for a11y
      this.querySelector('iframe').focus();
  }
}
// Register custom element
customElements.define('lite-youtube', LiteYTEmbed);

//
//
// Version ported for Vimeo embeds
//
// See original script: https://github.com/luwes/lite-vimeo-embed
//

class LiteVimeo extends HTMLElement {
  constructor() {
      super();
  }

  connectedCallback() {
      this.videoId = encodeURIComponent(this.getAttribute('videoid'));

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.classList.add('lite-playbtn');
      this.appendChild(playBtn);

      const playBtnLabel = document.createElement('span');
      playBtnLabel.className = 'sr-only';
      playBtnLabel.innerHTML = 'Play Video'
      playBtn.append(playBtnLabel);

      this.addEventListener('pointerover', LiteVimeo._warmConnections, {
          once: true
      });

      this.addEventListener('click', () => this._addIframe());
  }

  static addPrefetch(kind, url, as) {
      const linkEl = document.createElement('link');
      linkEl.rel = kind;
      linkEl.href = url;
      if (as) {
          linkEl.as = as;
      }
      document.head.append(linkEl);
  }

  static _warmConnections() {
      if (LiteVimeo.preconnected) return;
      LiteVimeo.addPrefetch('preconnect', 'https://player.vimeo.com');
      LiteVimeo.addPrefetch('preconnect', 'https://i.vimeocdn.com');
      LiteVimeo.addPrefetch('preconnect', 'https://f.vimeocdn.com');
      LiteVimeo.addPrefetch('preconnect', 'https://fresnel.vimeocdn.com');
      LiteVimeo.preconnected = true;
  }

  _addIframe() {
      const iframeHTML = '<iframe width="640" height="360" frameborder="0" title="Vimeo Embed" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen src="https://player.vimeo.com/video/' + this.videoId + '?autoplay=1"></iframe>';
      this.insertAdjacentHTML('beforeend', iframeHTML);
      this.classList.add('lite-activated');
  }
}
// Register custom element
customElements.define('lite-vimeo', LiteVimeo);
