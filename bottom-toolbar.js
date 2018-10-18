import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { dom } from '@polymer/polymer/lib/legacy/polymer.dom.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { mixinBehaviors } from '@polymer/polymer/lib/legacy/class.js';
import { IronResizableBehavior } from '@polymer/iron-resizable-behavior';
import { IronMenuBehaviorImpl } from '@polymer/iron-menu-behavior/iron-menu-behavior';
import { IronMenubarBehavior } from '@polymer/iron-menu-behavior/iron-menubar-behavior';
import { beforeNextRender } from '@polymer/polymer/lib/utils/render-status.js';

/* `bottom-toolbar` is a tab list similar to paper-tabs for navigating
 * `bottom-nav` tabs. A selected `bottom-tab` will be elevated and have
 * a lighter color than other tabs.
 *
 * Use `selected` property to get or set the selected tab.
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
 * ### Styling
 *
 * The following custom properties and mixins are available for styling:
 *
 * Custom property | Description | Default
 * ----------------|-------------|----------
 * `--bottom-toolbar` | Mixin applied to the tabs | `{}`
 * `--bottom-toolbar-content` | Mixin applied to the content container of tabs | `{}`
 * `--bottom-toolbar-container` | Mixin applied to the layout container of tabs | `{}`
 *
 *      @demo demo/index.html */
class BottomToolbar extends mixinBehaviors([
  IronResizableBehavior,
  IronMenubarBehavior
], PolymerElement) {
  static get template() {
    return html`
      <style>
      :host {
        @apply --layout;
        @apply --layout-center;

        height: 64px;
        font-size: 14px;
        font-weight: normal;
        overflow: hidden;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-user-select: none;
        user-select: none;

        /* NOTE: Both values are needed, since some phones require the value to be \`transparent\`. */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        -webkit-tap-highlight-color: transparent;

        @apply --bottom-toolbar;
      }

      :host-context([dir=rtl]) {
        @apply --layout-horizontal-reverse;
      }

      #tabsContainer {
        position: relative;
        height: 100%;
        white-space: nowrap;
        overflow: hidden;
        @apply --layout-flex-auto;
        @apply --bottom-toolbar-container;
      }

      #tabsContent {
        height: 100%;
        @apply --bottom-toolbar-content;
      }

     #tabsContent {
        @apply --layout-horizontal;
      }

      .hidden {
        display: none;
      }

      .not-visible {
        opacity: 0;
        cursor: default;
      }
      </style>

    <div id="tabsContainer" on-down="_down">
      <div id="tabsContent">
        <paper-ripple id="ripple" noink=""></paper-ripple>
        <slot></slot>
      </div>
    </div>
`;
  }

  static get is() { return 'bottom-toolbar'; }

  static get properties() {
    return {
      /**
       * If true, ink ripple effect is disabled. When this property is changed,
       * all descendant `<bottom-toolbar>` elements have their `noink` property
       * changed to the new value as well.
       */
      noink: {
        type: Boolean,
        value: false,
        observer: '_noinkChanged'
      },

      selectable: {
        type: String,
        value: 'bottom-tab'
      },

      /**
       * If true, tabs are automatically selected when focused using the
       * keyboard.
       */
      autoselect: {
        type: Boolean,
        value: false
      },

      /**
       * The delay (in milliseconds) between when the user stops interacting
       * with the tabs through the keyboard and when the focused item is
       * automatically selected (if `autoselect` is true).
       */
      autoselectDelay: {
        type: Number,
        value: 0
      },

      _previousTab: {
        type: Object
      },

      /**
       * The custom CSS class inherited from selectedClass on `bottom-tab` child
       * elements.
       */
      _selectedClass: String
    }
  }

  get keyBindings() {
    return {
      'left:keyup right:keyup': '_onArrowKeyup'
    }
  }

  constructor() {
    super();
    this.setAttribute('role', 'tablist');
    this._holdJob = null;
    this._pendingActivationItem = undefined;
    this._pendingActivationTimeout = undefined;
    this._bindDelayedActivationHandler = this._delayedActivationHandler.bind(this);
    this.addEventListener('blur', this._onBlurCapture.bind(this), true);
  }

  ready() {
    super.ready();
    this.setScrollDirection('y', this.$.tabsContainer);
  }

  connectedCallback() {
    super.connectedCallback();
    beforeNextRender(this, function() {
      this.addEventListener('iron-resize', this._onTabSizingChanged);
      this.addEventListener('iron-items-changed', this._onTabSizingChanged);
      this.addEventListener('iron-select', this._onIronSelect);
      this.addEventListener('iron-deselect', this._onIronDeselect);
      this.addEventListener('bottom-tab-ripple', this._downAction);
      this.addEventListener('bottom-tab-update-class', this._selectClass);
    })

    // NOTE: _fixedChanged only gets called during startup.
    this._fixedChanged();

    // initialize the toolbar with the selected item's class
    var selected = this.items[this.selected];
    if (selected) {
      var newClass = selected.getAttribute('selected-class');
      if (newClass)
        this._updateClass(newClass)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cancelPendingActivation();
  }

  /**
   * @param {Event} event
   */
  _selectClass(event) {
    var newClass = event.detail.className,
        oldClass = this._selectedClass;

    if (newClass && newClass != oldClass)
      this._updateClass(newClass);
  }

  /**
   * Swaps an old CSS class on the toolbar for a new one
   * @param {string} newClass The new CSS class to attach
   */
  _updateClass(newClass) {
    dom(this).classList.remove(this._selectedClass);
    this._selectedClass = newClass;
    dom(this).classList.add(this._selectedClass);
  }

  _downAction(event) {
    var x = event.detail.x,
        y = event.detail.y;
    this.$.ripple.downAction({detail: {x: x, y: y}});

    this._upAction();
  }

  _upAction() {
    this.$.ripple.upAction();
  }

  /**
   * @param {string=} val
   */
  _noinkChanged(val) {
    this._updateAttribute('noink', val);
  }

  _fixedChanged() {
    var isFixed = dom(this).parentNode.fixed;
    this._updateAttribute('fixed', isFixed);
  }

  /**
   * @param {string} prop
   * @param {string=} val
   */
  _updateAttribute(prop, val) {
    var childTabs = dom(this).querySelectorAll('bottom-tab');
    childTabs.forEach(function(element) {
      val ? this._setAttribute(element, prop) : this._removeAttribute(element, prop);
    }.bind(this));
  }

  /**
   * @param {HTMLElement} element
   * @param {string} prop
   */
  _setAttribute(element, prop) {
    element.setAttribute(prop, '');
  }

  /**
   * @param {HTMLElement} element
   * @param {string} prop
   */
  _removeAttribute(element, prop) {
    element.removeAttribute(prop);
  }

  // TODO(cdata): Add `track` response back in when gesture lands.

  _onTabSizingChanged() {
    this.debounce('_onTabSizingChanged', function() {
    }, 10);
  }

  _onIronSelect(event) {
    this._previousTab = event.detail.item;
    this.cancelDebouncer('tab-changed');
  }

  _onIronDeselect(event) {
    this.debounce('tab-changed', function() {
      this._tabChanged(null, this._previousTab);
      this._previousTab = null;
      // See polymer/polymer#1305
    }, 1);
  }

  _activateHandler() {
    // Cancel item activations scheduled by keyboard events when any other
    // action causes an item to be activated (e.g. clicks).
    this._cancelPendingActivation();
    IronMenuBehaviorImpl._activateHandler.apply(this, arguments);
  }

  /**
   * Activates an item after a delay (in milliseconds).
   */
  _scheduleActivation(item, delay) {
    this._pendingActivationItem = item;
    this._pendingActivationTimeout = this.async(
      this._bindDelayedActivationHandler, delay);
  }

  /**
   * Activates the last item given to `_scheduleActivation`.
   */
  _delayedActivationHandler() {
    var item = this._pendingActivationItem;
    this._pendingActivationItem = undefined;
    this._pendingActivationTimeout = undefined;
    item.fire(this.activateEvent, null, {
      bubbles: true,
      cancelable: true
    });
  }

  /**
   * Cancels a previously scheduled item activation made with
   * `_scheduleActivation`.
   */
  _cancelPendingActivation() {
    if (this._pendingActivationTimeout !== undefined) {
      this.cancelAsync(this._pendingActivationTimeout);
      this._pendingActivationItem = undefined;
      this._pendingActivationTimeout = undefined;
    }
  }

  _onArrowKeyup(event) {
    if (this.autoselect) {
      this._scheduleActivation(this.focusedItem, this.autoselectDelay);
    }
  }

  _onBlurCapture(event) {
    // Cancel a scheduled item activation (if any) when that item is
    // blurred.
    if (event.target === this._pendingActivationItem) {
      this._cancelPendingActivation();
    }
  }

  _down(e) {
    // go one beat async to defeat IronMenuBehavior
    // autorefocus-on-no-selection timeout
    this.async(function() {
      if (this._defaultFocusAsync) {
        this.cancelAsync(this._defaultFocusAsync);
        this._defaultFocusAsync = null;
      }
    }, 1);
  }
}

customElements.define(BottomToolbar.is, BottomToolbar);
