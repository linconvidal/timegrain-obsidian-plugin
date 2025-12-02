/**
 * Shared filter bar utilities for modals
 * Apple/Bauhaus style filter chips, toggles, and selects
 */

export type RefreshCallback = () => void;

/**
 * Create a pill-shaped filter chip
 */
export function createChip(
  parent: HTMLElement,
  label: string,
  isActive: () => boolean,
  onClick: () => void,
  refresh: RefreshCallback
): HTMLButtonElement {
  const chip = parent.createEl('button', {
    text: label,
    cls: 'timegrain-filter-chip',
  });
  if (isActive()) chip.classList.add('is-active');

  chip.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
    chip.classList.toggle('is-active', isActive());
    refresh();
  });

  return chip;
}

/**
 * Create an iOS-style toggle switch
 */
export function createToggle(
  parent: HTMLElement,
  label: string,
  isActive: () => boolean,
  onClick: () => void,
  refresh: RefreshCallback
): HTMLElement {
  const wrapper = parent.createEl('div', { cls: 'timegrain-toggle-wrapper' });

  const toggle = wrapper.createEl('button', { cls: 'timegrain-toggle' });
  if (isActive()) toggle.classList.add('is-active');

  wrapper.createEl('span', { text: label, cls: 'timegrain-toggle-label' });

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
    toggle.classList.toggle('is-active', isActive());
    refresh();
  });

  return wrapper;
}

/**
 * Create a pill-styled dropdown select
 */
export function createSelect(
  parent: HTMLElement,
  placeholder: string,
  options: string[],
  selected: Set<string>,
  onChange: (value: string) => void,
  refresh: RefreshCallback
): HTMLSelectElement {
  const select = parent.createEl('select', { cls: 'timegrain-filter-select' });
  select.createEl('option', { text: placeholder, value: '' });

  for (const opt of options) {
    if (opt) {
      const option = select.createEl('option', { text: opt, value: opt });
      if (selected.has(opt)) option.selected = true;
    }
  }

  select.addEventListener('change', (e) => {
    e.stopPropagation();
    onChange(select.value);
    refresh();
  });

  return select;
}

/**
 * Create a filter row element
 */
export function createFilterRow(parent: HTMLElement, split = false): HTMLElement {
  const cls = split ? 'timegrain-filter-row timegrain-filter-row-split' : 'timegrain-filter-row';
  return parent.createEl('div', { cls });
}

/**
 * Create a filter group element
 */
export function createFilterGroup(parent: HTMLElement): HTMLElement {
  return parent.createEl('div', { cls: 'timegrain-filter-group' });
}

/**
 * Create a dot separator
 */
export function createDotSeparator(parent: HTMLElement): HTMLElement {
  return parent.createEl('span', { cls: 'timegrain-filter-dot' });
}

/**
 * Create a spacer element
 */
export function createSpacer(parent: HTMLElement): HTMLElement {
  return parent.createEl('div', { cls: 'timegrain-filter-spacer' });
}
