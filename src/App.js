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
      const { data: { text } } = await Tesseract.recognize(
        imageFile,
        'eng', // Language (English)
      );

      const amountMatch = text.match(/₹\s*(\d+)/); // Regex for amount
      const upiIdMatch = text.match(/UPI transaction ID\s*(\d+)/); // Regex for UPI ID
      const dateTimeMatch = text.match(/(\d{1,2} [A-Za-z]{3} \d{4}, \d{1,2}:\d{2} (am|pm))/); // Regex for Date & Time (adjust as needed)


      const extracted = {
        amount: amountMatch ? amountMatch[1] : 'N/A',
        upiTransactionId: upiIdMatch ? upiIdMatch[1] : 'N/A',
        dateTime: dateTimeMatch ? dateTimeMatch[1] : 'N/A',
      };
      setLoading(false);
      return extracted;

    } catch (error) {
      console.error("OCR Error:", error);
      setLoading(false);
      return { amount: 'Error', upiTransactionId: 'Error', dateTime: 'Error' }; // Handle error gracefully
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