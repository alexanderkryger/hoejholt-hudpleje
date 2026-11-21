const defaultedForms = new Set();

class OptionSlider extends HTMLElement {
  #abortController;
  #range;
  #radio;
  #values;
  #label;
  #message;

  connectedCallback() {
    this.#abortController = new AbortController();
    this.#range = this.querySelector('input[type="range"]');
    this.#radio = this.querySelector('input[data-option-slider-value]');
    this.#values = JSON.parse(this.querySelector('script[type="application/json"]').textContent);
    this.#label = this.closest('fieldset')?.querySelector('legend + span');
    this.#message = this.querySelector('[data-option-message]');

    this.#range.addEventListener('input', () => this.#updateUI(), { signal: this.#abortController.signal });
    this.#range.addEventListener('change', (event) => {
      event.stopPropagation();
      this.#commit();
    }, { signal: this.#abortController.signal });

    this.querySelectorAll('[data-mode-button]').forEach((button) => {
      button.addEventListener('click', () => this.#setMode(button.getAttribute('data-mode-button')), { signal: this.#abortController.signal });
    });

    document.addEventListener('change', (event) => {
      if (event.target === this.#radio || event.target.name !== this.#radio.name || event.target.getAttribute('form') !== this.#radio.getAttribute('form')) {
        return;
      }

      const selectedValue = this.querySelector('[data-treatment-selected-value]'), label = event.target.closest('label');

      if (selectedValue && label) {
        selectedValue.textContent = label.textContent.trim();
      }
    }, { signal: this.#abortController.signal });

    this.#applyDefault();
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  #setMode(mode) {
    this.querySelectorAll('[data-mode-button]').forEach((button) => {
      const selected = button.getAttribute('data-mode-button') === mode;

      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected);
    });

    this.querySelectorAll('[data-mode-panel]').forEach((panel) => {
      panel.hidden = panel.getAttribute('data-mode-panel') !== mode;
    });

    if (mode === 'amount') {
      this.#updateUI();
      this.#commit();
    }
  }

  #updateUI() {
    const index = parseInt(this.#range.value), value = this.#values[index];

    if (!value) {
      return;
    }

    this.#range.parentElement.style.setProperty('--range-max', `${parseInt(this.#range.max) > 0 ? index / parseInt(this.#range.max) * 100 : 100}%`);
    this.#range.setAttribute('aria-valuetext', value.name);

    if (this.#label) {
      this.#label.textContent = value.name;
    }

    if (this.#message) {
      this.#message.textContent = value.message || '';
      this.#message.hidden = !value.message;
    }

    this.dispatchEvent(new CustomEvent('option-slider:input', {
      bubbles: true,
      detail: {
        formId: this.#radio.getAttribute('form'),
        optionPosition: this.#radio.getAttribute('data-option-position'),
        value: value.name
      }
    }));
  }

  #commit() {
    const value = this.#values[parseInt(this.#range.value)];

    if (!value || (this.#radio.checked && String(value.id) === this.#radio.value)) {
      return;
    }

    this.#radio.setAttribute('value', value.id);
    this.#radio.checked = true;
    this.#radio.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async #applyDefault() {
    const formId = this.#radio.getAttribute('form');

    if (!this.hasAttribute('default-index') || !this.#radio.checked || defaultedForms.has(formId)) {
      return;
    }

    defaultedForms.add(formId);

    const variantPicker = this.closest('variant-picker');

    if (variantPicker?.hasAttribute('update-url') && new URL(window.location.href).searchParams.has('variant')) {
      return;
    }

    const defaultIndex = parseInt(this.getAttribute('default-index'));

    if (defaultIndex === parseInt(this.#range.value)) {
      return;
    }

    await window.customElements.whenDefined('variant-picker');

    this.#range.value = defaultIndex;
    this.#updateUI();
    this.#commit();
  }
}

if (!window.customElements.get('option-slider')) {
  window.customElements.define('option-slider', OptionSlider);
}