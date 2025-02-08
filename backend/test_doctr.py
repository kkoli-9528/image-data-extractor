import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from doctr.io import DocumentFile
from doctr.models import ocr_predictor

app = Flask(__name__)
CORS(app)  # Enable CORS for the entire app

# Load OCR model (pretrained with fixed vocabulary) - Load it ONCE when the app starts
predictor = ocr_predictor(det_arch='db_resnet50', reco_arch='crnn_vgg16_bn', pretrained=True)

@app.route('/ocr_doctr', methods=['POST'])
def ocr_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image part'}), 400

    image_file = request.files['image']

    if image_file.filename == '':
        return jsonify({'error': 'No selected image'}), 400

    try:
        # Save the uploaded file temporarily (optional, but good for debugging)
        temp_image_path = "temp_image.jpg"  # You can use a more robust temp file handling
        image_file.save(temp_image_path)

        # Load document from the received image
        doc = DocumentFile.from_images(temp_image_path)
        if not doc:
            return jsonify({'error': 'Could not load image for processing'}), 400

        # Perform OCR using Doctr
        result = predictor(doc)
        if not result.pages:
            return jsonify({'error': 'No text detected in the image'}), 400

        # Extract text in a simpler format (you can adjust based on your needs)
        extracted_text = ""
        for page in result.pages:
            for block in page.blocks:
                for line in block.lines:
                    for word in line.words:
                        extracted_text += word.value + " "
                    extracted_text += "\n" # New line after each line

        return jsonify({'text': extracted_text}), 200

    except Exception as e:
        print(f"Error during OCR processing: {e}") # Log error for debugging
        return jsonify({'error': 'Error processing image', 'details': str(e)}), 500

    finally:
        # Clean up temporary image file
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)

if __name__ == '__main__':
    app.run(debug=True, port=5000) # Run Flask app on port 5000 in debug mode