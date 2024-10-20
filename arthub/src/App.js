import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Dexie from 'dexie';

const db = new Dexie('ImageDatabase');
db.version(1).stores({ images: 'id,url,date' });

function App() {
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // New state for selected image
  const fileInputRef = useRef(null);

  useEffect(() => {
    db.images.toArray().then((storedImages) => {
      setImages(storedImages);
    });
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file) => file.type === 'image/png');
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files) => {
    const promises = files.map((file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: new Date().getTime(),
            url: reader.result,
            date: new Date().toLocaleDateString(),
          });
        };
        reader.readAsDataURL(file);
      })
    );

    Promise.all(promises).then((newImages) => {
      db.images.bulkPut(newImages).then(() => {
        setImages((prevImages) => [...prevImages, ...newImages]);
      });
    });
  };

  const handleClearImages = () => {
    db.images.clear().then(() => {
      setImages([]);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };


  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).filter((file) => file.type === 'image/png');
    if (files.length > 0) {
      handleFiles(files);
    }
    e.target.value = null;
  };

  const openModal = (image) => {
    const img = new Image();
    img.src = image.url;

    img.onload = () => {
      const { width, height } = img;
      const minWidth = 300; // Set your threshold width
      const minHeight = 300; // Set your threshold height
      const isTooSmall = width < minWidth || height < minHeight;
      setSelectedImage({
        url: image.url,
        date: image.date, // Save the date
        name: image.url.split('/').pop(), // Extract the image name from the URL
        upscale: isTooSmall
      });
    };
  };
  const closeModal = () => {
    setSelectedImage(null);
  };

  const getContributionData = () => {
    const contributionMap = {};
    const today = new Date();
    let totalContributions = 0; // Initialize total contributions counter

    images.forEach(image => {
      const date = new Date(image.date);
      const key = date.toLocaleDateString();
      contributionMap[key] = (contributionMap[key] || 0) + 1;
      totalContributions++; // Increment total contributions for each image
    });

    const chartData = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toLocaleDateString();
      chartData.push({ date: key, count: contributionMap[key] || 0 });
    }

    // Calculate the streak
    let streak = 0;
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].count > 0) {
        streak++;
      } else {
        break; // Streak ends on the first day without contributions
      }
    }

    return { chartData: chartData.reverse(), streak, totalContributions }; // Return total contributions
  };


  const ContributionChart = ({ contributionData }) => {
    return (
      <div className="chart-container">
        {contributionData.map((day, index) => {
          const colorIntensity = Math.min(day.count * 50, 255);
          const color = day.count === 0 ? '#d9d9d9' : `rgba(255, 20, 147, ${colorIntensity / 255})`;
          return (
            <div
              key={day.date}
              className="contribution-square"
              style={{
                backgroundColor: color,
                height: '20px',
                width: '20px',
                margin: '1px',
                border: '1px solid #fff',
                display: 'inline-block',
              }}
            />
          );
        })}
      </div>
    );
  };

  const contributionData = getContributionData();
  const { chartData, streak, totalContributions } = contributionData; // Also extract total contributions

  return (
    <div className="App">
      <header className="App-header">
        <h1>Image Uploader</h1>
        <div
          className={`drop-area ${isDragging ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={() => setIsDragging(false)}
          onClick={handleClick}
        >
          <p>Drag and drop your PNG images here, or click to select files.</p>
          <input
            type="file"
            accept="image/png"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
        </div>
        <button className="clear-button" onClick={handleClearImages}>Clear Images</button>
        {/* Display contribution streak */}
        <p>Your contribution streak: <strong>{streak}</strong> days</p>
      </header>
      <section className="gallery-section">
        <h2>Uploaded Images:</h2>
        <div className="image-gallery">
          {images.map(image => (
            <div key={image.id} className="image-container" onClick={() => openModal(image.url)}>
              <img src={image.url} alt={`Uploaded at ${image.date}`} />
              <p>{image.date}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="chart-section">
        <h2>Contributions Chart:</h2>
        <ContributionChart contributionData={chartData} />
        <p>Total Contributions: <strong>{totalContributions}</strong></p> {/* Display total contributions here */}
      </section>

      {/* Modal for displaying the selected image */}
      {selectedImage && (
        <div className="modal" onClick={closeModal}>
          <img
            src={selectedImage.url}
            alt="Selected"
            className={`modal-image ${selectedImage.upscale ? 'upscaled' : ''}`}
          />
        </div>
      )}
    </div>
  );
}

export default App;
