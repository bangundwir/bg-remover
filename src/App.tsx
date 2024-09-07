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

export default function App() {
  const [images, setImages] = useState([]);

  const [processedImages, setProcessedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadReady, setIsDownloadReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const modelRef = useRef(null);
  const processorRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        if (!navigator.gpu) {
          throw new Error("WebGPU is not supported in this browser.");
        }
        const model_id = "Xenova/modnet";
        env.backends.onnx.wasm.proxy = false;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 text-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Remove Background WebGPU
        </h1>

        <h2 className="text-xl font-semibold mb-6 text-center text-gray-600">
          In-browser background removal, powered by{" "}
          <a
            className="underline hover:text-blue-600 transition-colors"
            target="_blank"
            href="https://github.com/xenova/transformers.js"
          >
            🤗 Transformers.js
          </a>
        </h2>
        <div className="flex justify-center mb-8 gap-8">
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
        <div
          {...getRootProps()}
          className={`p-8 mb-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-300 ease-in-out hover:shadow-xl bg-white
            ${isDragAccept ? "border-green-500 bg-green-100" : ""}
            ${isDragReject ? "border-red-500 bg-red-100" : ""}
            ${isDragActive ? "border-blue-500 bg-blue-100" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}
          `}
        >
          <input {...getInputProps()} className="hidden" />
          <p className="text-xl mb-2">
            {isDragActive
              ? "Drop the images here..."
              : "Drag and drop some images here"}
          </p>
          <p className="text-sm text-gray-500">or click to select files</p>
        </div>
        <Images />
      </div>
    </div>
  );
}
