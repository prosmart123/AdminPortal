'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, X, Upload, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadImageFromUrl, sanitizeFilename } from '@/lib/image-download';
import toast from 'react-hot-toast';

interface ImageData {
  file?: File; // New images to upload
  url?: string; // Existing Cloudinary URLs
  name?: string; // Image name for tracking
}

interface ImageUploaderProps {
  images: ImageData[];
  onChange: (images: ImageData[]) => void;
  maxImages?: number;
  productName?: string;
  isEditing?: boolean; // Whether we're editing an existing product
}

export const ImageUploader = ({ images, onChange, maxImages = 10, productName = 'product' }: ImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const sanitizedName = sanitizeFilename(productName);
      const filename = `${sanitizedName}_image_${index + 1}`;
      await downloadImageFromUrl(imageUrl, filename);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    if (fromIndex === toIndex) return;

    const next = [...images];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = maxImages - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (file.type.startsWith('image/')) {
        // Create a preview URL using object URL instead of base64
        const previewUrl = URL.createObjectURL(file);
        onChange([...images, { file, url: previewUrl, name: file.name }]);
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const changeImage = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Create a preview URL instead of base64
        const previewUrl = URL.createObjectURL(file);
        const newImages = [...images];
        newImages[index] = { file, url: previewUrl, name: file.name };
        onChange(newImages);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all cursor-pointer',
          dragActive 
            ? 'border-teal-500 bg-teal-50' 
            : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50',
          images.length >= maxImages && 'opacity-50 pointer-events-none'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={images.length >= maxImages}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white border-2 border-teal-500 flex items-center justify-center">
            <Upload className="w-7 h-7 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              Drop images here or <span className="text-teal-600">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PNG, JPG up to 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-medium">
          i
        </div>
        <span>
          Add at least 1 image ({images.length}/{maxImages})
        </span>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((imageData, index) => (
            <div key={index} className="space-y-2">
              <div className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                  <img
                    src={imageData.url || ''}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Index badge */}
                <div className="absolute top-2 left-2 h-6 px-2 rounded-full bg-black/70 text-white text-xs font-semibold flex items-center">
                  {index + 1}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-rose-500 text-rose-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Change button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeImage(index);
                  }}
                  className="absolute bottom-2 left-2 right-2 text-xs text-slate-700 font-medium bg-white border-2 border-slate-300 px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-center"
                >
                  Change
                </button>
              </div>

              {/* Action buttons below image */}
              <div className="flex gap-1">
                {/* Move Left */}
                <button
                  type="button"
                  onClick={() => moveImage(index, index - 1)}
                  disabled={index === 0}
                  className={cn(
                    'flex-1 h-7 bg-white border border-slate-300 text-slate-700 rounded text-xs flex items-center justify-center',
                    'hover:bg-slate-50 transition-colors',
                    index === 0 && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Move left"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                
                {/* Move Right */}
                <button
                  type="button"
                  onClick={() => moveImage(index, index + 1)}
                  disabled={index === images.length - 1}
                  className={cn(
                    'flex-1 h-7 bg-white border border-slate-300 text-slate-700 rounded text-xs flex items-center justify-center',
                    'hover:bg-slate-50 transition-colors',
                    index === images.length - 1 && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Move right"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Download link below image - simple text */}
              <button
                type="button"
                onClick={() => {
                  if (imageData.url && imageData.url.startsWith('http')) {
                    downloadImage(imageData.url, index);
                  }
                }}
                className={cn(
                  'w-full text-xs text-center py-1 transition-colors',
                  imageData.url && imageData.url.startsWith('http')
                    ? 'text-teal-600 hover:text-teal-700 underline cursor-pointer'
                    : 'text-slate-400 cursor-not-allowed'
                )}
                title={`Download ${productName} Image ${index + 1}`}
                disabled={!imageData.url || !imageData.url.startsWith('http')}
              >
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
