import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { IronControlState } from '@polymer/iron-behaviors/iron-control-state';
import { IronButtonState } from '@polymer/iron-behaviors/iron-button-state';
import { beforeNextRender } from '@polymer/polymer/lib/utils/render-status.js';

/*
 */
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
/* `bottom-tab` is a tab element for navigating the pages of a bottom-nav. An iron-icon
 * can be used to assign a logo to the tab. An optional label can also be used to
 * clarify the tab's meaning.
 *
 *      <bottom-nav>
 *        <bottom-toolbar selected="0">
 *          <bottom-tab label="Home" icon="icons:home"></bottom-tab>
 *          <bottom-tab label="Favorites" icon="icons:favorite"></bottom-tab>
 *          <bottom-tab label="Recent" icon="icons:clock"></bottom-tab>
 *        </bottom-toolbar>
 *      </bottom-nav>
 *
 * ## Styling
 *
 * Mixin | Description | Default
 * ------|-------------|----------
 * `--bottom-tab` | Mixin applied to the tab | `{}`
 * `--bottom-tab-content` | Mixin applied to the tab content | `{}`
 * `--bottom-tab-content-unselected` | Mixin applied to the tab content when the tab is not selected | `{}`
 *
 *      @demo demo/index.html */
class BottomTab extends mixinBehaviors([
  IronControlState,
  IronButtonState
], PolymerElement) {
  static get template() {
    return html`
    <style>
     :host {
       @apply --layout-inline;
       @apply --layout-center;
       @apply --layout-center-justified;
       @apply --layout-flex-auto;

       position: relative;
       padding: 0 12px;
       overflow: hidden;
       cursor: pointer;
       vertical-align: middle;

       @apply --paper-font-common-base;
       @apply --bottom-tab;
     }

     :host(:focus) {
       outline: none;
     }

     :host([link]) {
       padding: 0;
     }

     .tab-content {
       height: 100%;
       transform: translateZ(0);
       -webkit-transform: translateZ(0);
       padding-bottom: 10px;
       @apply --layout-vertical;
       @apply --layout-center-center;
       @apply --bottom-tab-content;
     }

     :host(:not(.iron-selected)) {
       transition: width .15s cubic-bezier(0.4, 0.0, 1, 1);
       width: 2em;
     }

     :host(:not(.iron-selected)) .tab-content {
       opacity: 0.8;
       padding-top: 8px;

       @apply --bottom-tab-content-unselected;
     }

     :host(:not(.iron-selected)) :not([show]).label {
       display: none;
     }

     :host(:not(.iron-selected)) .label {
       font-size: 12px;
       transition: font-size .1s ease-in;
     }

     :host(:focus) .tab-content {
       opacity: 1;
     }

     .tab-content > ::slotted(a) {
       height: 100%;
       width: 2em;
     }

     :host(.iron-selected:not([show-label])) {
       width: 3.5em;
     }

     :host(.iron-selected) {
       width: 2em;
     }

     :host(.iron-selected) > .tab-content {
       font-size: 14px;
       font-weight: normal;
       padding-top: 6px;
       transition: padding-top .1s ease-in;

       @apply --bottom-tab-content-selected;
     }
    </style>

    <div class="tab-content">
      <iron-icon icon="[[icon]]"></iron-icon>
      <span show\$="[[showLabel]]" class="label">[[label]]</span>
      <slot></slot>
    </div>
`;
  }

  static get is() { return 'bottom-tab'; }

  static get properties() {
    return {

      /**
       * If true, the tab will forward keyboard clicks (enter/space) to
       * the first anchor element found in its descendants
       */
      link: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },

      /**
       * A label for the tab that is hidden when not active.
       */
      label: String,

      /**
       * Whether the label should be displayed or hidden, default hidden
       */
      showLabel: {
        type: Boolean,
        value: false
      },

      /**
       * The name of an icon to display
       */
      icon: String,

      /**
       * A CSS class to attach to the parent element when the tab is selected
       */
      selectedClass: String
    }
  }

  constructor() {
    super();
    this.setAttribute('role', 'tab');
  }

  connectedCallback() {
    super.connectedCallback();
    this._updateNoink();
    beforeNextRender(this, function() {
      this.addEventListener('down', this._updateNoink);
      this.addEventListener('tap', this._onTap);
    });
  }

  get _parentNoink() {
    var parent = dom(this).parentNode;
    return !!parent && !!parent.noink;
  }

  _updateNoink() {
    this.noink = !!this.noink || !!this._parentNoink;
  }

  /**
   * Returns true when the current tab is selected
   */
  _isSelected() {
    return dom(this).node.hasAttribute('aria-selected');
  }

  /**
   * Fire an event to update the CSS class of the parent element.
   */
  _updateClass() {
    var details = {className: this.selectedClass};
    this.fire('bottom-tab-update-class', details);
  }

  /**
   * Fire a ripple event when the tab is selected
   * @param {Event} event
   */
  _activateRipple(event) {
    if (!this._isSelected() && !this.noink) {
      var x = event.detail.x,
          y = event.detail.y,
          details = {x: x, y: y};

      this.fire('bottom-tab-ripple', details);
      this._updateClass();
    }
  }

  _onTap(event) {
    if (this.link) {
      var anchor = this.queryEffectiveChildren('a');

      if (!anchor) {
        return;
      }

      // Don't get stuck in a loop delegating
      // the listener from the child anchor
      if (event.target === anchor) {
        return;
      }

      anchor.click();
    }

    this._activateRipple(event);
  }
}

customElements.define(BottomTab.is, BottomTab);
