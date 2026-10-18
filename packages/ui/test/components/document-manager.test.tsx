// @vitest-environment jsdom
import '../support/dom.js';
import { act, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  type DocumentCategory,
  type DocumentItem,
  DocumentManager,
  type DocumentUploadOptions,
} from '../../src/index.js';
import { fakeUpload } from '../support/upload.js';

const categories: DocumentCategory[] = [
  { id: 'juridico', name: 'Jurídico' },
  { id: 'ambiental', name: 'Ambiental' },
  { id: 'fiscal', name: 'Fiscal' },
];

const documents: DocumentItem[] = [
  {
    id: 'matricula',
    categoryId: 'juridico',
    name: 'matricula-12345.pdf',
    size: 2.4 * 1024 * 1024,
    contentType: 'application/pdf',
    uploadedAt: '2026-07-24',
    notes: 'Cópia atualizada em julho',
  },
  {
    id: 'itr',
    categoryId: 'juridico',
    name: 'certidao-itr.pdf',
    size: 800 * 1024,
    contentType: 'application/pdf',
    uploadedAt: '2026-07-02',
  },
  {
    id: 'car',
    categoryId: 'ambiental',
    name: 'recibo-car.xlsx',
    size: 18 * 1024,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: '2026-06-15',
  },
];

const group = (name: string) => screen.getByRole('region', { name });
const rowsOf = (name: string) =>
  within(within(group(name)).getByRole('list', { name: `Documentos de ${name}` }))
    .queryAllByRole('listitem')
    .map((item) => item.getAttribute('aria-label'));
const pdf = (name = 'laudo.pdf', size = 1024) => new File([new Uint8Array(size)], name, { type: 'application/pdf' });
const chooseFiles = (category: string, ...files: File[]) =>
  userEvent.upload(screen.getByLabelText(`Selecionar arquivos para ${category}`, { selector: 'input' }), files);

describe('DocumentManager — agrupamento', () => {
  it('agrupa os documentos por categoria, na ordem das categorias, com a contagem de cada uma', () => {
    render(<DocumentManager categories={categories} documents={documents} />);

    const headings = ['Jurídico · 2', 'Ambiental · 1', 'Fiscal · 0'];
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(headings);
    for (const name of headings) expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    expect(rowsOf('Jurídico')).toEqual(['matricula-12345.pdf', 'certidao-itr.pdf']);
    expect(rowsOf('Ambiental')).toEqual(['recibo-car.xlsx']);
  });

  it('categoria sem documento mostra o vazio dela', () => {
    render(<DocumentManager categories={categories} documents={documents} />);
    expect(within(group('Fiscal')).getByText('Nenhum documento nesta categoria.')).toBeInTheDocument();
    expect(within(group('Jurídico')).queryByText('Nenhum documento nesta categoria.')).not.toBeInTheDocument();
  });

  it('cada documento mostra o tipo, o nome, o tamanho e a data em pt-BR, e a nota', () => {
    render(<DocumentManager categories={categories} documents={documents} />);
    const row = screen.getByRole('listitem', { name: 'matricula-12345.pdf' });

    expect(within(row).getByRole('img', { name: 'PDF' })).toBeInTheDocument();
    expect(row).toHaveTextContent('2,4 MB · 24/07/2026');
    expect(row).toHaveTextContent('Cópia atualizada em julho');
    expect(within(screen.getByRole('listitem', { name: 'recibo-car.xlsx' })).getByRole('img', { name: 'Planilha' })).toBeInTheDocument();
  });

  it('reconhece o tipo pela extensão quando falta o content type', () => {
    render(
      <DocumentManager
        categories={categories}
        documents={[
          { id: 'foto', categoryId: 'fiscal', name: 'croqui.PNG', size: 1, uploadedAt: '2026-01-01' },
          { id: 'zip', categoryId: 'fiscal', name: 'georreferenciamento.zip', size: 1, uploadedAt: '2026-01-01' },
          { id: 'outro', categoryId: 'fiscal', name: 'planta.dwg', size: 1, uploadedAt: '2026-01-01' },
        ]}
      />,
    );
    const kind = (name: string) => within(screen.getByRole('listitem', { name })).getByRole('img').getAttribute('aria-label');
    expect([kind('croqui.PNG'), kind('georreferenciamento.zip'), kind('planta.dwg')]).toEqual([
      'Imagem',
      'Arquivo compactado',
      'Arquivo',
    ]);
  });
});

describe('DocumentManager — ações', () => {
  it('baixa o documento', async () => {
    const onDownload = vi.fn();
    render(<DocumentManager categories={categories} documents={documents} onDownload={onDownload} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar matricula-12345.pdf' }));
    expect(onDownload).toHaveBeenCalledWith(documents[0]);
  });

  it('remove só depois de confirmar', async () => {
    const onRemove = vi.fn();
    render(<DocumentManager categories={categories} documents={documents} onRemove={onRemove} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remover certidao-itr.pdf' }));
    const dialog = screen.getByRole('dialog', { name: 'Remover certidao-itr.pdf?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remover certidao-itr.pdf' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Remover certidao-itr.pdf' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }));
    expect(onRemove).toHaveBeenCalledWith(documents[1]);
  });

  it('ao confirmar a remoção, o foco vai para o título da categoria', async () => {
    function Removable() {
      const [list, setList] = useState(documents);
      return (
        <DocumentManager
          categories={categories}
          documents={list}
          onRemove={(removed) => setList(list.filter((item) => item.id !== removed.id))}
        />
      );
    }
    render(<Removable />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover certidao-itr.pdf' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }));
    expect(screen.getByRole('heading', { name: 'Jurídico · 1' })).toHaveFocus();
  });

  it('renomeia e edita a nota, com os valores atuais preenchidos', async () => {
    const onEdit = vi.fn();
    render(<DocumentManager categories={categories} documents={documents} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Editar matricula-12345.pdf' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar documento' });
    const name = within(dialog).getByRole('textbox', { name: 'Nome' });
    const notes = within(dialog).getByRole('textbox', { name: 'Nota' });
    expect(name).toHaveValue('matricula-12345.pdf');
    expect(notes).toHaveValue('Cópia atualizada em julho');

    await userEvent.clear(name);
    await userEvent.type(name, 'matricula-atualizada.pdf');
    await userEvent.clear(notes);
    await userEvent.type(notes, 'Registro de 2026{Enter}');

    expect(onEdit).toHaveBeenCalledWith(documents[0], { name: 'matricula-atualizada.pdf', notes: 'Registro de 2026' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('não salva sem nome, e diz o que falta', async () => {
    const onEdit = vi.fn();
    render(<DocumentManager categories={categories} documents={documents} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Editar certidao-itr.pdf' }));
    const dialog = screen.getByRole('dialog');
    const name = within(dialog).getByRole('textbox', { name: 'Nome' });
    await userEvent.clear(name);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Informe o nome do documento.');
  });

  it('sem as funções de ação, não oferece baixar, editar, remover nem adicionar', () => {
    render(<DocumentManager categories={categories} documents={documents} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('desabilitado, nenhuma ação responde', () => {
    render(
      <DocumentManager
        categories={categories}
        documents={documents}
        upload={fakeUpload<DocumentUploadOptions>().upload}
        onDownload={vi.fn()}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        disabled
      />,
    );
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});

describe('DocumentManager — busca', () => {
  it('filtra pelo nome, sem diferenciar maiúsculas nem acentos, e esconde as categorias sem resultado', async () => {
    render(
      <DocumentManager
        categories={categories}
        documents={[...documents, { id: 'certidao', categoryId: 'fiscal', name: 'Certidão negativa.pdf', size: 1, uploadedAt: '2026-01-01' }]}
      />,
    );
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar documentos' }), 'certidao');

    expect(screen.getAllByRole('region').map((region) => within(region).getByRole('heading').textContent)).toEqual([
      'Jurídico · 1',
      'Fiscal · 1',
    ]);
    expect(rowsOf('Jurídico')).toEqual(['certidao-itr.pdf']);
    expect(rowsOf('Fiscal')).toEqual(['Certidão negativa.pdf']);
  });

  it('sem resultado, diz que nada foi encontrado; limpar a busca volta a lista inteira', async () => {
    render(<DocumentManager categories={categories} documents={documents} />);
    const search = screen.getByRole('searchbox', { name: 'Buscar documentos' });
    await userEvent.type(search, 'escritura');

    expect(screen.queryAllByRole('region')).toEqual([]);
    expect(screen.getByText('Nenhum documento encontrado')).toBeInTheDocument();

    await userEvent.clear(search);
    expect(screen.getAllByRole('region')).toHaveLength(3);
  });
});

describe('DocumentManager — envio', () => {
  it('"Adicionar" de uma categoria envia nela e mostra o progresso ali', async () => {
    const { upload, calls } = fakeUpload<DocumentUploadOptions>();
    render(<DocumentManager categories={categories} documents={documents} upload={upload} />);

    expect(within(group('Ambiental')).getByRole('button', { name: 'Adicionar em Ambiental' })).toBeInTheDocument();
    await chooseFiles('Ambiental', pdf('laudo.pdf'));

    expect(upload).toHaveBeenCalledOnce();
    expect(calls[0]!.options.categoryId).toBe('ambiental');
    const bar = within(group('Ambiental')).getByRole('progressbar', { name: 'Enviando laudo.pdf' });
    act(() => calls[0]!.options.onProgress(60));
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect(within(group('Jurídico')).queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('Enter em "Adicionar" abre o seletor de arquivos daquela categoria', async () => {
    const opened = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {});
    render(<DocumentManager categories={categories} upload={fakeUpload<DocumentUploadOptions>().upload} accept=".pdf" />);
    screen.getByRole('button', { name: 'Adicionar em Ambiental' }).focus();
    await userEvent.keyboard('{Enter}');

    expect(opened).toHaveBeenCalledOnce();
    const input = opened.mock.contexts[0] as HTMLInputElement;
    expect(input).toHaveAttribute('aria-label', 'Selecionar arquivos para Ambiental');
    expect(input).toHaveAttribute('accept', '.pdf');
    opened.mockRestore();
  });

  it('o envio entra na categoria vazia no lugar do aviso de vazio', async () => {
    const { upload } = fakeUpload<DocumentUploadOptions>();
    render(<DocumentManager categories={categories} documents={documents} upload={upload} />);
    await chooseFiles('Fiscal', pdf('itr-2025.pdf'));
    expect(within(group('Fiscal')).queryByText('Nenhum documento nesta categoria.')).not.toBeInTheDocument();
    expect(rowsOf('Fiscal')).toEqual(['itr-2025.pdf']);
  });

  it('entrega o resultado com o arquivo e a categoria, e tira o arquivo da fila', async () => {
    const { upload, calls } = fakeUpload<DocumentUploadOptions>();
    const onUploaded = vi.fn();
    render(<DocumentManager categories={categories} documents={documents} upload={upload} onUploaded={onUploaded} />);
    await chooseFiles('Jurídico', pdf('escritura.pdf'));

    await act(async () => calls[0]!.resolve('fazendas/escritura.pdf'));
    expect(onUploaded).toHaveBeenCalledWith('fazendas/escritura.pdf', { file: calls[0]!.file, categoryId: 'juridico' });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('na falha, tenta de novo ou descarta; o envio em curso se cancela', async () => {
    const { upload, calls } = fakeUpload<DocumentUploadOptions>();
    render(<DocumentManager categories={categories} upload={upload} />);
    await chooseFiles('Fiscal', pdf('a.pdf'), pdf('b.pdf'));

    await act(async () => calls[0]!.reject(new Error('rede')));
    expect(screen.getByRole('listitem', { name: 'a.pdf' })).toHaveTextContent('Falha no envio');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(calls.map((call) => call.file.name)).toEqual(['a.pdf', 'b.pdf', 'a.pdf']);

    await act(async () => calls[2]!.reject(new Error('rede')));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar a.pdf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar envio de b.pdf' }));
    expect(calls[1]!.options.signal.aborted).toBe(true);
    expect(rowsOf('Fiscal')).toEqual([]);
  });

  it('recusa o que não é do tipo aceito ou passa do tamanho, dizendo o motivo', async () => {
    const { upload } = fakeUpload<DocumentUploadOptions>();
    render(
      <DocumentManager categories={categories} upload={upload} accept="application/pdf,.docx" maxSize={1024} />,
    );
    await userEvent.upload(screen.getByLabelText('Selecionar arquivos para Fiscal', { selector: 'input' }), [
      pdf('grande.pdf', 2048),
      new File([], 'foto.jpg', { type: 'image/jpeg' }),
      pdf('ok.pdf'),
    ], { applyAccept: false });

    expect(screen.getByRole('alert')).toHaveTextContent('grande.pdf: maior que 1 KB');
    expect(screen.getByRole('alert')).toHaveTextContent('foto.jpg: tipo de arquivo não aceito');
    expect(upload).toHaveBeenCalledOnce();
  });
});
