import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Image } from "../db";
import { FaTrash, FaCopy, FaDownload, FaTimes } from 'react-icons/fa';

export function Images() {
  const images = useLiveQuery(() => db.images.reverse().toArray());
  const [previewImage, setPreviewImage] = useState<Image | null>(null);

  const processedCount = useMemo(() => {
    return images?.filter(img => img.processedFile instanceof File).length || 0;
  }, [images]);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Images: {images?.length} (Processed: {processedCount})
      </h2>
      <div className="gap-2 sm:gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {images?.map((image) => {
          if(image.file.type.includes("video")) {
            return <Video video={image} key={image.id} />;
          } else {
            return <ImageSpot image={image} key={image.id} onPreview={() => setPreviewImage(image)} />;
          }
        })}
      </div>
      {previewImage && (
        <ImagePreview image={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
}

function Video({ video }: { video: Image }) {
  const url = URL.createObjectURL(video.file);
  return (
    <div className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
      <video
        className="w-full h-full object-cover"
        loop
        muted
        autoPlay
        playsInline
        src={url}
      ></video>
    </div>
  );
}

function ImageSpot({ image, onPreview }: { image: Image; onPreview: () => void }) {
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageProcessed = image.processedFile instanceof File;
  const url = URL.createObjectURL(image.file);
  const processedURL = imageProcessed ? URL.createObjectURL(image.processedFile as File) : "";
  
  const copyImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageProcessed) {
      try {
        const blob = await fetch(processedURL).then(r => r.blob());
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        alert("Image copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy image: ", err);
        alert("Failed to copy image. See console for details.");
      }
    }
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  return (
    <div 
      ref={containerRef}
      className="aspect-square relative group rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={onPreview}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        className="w-full h-full object-cover"
        src={url}
        alt={image.file.name}
      />
      {!imageProcessed && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {imageProcessed && (
        <img
          className={`absolute inset-0 w-full h-full object-cover bg-checkered transition-opacity duration-300 ${isHovering ? 'opacity-0' : 'opacity-100'}`}
          src={processedURL}
          alt="Processed"
        />
      )}
      {isHovering && imageProcessed && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center items-center">
          <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
            Hover to see original
          </div>
        </div>
      )}
      <div className="controls absolute top-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex justify-center gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); db.images.delete(image.id); }} 
          className="bg-red-500 text-white p-2 rounded-full text-xs sm:text-sm hover:bg-red-600 transition-colors"
        >
          <FaTrash />
        </button>
        {imageProcessed && (
          <>
            <button 
              onClick={copyImage} 
              className="bg-blue-500 text-white p-2 rounded-full text-xs sm:text-sm hover:bg-blue-600 transition-colors"
            >
              <FaCopy />
            </button>
            <a 
              href={processedURL} 
              download={image.processedFile instanceof File ? image.processedFile.name : undefined} 
              className="bg-green-500 text-white p-2 rounded-full text-xs sm:text-sm hover:bg-green-600 transition-colors flex items-center justify-center" 
              onClick={(e) => e.stopPropagation()}
            >
              <FaDownload />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function ImagePreview({ image, onClose }: { image: Image; onClose: () => void }) {
  const imageProcessed = image.processedFile instanceof File;
  const url = URL.createObjectURL(image.file);
  const processedURL = imageProcessed ? URL.createObjectURL(image.processedFile as File) : "";

  const copyImage = async () => {
    if (imageProcessed) {
      try {
        const blob = await fetch(processedURL).then(r => r.blob());
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        alert("Image copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy image: ", err);
        alert("Failed to copy image. See console for details.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{image.file.name}</h3>
          <button onClick={onClose} className="text-2xl sm:text-3xl text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
            <FaTimes />
          </button>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Original</h4>
            <img src={url} alt="Original" className="w-full h-auto rounded-lg shadow-md" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Processed</h4>
            {imageProcessed ? (
              <img src={processedURL} alt="Processed" className="w-full h-auto bg-checkered rounded-lg shadow-md" />
            ) : (
              <div className="w-full h-0 pb-[100%] bg-gray-200 animate-pulse rounded-lg"></div>
            )}
          </div>
        </div>
        <div className="mt-4 sm:mt-6 flex flex-wrap justify-end gap-2 sm:gap-4">
          {imageProcessed && (
            <>
              <button onClick={copyImage} className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors text-sm sm:text-base font-semibold flex items-center">
                <FaCopy className="mr-2" /> Copy to Clipboard
              </button>
              <a href={processedURL} download={image.processedFile instanceof File ? image.processedFile.name : undefined} className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition-colors text-sm sm:text-base font-semibold flex items-center">
                <FaDownload className="mr-2" /> Download Processed Image
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
