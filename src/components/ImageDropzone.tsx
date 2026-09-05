import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, X, Image as ImageIcon, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface SelectedImageFile {
  id: string;
  file: File;
  previewUrl: string;
  sizeFormatted: string;
}

interface ImageDropzoneProps {
  files: SelectedImageFile[];
  onChange: (files: SelectedImageFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  isCloudinaryConfigured?: boolean;
  label?: string;
  helperText?: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  files,
  onChange,
  maxFiles = 5,
  maxSizeMB = 5,
  disabled = false,
  isCloudinaryConfigured = true,
  label = 'Attach Photos / Evidence',
  helperText = 'Upload up to 5 clear photos (JPEG, PNG, or WebP, max 5 MB each).',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateAndAddFiles = (incomingFiles: FileList | File[]) => {
    setValidationError(null);

    if (!isCloudinaryConfigured) {
      setValidationError('Image uploads are unavailable because Cloudinary is not configured on the server.');
      return;
    }

    const currentCount = files.length;
    const remainingSlots = maxFiles - currentCount;

    if (remainingSlots <= 0) {
      setValidationError(`Maximum limit reached: You can attach at most ${maxFiles} images.`);
      return;
    }

    const newSelected: SelectedImageFile[] = [];
    const filesArray = Array.from(incomingFiles);

    if (filesArray.length > remainingSlots) {
      setValidationError(
        `Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} can be added. The extra ${filesArray.length - remainingSlots} file${filesArray.length - remainingSlots > 1 ? 's were' : ' was'} ignored.`
      );
    }

    const toProcess = filesArray.slice(0, remainingSlots);

    for (const file of toProcess) {
      // Validate file type
      const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
      const lowerName = file.name.toLowerCase();
      const isExtValid = ALLOWED_EXTS.some((ext) => lowerName.endsWith(ext));

      if (!isMimeValid || !isExtValid) {
        setValidationError(
          `"${file.name}" was rejected. Only real JPEG, PNG, and WebP image formats are supported.`
        );
        continue;
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setValidationError(
          `"${file.name}" exceeds the ${maxSizeMB} MB size limit (${formatFileSize(file.size)}).`
        );
        continue;
      }

      // Check duplicates
      const isDuplicate = files.some(
        (f) => f.file.name === file.name && f.file.size === file.size
      );
      if (isDuplicate) {
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newSelected.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl,
        sizeFormatted: formatFileSize(file.size),
      });
    }

    if (newSelected.length > 0) {
      onChange([...files, ...newSelected]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && isCloudinaryConfigured) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || !isCloudinaryConfigured) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    // reset input so the same file can be picked again if deleted
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (idToRemove: string) => {
    const target = files.find((f) => f.id === idToRemove);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChange(files.filter((f) => f.id !== idToRemove));
    setValidationError(null);
  };

  const openPicker = () => {
    if (!disabled && isCloudinaryConfigured && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3" id="image-dropzone-container">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          {label}
          <span className="text-xs font-normal text-slate-500">
            ({files.length}/{maxFiles})
          </span>
        </label>
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => {
              files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
              onChange([]);
              setValidationError(null);
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
          >
            Clear all ({files.length})
          </button>
        )}
      </div>

      {/* Cloudinary Unconfigured Fallback Notice */}
      {!isCloudinaryConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 mb-1">
              Cloudinary Storage Not Configured
            </p>
            <p className="text-amber-700">
              Cloudinary environment variables (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">CLOUDINARY_CLOUD_NAME</code>, <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">CLOUDINARY_API_KEY</code>, <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">CLOUDINARY_API_SECRET</code>) are not set. Complaints and resolution notes can be submitted in text-only mode without image attachments.
            </p>
          </div>
        </div>
      )}

      {/* Validation Message */}
      {validationError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openPicker}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer select-none ${
          !isCloudinaryConfigured || disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-75'
            : isDragOver
            ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
            : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          disabled={disabled || !isCloudinaryConfigured || files.length >= maxFiles}
          onChange={handleFileSelect}
          className="hidden"
          id="image-file-input"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              !isCloudinaryConfigured
                ? 'bg-slate-200 text-slate-500'
                : isDragOver
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-100 text-indigo-600'
            } transition-colors`}
          >
            <UploadCloud className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-800">
              {files.length >= maxFiles
                ? 'Maximum 5 photos attached'
                : isCloudinaryConfigured
                ? 'Drop photos here or click to browse'
                : 'Photo upload disabled (Cloudinary unconfigured)'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {helperText}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files Preview Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          {files.map((item, index) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 shadow-sm aspect-square flex flex-col justify-end"
            >
              <img
                src={item.previewUrl}
                alt={`Selected preview ${index + 1}`}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(item.id);
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Photo badge / size */}
              <div className="relative p-2 text-white">
                <p className="text-[11px] font-medium truncate drop-shadow-sm">
                  {item.file.name}
                </p>
                <p className="text-[10px] text-slate-300 font-mono">
                  {item.sizeFormatted}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
