class VariantOptionOverlay extends HTMLElement {
  #abortController;

  connectedCallback() {
    this.#abortController = new AbortController();

    document.addEventListener('variant:change', (event) => {
      if (event.target.getAttribute?.('id') !== this.getAttribute('form') || !event.detail.variant) {
        return;
      }

      this.#setValue(event.detail.variant[`option${this.getAttribute('option-position')}`]);
    }, { signal: this.#abortController.signal });

    document.addEventListener('option-slider:input', (event) => {
      if (event.detail.formId !== this.getAttribute('form') || event.detail.optionPosition !== this.getAttribute('option-position')) {
        return;
      }

      this.#setValue(event.detail.value);
    }, { signal: this.#abortController.signal });

    this.#fit();
    document.fonts.ready.then(() => this.#fit());
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  #setValue(value) {
    if (value) {
      this.firstElementChild.textContent = value;
      this.#fit();
    }
  }

  #fit() {
    const text = this.firstElementChild, available = this.clientWidth * parseFloat(this.getAttribute('max-width') || 100) / 100;

    this.style.setProperty('--option-overlay-scale', 1);

    if (available > 0 && text.offsetWidth > available) {
      this.style.setProperty('--option-overlay-scale', available / text.offsetWidth);
    }
  }
}

if (!window.customElements.get('variant-option-overlay')) {
  window.customElements.define('variant-option-overlay', VariantOptionOverlay);
}