import os
from pathlib import Path
from typing import Generator, Any, Dict, List

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat

from base import DOCUMENTS

# Configurações de diretório
DIR_FILES = Path("document")
DIR_FILE_CONVERT = Path("document_convert")

# Reduza para 5 se seu ambiente tiver pouca RAM (ex: 8GB ou menos)
PAGES_PER_CHUNK = 10


def get_page_ranges(total_pages: int, chunk_size: int) -> Generator[tuple[int, int], None, None]:
    """Gera tuplas (pagina_inicio, pagina_fim) baseadas no tamanho do chunk."""
    for i in range(1, total_pages + 1, chunk_size):
        end_page = min(i + chunk_size - 1, total_pages)
        yield (i, end_page)


def process_document_in_chunks(source_path: Path, chunk_size: int = PAGES_PER_CHUNK) -> str:
    import pypdf

    reader = pypdf.PdfReader(source_path)
    total_pages = len(reader.pages)

    print(f"📄 Processando '{source_path.name}' ({total_pages} páginas no total)...")

    full_markdown_parts = []

    # 1. Configura as opções do pipeline UMA ÚNICA VEZ
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True  # Mude para False se não precisar de OCR (economiza MUITA RAM)

    # 2. Iterar sobre os intervalos de páginas ajustando o page_range
    for start_page, end_page in get_page_ranges(total_pages, chunk_size):
        print(f"   ↳ Processando páginas {start_page} até {end_page}...")

        # Define o intervalo de páginas diretamente no formato aceito pelo Docling: (inicio, fim)
        # pipeline_options.page_range = (start_page, end_page)

        # Reutiliza o mesmo converter criando o handler com o pipeline configurado
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )

        try:
            result = converter.convert(source_path, raises_on_error=False)
            
            if result.document:
                full_markdown_parts.append(result.document.export_to_markdown())
        except Exception as e:
            print(f"⚠️ Erro ao converter páginas {start_page}-{end_page}: {str(e)}")

    return "\n\n---\n\n".join(full_markdown_parts)


def convert_document(source: Dict[str, Any]) -> Path | None:
    title = source.get("title", "document")
    relative_path = source.get("path", "")
    source_path = DIR_FILES / relative_path

    if not source_path.exists():
        print(f"❌ Arquivo não encontrado: {source_path}")
        return None

    print(f"\n🚀 Iniciando conversão: {title}")

    markdown_content = process_document_in_chunks(source_path)

    output_filename = f"{source_path.stem}.md"
    output_path = DIR_FILE_CONVERT / output_filename

    output_path.write_text(markdown_content, encoding="utf-8")

    print(f"✅ Arquivo final salvo em: {output_path}")
    return output_path


if __name__ == "__main__":
    DIR_FILE_CONVERT.mkdir(parents=True, exist_ok=True)

    if not DOCUMENTS:
        print("⚠️ Sem Documentos a serem verificados.")
    else:
        for document in DOCUMENTS:
            convert_document(document)