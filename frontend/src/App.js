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
      const lines = ocrText.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.toLowerCase().includes('pay again') || line.toLowerCase().includes('completed')) {
          if (i > 0) {
            const previousLine = lines[i - 1].trim();
            const amountMatchLine = previousLine.match(/^[^.\d]*([\d\.]+)\s*$/); // Relaxed amount regex for line
            if (amountMatchLine && amountMatchLine[1]) {
              extractedAmount = amountMatchLine[1];
              break;
            }
          }
        }
      }

      // Fallback amount extraction (if line-by-line fails - try regex on whole text)
      if (extractedAmount === 'N/A') {
        const fallbackAmountMatch = ocrText.match(/(Pay again|Completed)\s*([\d\.]+)/i); // Original regex as fallback
        if (fallbackAmountMatch && fallbackAmountMatch[2]) {
          extractedAmount = fallbackAmountMatch[2];
        }
      }


      // Improved Date Regex (more flexible with day and month formats)
      const dateTimeMatch = ocrText.match(/(\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4},\s*\d{1,2}:\d{2}\s*(am|pm))/i); // More flexible date regex
      const upiIdMatch = ocrText.match(/UPI transaction ID\s*(\d+)/);


      const extracted = {
        amount: extractedAmount,
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
                <th>Index</th>
                <th>Amount</th>
                <th>UPI Transaction ID</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {extractedData.map((data, index) => (
                <tr key={index}>
                  <td>{index}</td>
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