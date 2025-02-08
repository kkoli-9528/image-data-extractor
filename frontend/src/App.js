import React, { useState } from 'react';
import * as XLSX from 'xlsx';       // Install: npm install xlsx
import axios from 'axios';          // Install: npm install axios

function App() {
  const [images, setImages] = useState([]);
  const [extractedData, setExtractedData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (event) => {
    setImages(Array.from(event.target.files));
  };

  const extractDataFromImage = async (imageFile) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await axios.post('http://localhost:5000/ocr_doctr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const ocrText = response.data.text;
      console.log("OCR Text from Doctr Backend:", ocrText);

      let extractedAmount = 'N/A';
      const lines = ocrText.split('\n'); // Split OCR text into lines

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim(); // Trim whitespace from line
        if (line.toLowerCase().includes('pay again') || line.toLowerCase().includes('completed')) {
          if (i > 0) { // Check if there's a line before
            const previousLine = lines[i - 1].trim();
            if (/^[\d\.\s]+$/.test(previousLine)) { // Regex to check if line is mostly digits and dots and spaces
              extractedAmount = previousLine.trim(); // Take the previous line as amount
              break; // Stop after finding the first amount
            }
          }
        }
      }


      const upiIdMatch = ocrText.match(/UPI transaction ID\s*(\d+)/);
      const dateTimeMatch = ocrText.match(/(\d{1,2} [A-Za-z]{3} \d{4}, \d{1,2}:\d{2} (am|pm))/);

      const extracted = {
        amount: extractedAmount, // Use the extracted amount from line-by-line logic
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
    setExtractedData([]);
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
    XLSX.writeFile(workbook, 'transaction_data.xlsx');
  };


  return (
    <div>
      <h1>Image Data Extractor</h1>
      <input type="file" multiple accept="image/*" onChange={handleImageChange} />
      <button onClick={handleExtractAllData} disabled={images.length === 0 || loading}>
        {loading ? "Extracting..." : "Extract Data from Images (Doctr Backend)"}
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