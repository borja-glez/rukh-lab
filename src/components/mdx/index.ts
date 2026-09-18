/**
 * Registry of the components lessons can use in MDX (docs/04 "Componentes de
 * lección"). `components` is what Lesson.astro passes to `<Content components />`,
 * so every lesson gets them without importing anything.
 */
import Callout from './Callout.astro';
import Exercise from './Exercise.astro';
import Solution from './Solution.astro';
import Term from './Term.astro';
import Figure from './Figure.astro';
import Tabs from './Tabs.astro';
import NotebookLink from './NotebookLink.astro';
import ModelBadge from './ModelBadge.astro';
import ResultsTable from './ResultsTable.astro';
import DemoEmbed from './DemoEmbed.astro';

export {
  Callout,
  Exercise,
  Solution,
  Term,
  Figure,
  Tabs,
  NotebookLink,
  ModelBadge,
  ResultsTable,
  DemoEmbed,
};

export const components = {
  Callout,
  Exercise,
  Solution,
  Term,
  Figure,
  Tabs,
  NotebookLink,
  ModelBadge,
  ResultsTable,
  DemoEmbed,
};
