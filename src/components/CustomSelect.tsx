import { createSignal, createMemo, Show, For, onMount, onCleanup, createEffect } from "solid-js";
import gsap from "gsap";

export interface SelectOption {
  value: string | number;
  label: string;
  group?: string;
  icon?: string;
  badge?: string;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string | number | null | undefined;
  onChange: (value: any) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function CustomSelect(props: CustomSelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [highlightedIndex, setHighlightedIndex] = createSignal(0);

  let containerRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;
  let searchInputRef: HTMLInputElement | undefined;

  const selectedOption = createMemo(() => {
    return props.options.find((opt) => String(opt.value) === String(props.value));
  });

  const filteredOptions = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return props.options;
    return props.options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.group && opt.group.toLowerCase().includes(q))
    );
  });

  // Grouped options for structured rendering
  const groupedOptions = createMemo(() => {
    const list = filteredOptions();
    const groups: { name?: string; items: SelectOption[] }[] = [];
    const map = new Map<string, SelectOption[]>();
    const ungrouped: SelectOption[] = [];

    for (const opt of list) {
      if (opt.group) {
        if (!map.has(opt.group)) {
          map.set(opt.group, []);
        }
        map.get(opt.group)!.push(opt);
      } else {
        ungrouped.push(opt);
      }
    }

    if (ungrouped.length > 0) {
      groups.push({ items: ungrouped });
    }

    map.forEach((items, name) => {
      groups.push({ name, items });
    });

    return groups;
  });

  const handleSelect = (val: string | number) => {
    props.onChange(val);
    closeDropdown();
  };

  const openDropdown = () => {
    if (props.disabled) return;
    setIsOpen(true);
    setSearchQuery("");
    setHighlightedIndex(0);

    setTimeout(() => {
      if (props.searchable && searchInputRef) {
        searchInputRef.focus();
      }
      if (typeof window !== "undefined" && menuRef) {
        gsap.fromTo(
          menuRef,
          { opacity: 0, y: -6, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" }
        );
      }
    }, 10);
  };

  const closeDropdown = () => {
    if (typeof window !== "undefined" && menuRef && isOpen()) {
      gsap.to(menuRef, {
        opacity: 0,
        y: -4,
        scale: 0.98,
        duration: 0.12,
        ease: "power2.in",
        onComplete: () => setIsOpen(false),
      });
    } else {
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    if (isOpen()) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  // Click outside to close
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      closeDropdown();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen()) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    const flatList = filteredOptions();
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, flatList.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + flatList.length) % Math.max(1, flatList.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatList.length > 0) {
        const item = flatList[highlightedIndex()];
        if (item) handleSelect(item.value);
      }
    }
  };

  onMount(() => {
    if (typeof window !== "undefined") {
      document.addEventListener("mousedown", handleClickOutside);
    }
  });

  onCleanup(() => {
    if (typeof window !== "undefined") {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  });

  return (
    <div
      ref={containerRef}
      class={`custom-select-container ${props.size || "md"} ${props.className || ""} ${isOpen() ? "open" : ""} ${props.disabled ? "disabled" : ""}`}
      onKeyDown={handleKeyDown}
    >
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        class="custom-select-trigger"
        onClick={toggleDropdown}
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen()}
      >
        <div class="custom-select-label-wrap">
          <Show when={selectedOption()?.icon}>
            <span class="custom-select-icon">{selectedOption()?.icon}</span>
          </Show>
          <span class={`custom-select-text ${!selectedOption() ? "placeholder" : ""}`}>
            {selectedOption() ? selectedOption()?.label : props.placeholder || "Chọn mục..."}
          </span>
        </div>

        <div class="custom-select-indicators">
          <Show when={selectedOption()?.badge}>
            <span class="custom-select-badge">{selectedOption()?.badge}</span>
          </Show>
          <span class={`custom-select-chevron ${isOpen() ? "rotate" : ""}`}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </button>

      {/* DROPDOWN MENU */}
      <Show when={isOpen()}>
        <div ref={menuRef} class="custom-select-menu" role="listbox">
          {/* OPTIONAL SEARCH FILTER INSIDE DROPDOWN */}
          <Show when={props.searchable || props.options.length > 7}>
            <div class="custom-select-search-wrap">
              <svg class="custom-select-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                class="custom-select-search-input"
                placeholder="Tìm kiếm tùy chọn..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <Show when={searchQuery()}>
                <button
                  type="button"
                  class="custom-select-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    searchInputRef?.focus();
                  }}
                >
                  &times;
                </button>
              </Show>
            </div>
          </Show>

          {/* OPTIONS LIST */}
          <div class="custom-select-options-scroll">
            <Show
              when={filteredOptions().length > 0}
              fallback={
                <div class="custom-select-empty">
                  <span>Không tìm thấy kết quả phù hợp</span>
                </div>
              }
            >
              <For each={groupedOptions()}>
                {(group) => (
                  <div class="custom-select-group">
                    <Show when={group.name}>
                      <div class="custom-select-group-header">
                        <span>{group.name}</span>
                      </div>
                    </Show>

                    <For each={group.items}>
                      {(opt) => {
                        const isSelected = String(opt.value) === String(props.value);

                        return (
                          <div
                            class={`custom-select-option ${isSelected ? "selected" : ""}`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelect(opt.value)}
                          >
                            <div class="flex items-center gap-2 min-w-0 flex-1">
                              <Show when={opt.icon}>
                                <span class="custom-select-opt-icon">{opt.icon}</span>
                              </Show>
                              <span class="custom-select-opt-label">{opt.label}</span>
                            </div>

                            <Show when={isSelected}>
                              <span class="custom-select-check">✓</span>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}
