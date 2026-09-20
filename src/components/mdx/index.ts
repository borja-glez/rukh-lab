/**
 * Registry of the components lessons can use in MDX (docs/04 "Componentes de
 * lección"). `components` is what Lesson.astro passes to `<Content components />`,
 * so every lesson gets them without importing anything.
 */
import Callout from './Callout.astro';
import Exercise from './Exercise.astro';
import Solution from './Solution.astro';
import Term from './Term.astro';
import Transfer from './Transfer.astro';
import Figure from './Figure.astro';
import Tabs from './Tabs.astro';
import NotebookLink from './NotebookLink.astro';
import ModelBadge from './ModelBadge.astro';
import ResultsTable from './ResultsTable.astro';
import DemoEmbed from './DemoEmbed.astro';
import TokenizerStats from './TokenizerStats.astro';
import AttentionMap from '../../islands/AttentionMap';
import TrainingReplay from '../../islands/TrainingReplay';
import ValueBar from '../../islands/ValueBar';

export {
  Callout,
  Exercise,
  Solution,
  Term,
  Transfer,
  Figure,
  Tabs,
  NotebookLink,
  ModelBadge,
  ResultsTable,
  DemoEmbed,
  TokenizerStats,
  AttentionMap,
  TrainingReplay,
  ValueBar,
};

export const components = {
  Callout,
  Exercise,
  Solution,
  Term,
  Transfer,
  Figure,
  Tabs,
  NotebookLink,
  ModelBadge,
  ResultsTable,
  DemoEmbed,
  TokenizerStats,
};

/*
 * Preact islands a lesson may embed. They are registered here so there is one list of everything
 * MDX can use, but they are deliberately NOT part of `components`: a client directive
 * (`client:visible`) only works on a component the MDX file imports itself, so a lesson imports
 * the island directly and Astro hydrates it. See docs/runbooks/lessons.md.
 */
export const islands = {
  AttentionMap,
  TrainingReplay,
  ValueBar,
};
