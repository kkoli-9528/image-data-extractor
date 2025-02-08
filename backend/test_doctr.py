import os
import glob
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
from doctr.models.detection.zoo import ARCHS

# ✅ Check available detection models
print("Available Detection Models:", ARCHS)

# ✅ Load OCR model (pretrained with fixed vocabulary)
predictor = ocr_predictor(det_arch='db_resnet50', reco_arch='crnn_vgg16_bn', pretrained=True)

# ✅ Get all image files (JPG, JPEG, PNG)
image_files = glob.glob(r"C:\Users\Kunal\Documents\doctr-ocr-test\images\*.*")
image_files = [f for f in image_files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

print("Found images:", image_files)

if not image_files:
    raise FileNotFoundError("No images found in the directory. Check the path and filenames.")

# ✅ Load document (doc is a list of image arrays)
doc = DocumentFile.from_images(image_files)

if not doc:
    raise ValueError("No valid pages found in the loaded document.")

# ✅ Perform OCR
result = predictor(doc)

if not result.pages:
    print("OCR did not detect any text. Please check the images.")
    exit()

# ✅ Print the raw JSON output
print(result.export())

# ✅ Print the extracted text in a readable format
for page in result.pages:
    for block in page.blocks:
        for line in block.lines:
            for word in line.words:
                print(word.value, end=" ")
            print()  # New line after each line of words
        print("-" * 20)  # Separator between blocks
    print("=" * 30)  # Separator between pages
