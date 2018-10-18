import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { AppLayoutBehavior } from '@polymer/app-layout/app-layout-behavior/app-layout-behavior';
import { AppScrollEffectsBehavior } from '@polymer/app-layout/app-scroll-effects/app-scroll-effects-behavior';

import './bottom-tab.js';
import './bottom-toolbar.js';
/* `bottom-nav` is a container element for `bottom-toolbar`. It sits on the bottom of the screen
 * and can use the same scroll effects as app-header. By default `bottom-nav` follows the
 * material design spec by hiding the element when scrolling down and reveals when scrolling up.
 *
 * ```html
 * <bottom-nav>
 *   <bottom-toolbar selected="0">
 *     <bottom-tab icon="icons:home"></bottom-tab>
 *     <bottom-tab icon="icons:menu"></bottom-tab>
 *     <bottom-tab icon="icons:close"></bottom-tab>
 *     <bottom-tab icon="icons:chevron-right"></bottom-tab>
 *   </bottom-toolbar>
 * </bottom-nav>
 * ```
 *
 * All of the HTML attributes used in `app-header` also work similarly for `bottom-nav`.
 *
 * ## Styling
 *
 * Mixin | Description | Default
 * ------|-------------|----------
 * `--bottom-nav-background-front-layer` | Applies to the front layer of the background. | {}
 * `--bottom-nav-background-rear-layer` | Applies to the rear layer of the background. | {}
 * `--bottom-nav-shadow` | Applies to the shadow. | {}
 *
 *      @demo demo/index.html */
class BottomNav extends mixinBehaviors([
  AppLayoutBehavior,
  AppScrollEffectsBehavior
], PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex iron-flex-alignment">
      :host {
        position: relative;
        display: block;
        transition-timing-function: linear;
        transition-property: -webkit-transform;
        transition-property: transform;
        z-index: 1;
        @apply --layout-fixed-bottom;
      }

      :host::after {
        position: absolute;
        right: 0px;
        top: -5px;
        left: 0px;
        width: 100%;
        height: 5px;
        content: "";
        transition: opacity 0.4s;
        pointer-events: none;
        opacity: 0;
        box-shadow: inset 0px -5px 6px -3px rgba(0, 0, 0, 0.4);
        will-change: opacity;
        @apply --bottom-nav-shadow;
      }

      :host([shadow])::after {
        opacity: 1;
      }

       ::slotted([main-title]),
       ::slotted([condensed-title]) {
        -webkit-transform-origin: left top;
        transform-origin: left top;
        white-space: nowrap;
      }

       ::slotted([condensed-title]) {
        opacity: 0;
      }

      #background {
        @apply --layout-fit;
        overflow: hidden;
      }

      #backgroundFrontLayer,
      #backgroundRearLayer {
        @apply --layout-fit;
        height: 100%;
        pointer-events: none;
        background-size: cover;
      }

      #backgroundFrontLayer {
        @apply --bottom-nav-background-front-layer;
      }

      #backgroundRearLayer {
        opacity: 0;
        @apply --bottom-nav-background-rear-layer;
      }

      #contentContainer {
        position: relative;
        width: 100%;
        height: 100%;
      }

      :host([disabled]),
      :host([disabled])::after,
      :host([disabled]) #backgroundFrontLayer,
      :host([disabled]) #backgroundRearLayer,
       :host([disabled]) ::slotted(app-toolbar:first-of-type),
       :host([disabled]) ::slotted([sticky]),
      /* Silent scrolling should not run CSS transitions */
      :host-context(.app-layout-silent-scroll),
      :host-context(.app-layout-silent-scroll)::after,
      :host-context(.app-layout-silent-scroll) #backgroundFrontLayer,
      :host-context(.app-layout-silent-scroll) #backgroundRearLayer,
       :host-context(.app-layout-silent-scroll) ::slotted(app-toolbar:first-of-type),
       :host-context(.app-layout-silent-scroll) ::slotted([sticky]) {
        transition: none !important;
      }
      </style>

    <div id="contentContainer">
      <slot id="slot"></slot>
    </div>
`;
  }

  static get is() { return 'bottom-nav'; }

  static get properties() {
    return {
      /**
       * If true, the header will automatically collapse when scrolling down.
       * That is, the `sticky` element remains visible when the header is fully condensed
       * whereas the rest of the elements will collapse below `sticky` element.
       *
       * By default, the `sticky` element is the first toolbar in the light DOM:
       *
       *```html
       * <bottom-nav condenses>
       *   <app-toolbar>This toolbar remains on top</app-toolbar>
       *   <app-toolbar></app-toolbar>
       *   <app-toolbar></app-toolbar>
       * </bottom-nav>
       * ```
       *
       * Additionally, you can specify which toolbar or element remains visible in condensed mode
       * by adding the `sticky` attribute to that element. For example: if we want the last
       * toolbar to remain visible, we can add the `sticky` attribute to it.
       *
       *```html
       * <bottom-nav condenses>
       *   <app-toolbar></app-toolbar>
       *   <app-toolbar></app-toolbar>
       *   <app-toolbar sticky>This toolbar remains on top</app-toolbar>
       * </bottom-nav>
       * ```
       *
       * Note the `sticky` element must be a direct child of `bottom-nav`.
       */
      condenses: {
        type: Boolean,
        value: false
      },

      /**
       * Mantains the header fixed at the top so it never moves away.
       */
      fixed: {
        type: Boolean,
        value: false
      },

      /**
       * Slides back the header when scrolling back up.
       */
      reveals: {
        type: Boolean,
        value: true
      },

      /**
       * Displays a shadow above the nav.
       */
      shadow: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      }
    }
  }

  static get observers() {
    return [
      '_configChanged(isAttached, condenses, fixed)'
    ]
  }

  constructor() {
    super();
    /**
     * The bottom of the screen in pixels
     *
     * @type {number}
     **/
    this._bottom = window.innerHeight || document.documentElement.clientHeight;

    /**
     * A cached offsetHeight of the current element.
     *
     * @type {number}
     */
    this._height = 0;

    /**
     * The distance in pixels the header will be translated to when scrolling.
     *
     * @type {number}
     */
    this._dHeight = 0;

    /**
     * The offsetTop of `_stickyEl`
     *
     * @type {number}
     */
    this._stickyElTop = 0;

    /**
     * The header's top value used for the `transformY`
     *
     * @type {number}
     */
    this._top = window.innerHeight || document.documentElement.clientHeight;

    /**
     * The current scroll progress.
     *
     * @type {number}
     */
    this._progress = 0;

    this._wasScrollingDown = false;
    this._initScrollTop = 0;
    this._initTimestamp = 0;
    this._lastTimestamp = 0;
    this._lastScrollTop = 0;

  }


  /**
   * The distance the header is allowed to move away.
   *
   * @type {number}
   */
  get _maxHeaderTop() {
    return this.fixed ? this._dHeight : this._height + 5;
  }

  /**
   * Returns a reference to the sticky element.
   * The element that remains visible when the header condenses.
   *
   * @return {HTMLElement}?
   */
  get _stickyEl() {
    if (this._stickyElRef) {
      return this._stickyElRef;
    }
    var nodes = dom(this.$.slot).getDistributedNodes();
    // Get the element with the sticky attribute on it or the first element in the light DOM.
    for (var i = 0, node; node = /** @type {!HTMLElement} */ (nodes[i]); i++) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.hasAttribute('sticky')) {
          this._stickyElRef = node;
          break;
        } else if (!this._stickyElRef) {
          this._stickyElRef = node;
        }
      }
    }
    return this._stickyElRef;
  }

  _configChanged() {
    this.resetLayout();
    this._notifyLayoutChanged();
  }

  _updateLayoutStates() {
    if (this.offsetWidth === 0 && this.offsetHeight === 0) {
      return;
    }
    var scrollTop = this._clampedScrollTop;
    var firstSetup = this._height === 0 || scrollTop === 0;
    var currentDisabled = this.disabled;
    this._height = this.offsetHeight;
    this._stickyElRef = null;
    this.disabled = true;
    // prepare for measurement
    if  (!firstSetup) {
      this._updateScrollState(0, true);
    }
    if (this._mayMove()) {
      this._dHeight = this._stickyEl ? this._height - this._stickyEl.offsetHeight : 0;
    } else {
      this._dHeight = 0;
    }
    this._stickyElTop = this._stickyEl ? this._stickyEl.offsetTop : 0;
    this._setUpEffect();
    if (firstSetup) {
      this._updateScrollState(scrollTop, true);
    } else {
      this._updateScrollState(this._lastScrollTop, true);
      this._layoutIfDirty();
    }
    // restore no transition
    this.disabled = currentDisabled;
  }

  /**
   * Updates the scroll state.
   *
   * @param {number} scrollTop
   * @param {boolean=} forceUpdate (default: false)
   */
  _updateScrollState(scrollTop, forceUpdate) {
    if (this._height === 0) {
      return;
    }

    var progress = 0;
    var top = 0;
    var lastTop = this._top;
    var lastScrollTop = this._lastScrollTop;
    var maxHeaderTop = this._maxHeaderTop;
    var dScrollTop = scrollTop - this._lastScrollTop;
    var absDScrollTop = Math.abs(dScrollTop);
    var isScrollingDown = scrollTop > this._lastScrollTop;
    var now = Date.now();

    if (this._mayMove()) {
      top = this._clamp(this.reveals ? lastTop + dScrollTop : scrollTop, 0, maxHeaderTop);
    }

    if (scrollTop >= this._dHeight) {
      top = this.condenses && !this.fixed ? Math.max(this._dHeight, top) : top;
      // NOTE: changed for cleaner scroll effect
      this.style.transitionDuration = '250ms';
    }

    // NOTE: quick hack adding !this.fixed to avoid scroll when fixed
    if (this.reveals && !this.fixed && !this.disabled && absDScrollTop < 100) {
      // set the initial scroll position
      if (now - this._initTimestamp > 300 || this._wasScrollingDown !== isScrollingDown) {
        this._initScrollTop = scrollTop;
        this._initTimestamp = now;
      }

      if (scrollTop >= maxHeaderTop) {
        // check if the header is allowed to snap
        if (Math.abs(this._initScrollTop - scrollTop) > 30 || absDScrollTop > 10) {
          if (isScrollingDown && scrollTop >= maxHeaderTop) {
            top = maxHeaderTop;
          } else if (!isScrollingDown && scrollTop >= this._dHeight) {
            top = this.condenses && !this.fixed ? this._dHeight : 0;
          }
          var scrollVelocity = dScrollTop / (now - this._lastTimestamp);
          this.style.transitionDuration = this._clamp((top - lastTop) / scrollVelocity, 0, 300) + 'ms';
        } else {
          top = this._top;
        }
      }
    }

    if (this._dHeight === 0) {
      progress = scrollTop > 0 ? 1 : 0;
    } else {
      progress = top / this._dHeight;
    }

    if (!forceUpdate) {
      this._lastScrollTop = scrollTop;
      this._top = top;
      this._wasScrollingDown = isScrollingDown;
      this._lastTimestamp = now;
    }

    /* NOTE: quick hack to bind the header to the bottom*/
    var top = (top === 0 ||  scrollTop === 0)?
              0 : -top;

    if (forceUpdate || progress !== this._progress || lastTop !== top || scrollTop === 0) {
      this._progress = progress;
      this._runEffects(progress, top);
      this._transformHeader(top);
    }
  }

  /**
   * Returns true if the current header is allowed to move as the user scrolls.
   *
   * @return {boolean}
   */
  _mayMove() {
    return this.condenses || !this.fixed;
  }

  /**
   * Returns true if the current header will condense based on the size of the header
   * and the `consenses` property.
   *
   * @return {boolean}
   */
  willCondense() {
    return this._dHeight > 0 && this.condenses;
  }

  /**
   * Returns true if the current element is on the screen.
   * That is, visible in the current viewport.
   *
   * @method isOnScreen
   * @return {boolean}
   */
  isOnScreen() {
    return this._height !== 0 && this._top < this._height;
  }

  /**
   * Returns true if there's content below the current element.
   *
   * @method isContentBelow
   * @return {boolean}
   */
  isContentBelow() {
    if (this._top === 0) {
      return this._clampedScrollTop > 0;
    }
    return this._clampedScrollTop - this._maxHeaderTop >= 0;
  }

  /**
   * Transforms the header.
   *
   * @param {number} y
   */
  _transformHeader(y) {
    this.translate3d(0, (-y) + 'px', 0);
    if (this._stickyEl) {
      this.translate3d(0, this.condenses && y >= this._stickyElTop ?
                       (Math.min(y, this._dHeight) - this._stickyElTop) + 'px' : this._bottom,  0, this._stickyEl);
    }
  }

  _clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  _ensureBgContainers() {
    if (!this._bgContainer) {
      this._bgContainer = document.createElement('div');
      this._bgContainer.id = 'background';
      this._bgRear = document.createElement('div');
      this._bgRear.id = 'backgroundRearLayer';
      this._bgContainer.appendChild(this._bgRear);
      this._bgFront = document.createElement('div');
      this._bgFront.id = 'backgroundFrontLayer';
      this._bgContainer.appendChild(this._bgFront);
      dom(this.root).insertBefore(this._bgContainer, this.$.contentContainer);
    }
  }

  _getDOMRef(id) {
    switch (id) {
      case 'backgroundFrontLayer':
        this._ensureBgContainers();
        return this._bgFront;
      case 'backgroundRearLayer':
        this._ensureBgContainers();
        return this._bgRear;
      case 'background':
        this._ensureBgContainers();
        return this._bgContainer;
      case 'mainTitle':
        return dom(this).querySelector('[main-title]');
      case 'condensedTitle':
        return dom(this).querySelector('[condensed-title]');
    }
    return null;
  }

  /**
   * Returns an object containing the progress value of the scroll effects
   * and the top position of the header.
   *
   * @method getScrollState
   * @return {Object}
   */
  getScrollState() {
    return { progress: this._progress, top: this._top };
  }
}

customElements.define(BottomNav.is, BottomNav);
