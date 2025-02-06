import React, { useState } from 'react';
import Tesseract from 'tesseract.js'; // Install: npm install tesseract.js
import * as XLSX from 'xlsx';       // Install: npm install xlsx

function App() {
  const [images, setImages] = useState([]);
  const [extractedData, setExtractedData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (event) => {
    setImages(Array.from(event.target.files)); // Convert FileList to Array
  };

  const extractDataFromImage = async (imageFile) => {
    setLoading(true);
    try {
      // 1. Load image onto Canvas for pre-processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.src = URL.createObjectURL(imageFile); // Set image source from File object

      await new Promise((resolve) => { // Wait for image to load
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          resolve();
        };
      });

      // 2. Pre-processing steps on the canvas

      // a) Grayscale Conversion
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;       // red
        data[i + 1] = avg;   // green
        data[i + 2] = avg;   // blue
      }
      ctx.putImageData(imageData, 0, 0);

      // b) Contrast Enhancement (Simple Stretching - you can explore Histogram Equalization if needed)
      //    For simplicity, let's try a simple contrast stretch.  Adjust these values as needed.
      const contrastFactor = 1.0; // Experiment with values > 1 to increase contrast
      const brightnessOffset = 0; // Experiment with brightness offset

      const contrastImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const contrastData = contrastImageData.data;
      for (let i = 0; i < contrastData.length; i += 4) {
        contrastData[i] = Math.max(0, Math.min(255, contrastFactor * (contrastData[i] + brightnessOffset)));     // red
        contrastData[i + 1] = Math.max(0, Math.min(255, contrastFactor * (contrastData[i + 1] + brightnessOffset))); // green
        contrastData[i + 2] = Math.max(0, Math.min(255, contrastFactor * (contrastData[i + 2] + brightnessOffset))); // blue
      }
      ctx.putImageData(contrastImageData, 0, 0);


      // c) Thresholding (Simple Threshold - you can try Adaptive Thresholding if needed)
      const thresholdValue = 255; // Experiment with threshold values (0-255)
      const thresholdImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const thresholdData = thresholdImageData.data;
      for (let i = 0; i < thresholdData.length; i += 4) {
        const avg = (thresholdData[i] + thresholdData[i + 1] + thresholdData[i + 2]) / 3; // Grayscale again if not already grayscale
        const binaryValue = avg > thresholdValue ? 255 : 0; // White or Black
        thresholdData[i] = binaryValue;     // red
        thresholdData[i + 1] = binaryValue; // green
        thresholdData[i + 2] = binaryValue; // blue
      }
      ctx.putImageData(thresholdImageData, 0, 0);


      // d) Rescaling (Upscaling) - Try this cautiously.  Too much upscaling can blur.
      const scaleFactor = 1.0; // Experiment with scale factors > 1
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = canvas.width * scaleFactor;
      scaledCanvas.height = canvas.height * scaleFactor;
      const scaledCtx = scaledCanvas.getContext('2d');
      scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);


      // 3. Get processed image data (using scaled canvas for OCR)
      const processedImageDataURL = scaledCanvas.toDataURL('image/png'); // Get data URL of processed image
      // Or you can try canvas itself: const processedImage = scaledCanvas;

      console.log("OCR Text Output (Pre-processed Image):"); // Log for pre-processed image OCR
      const { data: { text } } = await Tesseract.recognize(
        processedImageDataURL, // Use processed image data for OCR
        'eng',
      );
      console.log(text); // Log OCR output after pre-processing

      const amountMatch = text.match(/₹\s*(\d+)/); // Try amount extraction again with pre-processed image
      const upiIdMatch = text.match(/UPI transaction ID\s*(\d+)/);
      const dateTimeMatch = text.match(/(\d{1,2} [A-Za-z]{3} \d{4}, \d{1,2}:\d{2} (am|pm))/);

      const extracted = {
        amount: amountMatch ? amountMatch[1] : 'N/A', // Now try to extract amount
        upiTransactionId: upiIdMatch ? upiIdMatch[1] : 'N/A',
        dateTime: dateTimeMatch ? dateTimeMatch[1] : 'N/A',
      };
      setLoading(false);
      return extracted;

    } catch (error) {
      console.error("OCR Error:", error);
      setLoading(false);
      return { amount: 'Error', upiTransactionId: 'Error', dateTime: 'Error' };
    }
  };

  const handleExtractAllData = async () => {
    setExtractedData([]); // Clear previous data
    const allExtracted = [];
    for (const image of images) {
      const data = await extractDataFromImage(image);
      allExtracted.push(data);
    }
    setExtractedData(allExtracted);
  };

  const handleDownloadExcel = () => {
    if (extractedData.length === 0) {
      alert("No data to export. Please extract data first.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(extractedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaction Data');
    XLSX.writeFile(workbook, 'transaction_data.xlsx'); // Triggers download
  };


  return (
    <div>
      <h1>Image Data Extractor</h1>
      <input type="file" multiple accept="image/*" onChange={handleImageChange} />
      <button onClick={handleExtractAllData} disabled={images.length === 0 || loading}>
        {loading ? "Extracting..." : "Extract Data from Images"}
      </button>
      <button onClick={handleDownloadExcel} disabled={extractedData.length === 0}>
        Download as Excel
      </button>

      {loading && <p>Processing images, please wait...</p>}

      {extractedData.length > 0 && (
        <div>
          <h2>Extracted Data:</h2>
          <table>
            <thead>
              <tr>
                <th>Amount</th>
                <th>UPI Transaction ID</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {extractedData.map((data, index) => (
                <tr key={index}>
                  <td>{data.amount}</td>
                  <td>{data.upiTransactionId}</td>
                  <td>{data.dateTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;