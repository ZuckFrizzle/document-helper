from PyPDF2 import PdfReader

def extract_signatures(pdf_path):
    reader = PdfReader(pdf_path)
    for i, field in enumerate(reader.get_fields()):
        if "Sig" in field:
            print(f"Signature {i + 1}: {field}")

extract_signatures("sample.pdf")
