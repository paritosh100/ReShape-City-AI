import React, { useRef, useState } from 'react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
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
      className={`relative group border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer h-64 flex flex-col items-center justify-center
      ${selectedFile ? 'border-blue-500 bg-slate-900/50' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'}`}
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
          <div className="z-10 bg-black/60 p-2 rounded-lg backdrop-blur-sm">
            <span className="text-white font-medium text-sm flex items-center gap-2">
              {icon === 'street' ? <ImageIcon size={16}/> : <MapIcon size={16}/>}
              {selectedFile?.name}
            </span>
          </div>
          <button 
            onClick={clearFile}
            className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full z-20 transition-colors"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <div className="text-center space-y-3 z-10">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-blue-400">
            {icon === 'street' ? <ImageIcon size={24}/> : <MapIcon size={24}/>}
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">{label}</h3>
            <p className="text-sm text-slate-500">{subLabel}</p>
          </div>
          <div className="text-xs text-slate-600 bg-slate-900 py-1 px-3 rounded-full inline-block">
            Click to upload
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;