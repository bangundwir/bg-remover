import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Image } from "../db";
import { FaTrash, FaCopy, FaDownload, FaTimes, FaCheckCircle, FaToggleOn, FaToggleOff, FaSpinner } from 'react-icons/fa';
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { motion } from "framer-motion";

export function Images() {
  const images = useLiveQuery(() => db.images.reverse().toArray());
  const [previewImage, setPreviewImage] = useState<Image | null>(null);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [selectionEnabled, setSelectionEnabled] = useState(false);

  const processedCount = useMemo(() => {
    return images?.filter(img => img.processedFile instanceof File).length || 0;
  }, [images]);

  const toggleSelectAll = () => {
    if (selectedImages.length === images?.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(images?.map(img => img.id).filter((id): id is number => id !== undefined) || []);
    }
  };

  const deleteSelected = async () => {
    await db.images.bulkDelete(selectedImages);
    setSelectedImages([]);
  };

  const downloadSelected = async () => {
    const selectedImagesData = await db.images
      .where('id')
      .anyOf(selectedImages)
      .toArray();

    const zip = new JSZip();

    for (const image of selectedImagesData) {
      if (image.processedFile instanceof File) {
        zip.file(image.processedFile.name, image.processedFile);
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "selected_processed_images.zip");
  };

  const toggleSelectionFeature = () => {
    setSelectionEnabled(!selectionEnabled);
    if (!selectionEnabled) {
      setSelectedImages([]);
    }
  };

  const handleMouseDown = (index: number) => {
    if (!selectionEnabled) return;
    setIsDragging(true);
    setDragStartIndex(index);
    // Toggle selection of the first clicked image
    const imageId = images?.[index].id;
    if (imageId !== undefined) {
      setSelectedImages(prev => 
        prev.includes(imageId) 
          ? prev.filter(id => id !== imageId)
          : [...prev, imageId]
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartIndex(null);
  };

  const handleMouseEnter = (index: number) => {
    if (!selectionEnabled) return;
    if (isDragging && dragStartIndex !== null && images) {
      const imageId = images[index].id;
      if (imageId !== undefined) {
        setSelectedImages(prev => {
          const isStartSelected = prev.includes(images[dragStartIndex].id ?? -1);
          if (isStartSelected) {
            // If the start image was selected, add this image to selection
            return Array.from(new Set([...prev, imageId]));
          } else {
            // If the start image was not selected, remove this image from selection
            return prev.filter(id => id !== imageId);
          }
        });
      }
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragStartIndex(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
          Images: {images?.length} (Processed: {processedCount}, Selected: {selectedImages.length})
        </h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={toggleSelectionFeature}
            className={`text-white px-3 py-1 rounded-full text-sm transition-colors ${
              selectionEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {selectionEnabled ? <FaToggleOn className="inline mr-2" /> : <FaToggleOff className="inline mr-2" />}
            {selectionEnabled ? 'Disable Selection' : 'Enable Selection'}
          </button>
          {selectionEnabled && (
            <>
              <button
                onClick={toggleSelectAll}
                className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-600 transition-colors"
              >
                {selectedImages.length === images?.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedImages.length === 0}
                className="bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Selected ({selectedImages.length})
              </button>
              <button
                onClick={downloadSelected}
                disabled={selectedImages.length === 0}
                className="bg-green-500 text-white px-3 py-1 rounded-full text-sm hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download Selected ({selectedImages.length})
              </button>
            </>
          )}
        </div>
      </div>
      <motion.div 
        className="gap-2 sm:gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        layout
      >
        {images?.map((image, index) => {
          if(image.file.type.includes("video")) {
            return <Video video={image} key={image.id} />;
          } else {
            return (
              <ImageSpot
                image={image}
                key={image.id}
                onPreview={() => setPreviewImage(image)}
                isSelected={selectedImages.includes(image.id ?? -1)}
                onToggleSelect={() => {
                  if (selectionEnabled) {
                    setSelectedImages(prev =>
                      prev.includes(image.id ?? -1)
                        ? prev.filter(id => id !== image.id)
                        : [...prev, image.id ?? -1]
                    );
                  }
                }}
                onMouseDown={() => handleMouseDown(index)}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseUp={handleMouseUp}
                selectionEnabled={selectionEnabled}
              />
            );
          }
        })}
      </motion.div>
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

function ImageSpot({ image, onPreview, isSelected, onToggleSelect, onMouseDown, onMouseEnter, onMouseUp, selectionEnabled }: { 
  image: Image; 
  onPreview: () => void; 
  isSelected: boolean; 
  onToggleSelect: () => void;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onMouseUp: () => void;
  selectionEnabled: boolean;
}) {
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
    <motion.div 
      ref={containerRef}
      className={`aspect-square relative group rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer image-hover ${isSelected && selectionEnabled ? 'selected-image' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (selectionEnabled) {
          onToggleSelect();
        } else {
          onPreview();
        }
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        if (selectionEnabled) {
          onMouseDown();
        }
      }}
      onMouseEnter={() => {
        setIsHovering(true);
        onMouseEnter();
      }}
      onMouseLeave={() => setIsHovering(false)}
      onMouseUp={onMouseUp}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 10 }}
    >
      <motion.img
        className="w-full h-full object-cover"
        src={url}
        alt={image.file.name}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      {!imageProcessed && (
        <motion.div 
          className="absolute inset-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-70" />
          <motion.div
            className="absolute inset-0 matrix-scan"
            initial={{ y: "-100%" }}
            animate={{ y: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "linear"
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-green-400 dark:text-green-300 font-mono text-lg">Processing...</div>
          </div>
        </motion.div>
      )}
      {imageProcessed && (
        <motion.img
          className={`absolute inset-0 w-full h-full object-cover bg-checkered`}
          src={processedURL}
          alt="Processed"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovering ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      {isHovering && imageProcessed && (
        <motion.div 
          className="absolute inset-x-0 bottom-4 flex justify-center items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
            Hover to see original
          </div>
        </motion.div>
      )}
      <motion.div 
        className="controls absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex justify-end gap-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: isHovering ? 1 : 0, y: isHovering ? 0 : -10 }}
        transition={{ duration: 0.3 }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); db.images.delete(image.id); }} 
          className="bg-red-500 text-white p-2 rounded-full text-xs sm:text-sm hover:bg-red-600 transition-colors button-hover"
        >
          <FaTrash />
        </button>
        {imageProcessed && (
          <>
            <button 
              onClick={copyImage} 
              className="bg-blue-500 text-white p-2 rounded-full text-xs sm:text-sm hover:bg-blue-600 transition-colors button-hover"
            >
              <FaCopy />
            </button>
            <a 
              href={processedURL} 
              download={image.processedFile instanceof File ? image.processedFile.name : undefined} 
              className="bg-green-500 text-white p-2 rounded-full text-xs sm:text-sm hover:bg-green-600 transition-colors flex items-center justify-center button-hover" 
              onClick={(e) => e.stopPropagation()}
            >
              <FaDownload />
            </a>
          </>
        )}
      </motion.div>
      {selectionEnabled && (
        <motion.div 
          className="absolute top-2 left-2 z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <motion.div 
            className={`w-6 h-6 rounded-full border-2 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white'} flex items-center justify-center`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {isSelected && <FaCheckCircle className="text-white" />}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
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
