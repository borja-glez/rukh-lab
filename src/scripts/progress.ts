import { countDone, isDone, toggle } from '../lib/progress';

/**
 * Local progress, stored per lesson in localStorage (`rukh:progress:<m>/<l>`).
 * Three kinds of elements opt in via data attributes:
 * - `[data-progress-toggle]` button: "mark completed", `aria-pressed` mirrors the state.
 * - `[data-progress-lesson]` element: gets `is-done` when its lesson is completed.
 * - `[data-progress-count]` element: shows `done/total` for `data-lessons` (comma list).
 * Text and classes change in place, so nothing shifts layout after hydration.
 */

function readIds(el: HTMLElement): { moduleId: string; lessonId: string } | null {
  const moduleId = el.dataset.module;
  const lessonId = el.dataset.lesson;
  return moduleId && lessonId ? { moduleId, lessonId } : null;
}

function refreshMarkers() {
  document.querySelectorAll<HTMLElement>('[data-progress-lesson]').forEach((el) => {
    const ids = readIds(el);
    if (ids) el.classList.toggle('is-done', isDone(ids.moduleId, ids.lessonId));
  });
  document.querySelectorAll<HTMLElement>('[data-progress-count]').forEach((el) => {
    const moduleId = el.dataset.module;
    const lessons = (el.dataset.lessons ?? '').split(',').filter(Boolean);
    if (!moduleId || lessons.length === 0) return;
    const done = countDone(moduleId, lessons);
    el.textContent = `${done}/${lessons.length}`;
    el.classList.toggle('is-complete', done === lessons.length);
  });
}

function syncToggle(button: HTMLButtonElement) {
  const ids = readIds(button);
  if (!ids) return;
  const done = isDone(ids.moduleId, ids.lessonId);
  button.setAttribute('aria-pressed', String(done));
  const label = done ? button.dataset.labelDone : button.dataset.labelTodo;
  const text = button.querySelector<HTMLElement>('[data-progress-label]');
  if (label && text) text.textContent = label;
}

document.querySelectorAll<HTMLButtonElement>('[data-progress-toggle]').forEach((button) => {
  syncToggle(button);
  button.addEventListener('click', () => {
    const ids = readIds(button);
    if (!ids) return;
    toggle(ids.moduleId, ids.lessonId);
    syncToggle(button);
    refreshMarkers();
  });
});

refreshMarkers();
