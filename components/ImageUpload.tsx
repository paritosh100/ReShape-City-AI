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
      className={`relative group border-2 rounded-xl p-6 transition-all duration-300 cursor-pointer h-80 w-full flex flex-col items-center justify-center overflow-hidden
      ${selectedFile ? 'border-solid border-brand-accent bg-brand-panel/50' : 'border-dashed border-brand-surface hover:border-brand-accent hover:bg-brand-panel'}`}
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
          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
          <div className="z-10 bg-brand-panel/90 backdrop-blur-md p-2.5 rounded-lg border border-brand-surface/50 shadow-lg transform transition-transform group-hover:scale-105">
            <span className="text-brand-text font-semibold text-sm flex items-center gap-2">
              {icon === 'street' ? <ImageIcon size={16} className="text-brand-accent"/> : <MapIcon size={16} className="text-brand-accent"/>}
              <span className="truncate max-w-[150px]">{selectedFile?.name}</span>
            </span>
          </div>
          <button 
            onClick={clearFile}
            className="absolute top-3 right-3 p-2 bg-brand-dark hover:bg-brand-surface text-brand-text rounded-full z-20 transition-colors shadow-lg border border-brand-surface"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <div className="text-center space-y-4 z-10 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-brand-dark flex items-center justify-center mx-auto text-brand-accent shadow-lg shadow-black/20 border border-brand-surface group-hover:scale-110 transition-transform duration-300">
            {icon === 'street' ? <ImageIcon size={32}/> : <MapIcon size={32}/>}
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-text">{label}</h3>
            <p className="text-sm text-brand-muted">{subLabel}</p>
          </div>
          <div className="text-sm text-brand-dark bg-brand-accent group-hover:bg-brand-accent-hover py-2 px-4 rounded-full inline-block shadow-sm transition-colors font-bold">
            Click to upload
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;