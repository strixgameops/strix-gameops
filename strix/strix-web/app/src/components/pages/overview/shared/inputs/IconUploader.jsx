import React, { useRef } from 'react';
import { Button, Typography, Tooltip } from '@mui/material';
import { EditSharp as EditSharpIcon } from '@mui/icons-material';
import imageCompression from 'browser-image-compression';

const IconUploader = ({ 
  icon, 
  onIconChange, 
  disabled = false, 
  label = "Add icon" 
}) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const compressed = await compressImage(e.target.result);
        onIconChange(compressed);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  const compressImage = async (base64Image) => {
    const byteCharacters = atob(base64Image.split(",")[1]);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = Array.from(slice, (char) => char.charCodeAt(0));
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    
    const blob = new Blob(byteArrays, { type: "image/png" });
    const compressedBlob = await imageCompression(blob, { maxWidthOrHeight: 250 });
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedBlob);
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
    });
  };

  const iconContainerStyle = {
    position: 'relative',
    width: '120px',
    height: '120px',
    border: '2px dashed #ccc',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'default' : 'pointer',
    overflow: 'hidden',
    '&:hover .icon-overlay': {
      opacity: disabled ? 0 : 1,
    }
  };

  const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  };

  return (
    <Tooltip title={disabled ? "" : "Upload icon"} placement="top">
      <Button
        sx={iconContainerStyle}
        variant="outlined"
        onClick={handleFileUpload}
        disabled={disabled}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept=".png,.jpg,.jpeg"
        />
        
        {!icon && (
          <Typography color="textSecondary">
            {label}
          </Typography>
        )}
        
        {icon && (
          <img
            src={icon}
            alt="Icon preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}
        
        <div className="icon-overlay" sx={overlayStyle}>
          <EditSharpIcon sx={{ color: 'white', fontSize: 32 }} />
        </div>
      </Button>
    </Tooltip>
  );
};

export default IconUploader;