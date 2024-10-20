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
    // Prompt the user for confirmation
    const confirmed = window.confirm("Are you sure you want to clear all images?");
    if (confirmed) {
      db.images.clear().then(() => {
        setImages([]);
      });
    }
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
      // Pass the date and url to selectedImage state
      setSelectedImage({ url: image.url, date: image.date, upscale: isTooSmall });
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
  const downloadImage = (url, date) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-${date}.png`; // Use a unique name for the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ContributionChart = ({ contributionData }) => {
    return (
      <div className="chart-container">
        {contributionData.map((day, index) => {
          const colorIntensity = Math.min(day.count * 50, 255);
          const color = day.count === 0 ? '#292929' : `rgba(255, 20, 147, ${colorIntensity / 255})`;
          return (
            <div
              key={day.date}
              className="contribution-square"
              style={{
                backgroundColor: color,
                height: '15px',
                width: '15px',
                margin: '1px',
                borderRadius: '3px',
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
        <h1>ArtHub</h1>
        <div
          className={`drop-area ${isDragging ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={() => setIsDragging(false)}
          onClick={handleClick}
        >
          <p>Upload Art</p>
          <input
            type="file"
            accept="image/png"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
        </div>
        <button className="clear-button" onClick={handleClearImages}>Clear Images</button>
      </header>
      <section className="gallery-section">
        <h2>Art Gallery</h2>
        <div className="image-gallery">
          {images.map(image => (
            <div key={image.id} className="image-container" onClick={() => openModal(image)}>
              <img src={image.url} alt={`Uploaded at ${image.date}`} />
              <p>{image.date}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="chart-section">
        <h2>{totalContributions} Total Contributions - Streak {streak}</h2>
        <ContributionChart contributionData={chartData} />
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

      {/* Fixed download button */}
      {selectedImage && (
        <button
          className="download-button fixed-download-button"
          onClick={(e) => {
            e.stopPropagation(); // Prevent modal close
            downloadImage(selectedImage.url, selectedImage.date);
          }}
        >
          Download Image
        </button>
      )}
    </div>
  );
}

export default App;
