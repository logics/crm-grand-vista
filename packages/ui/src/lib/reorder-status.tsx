import { reorderInstructions, type useReorder } from './reorder.js';

/**
 * Instruções da alça (o alvo do `aria-describedby` dela) e a região viva que
 * anuncia o movimento. Toda lista que usa `useReorder` a renderiza uma vez.
 */
export function ReorderStatus({ reorder }: { reorder: Pick<ReturnType<typeof useReorder>, 'instructionsId' | 'announcement'> }) {
  return (
    <>
      <span id={reorder.instructionsId} hidden>
        {reorderInstructions}
      </span>
      <div role="status" className="sr-only">
        {reorder.announcement}
      </div>
    </>
  );
}
