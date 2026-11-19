import { Button } from '@crm/ui';
import { useNavigate } from 'react-router';
import { RecordHistoryButton, type RecordHistoryButtonProps } from '../history/record-history-button.js';
import { tenantPath } from '../shell/tenant-path.js';
import { useTenantSlug } from '../shell/tenant-query.js';

export interface RecordPageActionsProps {
  /** O histórico sob demanda: sempre visível, porque quem vê o registro vê o histórico dele. */
  history: RecordHistoryButtonProps;
  /** Caminho de edição dentro da empresa (`contacts/:id/edit`); ausente, sem "Editar". */
  editPath?: string;
  /** Abre a confirmação de exclusão da ficha; ausente, sem "Excluir". */
  onDelete?: () => void;
}

/**
 * Ações do cabeçalho de toda ficha, na ordem Histórico, Editar, Excluir. A
 * ficha decide quais aparecem (pela permissão) e mantém a própria confirmação
 * de exclusão.
 */
export function RecordPageActions({ history, editPath, onDelete }: RecordPageActionsProps) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  return (
    <div className="flex gap-2">
      <RecordHistoryButton {...history} />
      {editPath && (
        <Button icon="pencil" onClick={() => navigate(tenantPath(slug, editPath))}>
          Editar
        </Button>
      )}
      {onDelete && (
        <Button variant="danger" icon="trash-2" onClick={onDelete}>
          Excluir
        </Button>
      )}
    </div>
  );
}
