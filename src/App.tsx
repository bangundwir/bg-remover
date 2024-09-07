import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
} from "@huggingface/transformers";

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { db } from './db';
import { useLiveQuery } from "dexie-react-hooks";
import { Images } from "./components/Images";
import { processImages } from "../lib/process";
import { FaMoon, FaSun, FaCloudDownloadAlt } from 'react-icons/fa';

export default function App() {
  const [images, setImages] = useState([]);

  const [processedImages, setProcessedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const modelRef = useRef<any>(null);
  const processorRef = useRef<any>(null);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!('gpu' in navigator)) {
          throw new Error("WebGPU is not supported in this browser.");
        }
        const model_id = "Xenova/modnet";
        env.backends.onnx!.wasm!.proxy = false;
        modelRef.current ??= await AutoModel.from_pretrained(model_id, {
          device: "webgpu",
        });
        processorRef.current ??= await AutoProcessor.from_pretrained(model_id);
        //  Fetch images from IndexedDB
        // const images = await db.images.toArray();
        // setImages(images.map((image) => URL.createObjectURL(image.file)));
      } catch (err) {
        setError(err);
      }
      setIsLoading(false);
    })();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // console.log('Setting Images');
    // setImages((prevImages) => [
    //   ...prevImages,
    //   ...acceptedFiles.map((file) => URL.createObjectURL(file)),
    // ]);
    // console.log(acceptedFiles);

    // Add images to IndexedDB
    for (const file of acceptedFiles) {
      const id = await db.images.add({ file, processedFile: "null" });
      console.log(`Added image with id ${id}`);
    }
    // Trigger image processing
    await processImages();
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".mp4"],
    },
  });

  const downloadAllImages = async () => {
    const images = await db.images.toArray();
    const zip = new JSZip();

    for (const image of images) {
      if (image.processedFile instanceof File) {
        zip.file(image.processedFile.name, image.processedFile);
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "processed_images.zip");
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', (!darkMode).toString());
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-red-200 text-red-800 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-2xl">
          <h2 className="text-4xl font-bold mb-4">ERROR</h2>
          <p className="text-xl max-w-[500px]">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 text-blue-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-800 mb-4"></div>
          <p className="text-xl">Loading background removal model...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${darkMode ? 'from-gray-800 to-gray-900 text-white' : 'from-blue-100 to-purple-100 text-gray-800'} p-4 sm:p-8 transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold mb-2 sm:mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
          Remove Background WebGPU
        </h1>

        <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center text-gray-600">
          In-browser background removal, powered by{" "}
          <a
            className="underline hover:text-blue-600 transition-colors"
            target="_blank"
            href="https://github.com/xenova/transformers.js"
          >
            🤗 Transformers.js
          </a>
        </h2>
        <div className="flex flex-wrap justify-center mb-4 sm:mb-8 gap-4 sm:gap-8">
          <a
            className="underline hover:text-blue-600 transition-colors"
            target="_blank"
            href="https://github.com/huggingface/transformers.js-examples/blob/main/LICENSE"
          >
            License (Apache 2.0)
          </a>
          <a
            className="underline hover:text-blue-600 transition-colors"
            target="_blank"
            href="https://huggingface.co/Xenova/modnet"
          >
            Model (MODNet)
          </a>
          <a
            className="underline hover:text-blue-600 transition-colors"
            target="_blank"
            href="https://github.com/huggingface/transformers.js-examples/tree/main/remove-background-webgpu/"
          >
            Code (GitHub)
          </a>
        </div>
        <div className="flex justify-center mb-4 sm:mb-8">
          <button
            onClick={downloadAllImages}
            className="bg-green-500 text-white px-4 sm:px-6 py-2 rounded-full hover:bg-green-600 transition-colors text-sm sm:text-lg font-semibold flex items-center"
          >
            <FaCloudDownloadAlt className="mr-2" />
            Download All Processed Images
          </button>
        </div>
        <div
          {...getRootProps()}
          className={`p-4 sm:p-8 mb-4 sm:mb-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300 ease-in-out hover:shadow-xl bg-white
            ${isDragAccept ? "border-green-500 bg-green-100" : ""}
            ${isDragReject ? "border-red-500 bg-red-100" : ""}
            ${isDragActive ? "border-blue-500 bg-blue-100" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}
          `}
        >
          <input {...getInputProps()} className="hidden" />
          <p className="text-lg sm:text-xl mb-2">
            {isDragActive
              ? "Drop the images here..."
              : "Drag and drop some images here"}
          </p>
          <p className="text-xs sm:text-sm text-gray-500">or click to select files</p>
        </div>
        <Images />
      </div>
    </div>
  );
}
