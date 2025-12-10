import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Map as MapIcon } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  subLabel: string;
  icon: 'street' | 'map';
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, subLabel, icon, onFileSelect, selectedFile }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Preview is handled by useEffect
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div 
      className={`relative group border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer h-96 w-full flex flex-col items-center justify-center
      ${selectedFile ? 'border-brand-accent bg-brand-panel/50' : 'border-brand-surface hover:border-brand-accent hover:bg-brand-panel'}`}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />

      {preview ? (
        <>
          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-60 group-hover:opacity-40 transition-opacity" />
          <div className="z-10 bg-brand-panel p-2 rounded-lg backdrop-blur-sm border border-brand-surface/50 shadow-sm">
            <span className="text-brand-text font-medium text-sm flex items-center gap-2">
              {icon === 'street' ? <ImageIcon size={16} className="text-brand-accent"/> : <MapIcon size={16} className="text-brand-accent"/>}
              {selectedFile?.name}
            </span>
          </div>
          <button 
            onClick={clearFile}
            className="absolute top-2 right-2 p-1.5 bg-brand-dark hover:bg-brand-surface text-brand-text rounded-full z-20 transition-colors shadow-lg border border-brand-surface"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <div className="text-center space-y-4 z-10">
          <div className="w-16 h-16 rounded-full bg-brand-dark flex items-center justify-center mx-auto text-brand-accent shadow-lg shadow-black/20 border border-brand-surface">
            {icon === 'street' ? <ImageIcon size={32}/> : <MapIcon size={32}/>}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brand-text">{label}</h3>
            <p className="text-sm text-brand-muted">{subLabel}</p>
          </div>
          <div className="text-sm text-brand-dark bg-brand-accent hover:bg-brand-accent-hover py-2 px-4 rounded-full inline-block shadow-sm transition-colors font-bold transform group-hover:scale-105 duration-200">
            Click to upload
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;