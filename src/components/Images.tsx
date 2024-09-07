import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Image } from "../db";

export function Images() {
  const images = useLiveQuery(() => db.images.reverse().toArray());
  const [previewImage, setPreviewImage] = useState<Image | null>(null);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Images: {images?.length}</h2>
      <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
    <div className="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
      <video
        className="w-full h-auto"
        loop
        muted
        autoPlay
        src={url}
      ></video>
    </div>
  );
}

function ImageSpot({ image, onPreview }: { image: Image; onPreview: () => void }) {
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

  return (
    <div className="relative group rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
      <div key={image.id} className="cursor-pointer" onClick={onPreview}>
        <img
          className="w-full h-auto"
          src={url}
          alt={image.file.name}
        />
        {imageProcessed ? (
          <img
            className="absolute inset-0 w-full h-full bg-checkered object-contain mask"
            src={processedURL}
          />
        ) : (
          <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
        )}
      </div>
      <div className="controls absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 flex justify-between">
        <button onClick={(e) => { e.stopPropagation(); db.images.delete(image.id); }} className="bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors">Delete</button>
        {imageProcessed && (
          <>
            <button onClick={copyImage} className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-600 transition-colors">Copy</button>
            <a href={processedURL} download={image.processedFile?.name} className="bg-green-500 text-white px-3 py-1 rounded-full text-sm hover:bg-green-600 transition-colors" onClick={(e) => e.stopPropagation()}>
              Download
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">{image.file.name}</h3>
          <button onClick={onClose} className="text-3xl text-gray-600 hover:text-gray-800 transition-colors">&times;</button>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Original</h4>
            <img src={url} alt="Original" className="w-full h-auto rounded-lg shadow-md" />
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Processed</h4>
            {imageProcessed ? (
              <img src={processedURL} alt="Processed" className="w-full h-auto bg-checkered rounded-lg shadow-md" />
            ) : (
              <div className="w-full h-0 pb-[100%] bg-gray-200 animate-pulse rounded-lg"></div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          {imageProcessed && (
            <>
              <button onClick={copyImage} className="bg-blue-500 text-white px-6 py-2 rounded-full hover:bg-blue-600 transition-colors text-lg font-semibold">
                Copy to Clipboard
              </button>
              <a href={processedURL} download={image.processedFile?.name} className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition-colors text-lg font-semibold">
                Download Processed Image
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
