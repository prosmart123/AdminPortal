'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, X, Upload, Video, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AssetData {
  file?: File;
  url?: string;
  name?: string;
  type?: 'image' | 'video';
}

interface AssetUploaderProps {
  assets: AssetData[];
  onChange: (assets: AssetData[]) => void;
  maxAssets?: number;
  productName?: string;
}

export const AssetUploader = ({ assets, onChange, maxAssets = 20, productName = 'product' }: AssetUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getAssetType = (file: File): 'image' | 'video' => {
    if (file.type.startsWith('video/')) return 'video';
    return 'image';
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const remainingSlots = maxAssets - assets.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const previewUrl = URL.createObjectURL(file);
        const assetType = getAssetType(file);
        onChange([...assets, { file, url: previewUrl, name: file.name, type: assetType }]);
      } else {
        toast.error(`${file.name} is not a supported image or video file`);
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

  const removeAsset = (index: number) => {
    const asset = assets[index];
    if (asset.url && asset.url.startsWith('blob:')) {
      URL.revokeObjectURL(asset.url);
    }
    onChange(assets.filter((_, i) => i !== index));
    if (currentIndex >= assets.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const changeAsset = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        const assetType = getAssetType(file);
        const newAssets = [...assets];
        if (newAssets[index].url && newAssets[index].url!.startsWith('blob:')) {
          URL.revokeObjectURL(newAssets[index].url!);
        }
        newAssets[index] = { file, url: previewUrl, name: file.name, type: assetType };
        onChange(newAssets);
      }
    };
    input.click();
  };

  const moveAsset = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= assets.length) return;
    if (fromIndex === toIndex) return;

    const next = [...assets];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
    setCurrentIndex(toIndex);
  };

  const currentAsset = assets[currentIndex];
  const isImage = currentAsset?.type === 'image' || (!currentAsset?.type && currentAsset?.url && !currentAsset.url.match(/\.(mp4|avi|mov|wmv)$/i));
  const isVideo = currentAsset?.type === 'video' || (currentAsset?.url && currentAsset.url.match(/\.(mp4|avi|mov|wmv)$/i));

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all cursor-pointer',
          dragActive
            ? 'border-teal-500 bg-teal-50'
            : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50',
          assets.length >= maxAssets && 'opacity-50 pointer-events-none'
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
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={assets.length >= maxAssets}
        />
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-10 h-10 text-slate-400" />
          <div>
            <p className="text-slate-700 font-medium">
              {assets.length >= maxAssets ? 'Maximum assets reached' : 'Click or drag to upload images/videos'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Supports images (JPG, PNG, etc.) and videos (MP4, AVI, MOV, WMV)
            </p>
          </div>
        </div>
      </div>

      {/* Asset Preview */}
      {assets.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isImage ? <ImageIcon className="w-5 h-5 text-teal-600" /> : <Video className="w-5 h-5 text-teal-600" />}
              <span className="text-sm font-medium text-slate-700">
                Asset {currentIndex + 1} of {assets.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className={cn(
                  'p-2 rounded-lg border transition-colors',
                  currentIndex === 0
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                )}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(assets.length - 1, prev + 1))}
                disabled={currentIndex === assets.length - 1}
                className={cn(
                  'p-2 rounded-lg border transition-colors',
                  currentIndex === assets.length - 1
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                )}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => changeAsset(currentIndex)}
                className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Replace asset"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => removeAsset(currentIndex)}
                className="p-2 rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50 transition-colors"
                title="Remove asset"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="relative w-full bg-slate-100 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {isImage && currentAsset?.url && (
              <img
                src={currentAsset.url}
                alt={currentAsset.name || `Asset ${currentIndex + 1}`}
                className="w-full h-full object-contain"
              />
            )}
            {isVideo && currentAsset?.url && (
              <video
                src={currentAsset.url}
                controls
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Asset Name */}
          {currentAsset?.name && (
            <p className="text-xs text-slate-500 mt-2 text-center truncate">
              {currentAsset.name}
            </p>
          )}
        </div>
      )}

      {/* Thumbnail Grid */}
      {assets.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {assets.map((asset, index) => {
            const isImg = asset.type === 'image' || (!asset.type && asset.url && !asset.url.match(/\.(mp4|avi|mov|wmv)$/i));
            return (
              <div key={index} className="flex flex-col gap-2">
                {/* Thumbnail with number badge */}
                <button
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    currentIndex === index
                      ? 'border-teal-500 ring-2 ring-teal-200'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  {/* Number Badge */}
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">{index + 1}</span>
                  </div>

                  {isImg && asset.url ? (
                    <img
                      src={asset.url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : asset.url ? (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  {currentIndex === index && (
                    <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                      <div className="w-3 h-3 bg-teal-500 rounded-full" />
                    </div>
                  )}
                </button>

                {/* Reorder Arrows */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveAsset(index, index - 1);
                    }}
                    disabled={index === 0}
                    className={cn(
                      'p-1.5 rounded-lg border transition-all',
                      index === 0
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                        : 'border-slate-300 text-slate-600 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-600'
                    )}
                    title="Move left"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveAsset(index, index + 1);
                    }}
                    disabled={index === assets.length - 1}
                    className={cn(
                      'p-1.5 rounded-lg border transition-all',
                      index === assets.length - 1
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                        : 'border-slate-300 text-slate-600 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-600'
                    )}
                    title="Move right"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

